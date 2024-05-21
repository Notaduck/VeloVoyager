package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notaduck/backend/internal/config"
	"github.com/notaduck/backend/internal/db"
	"github.com/notaduck/backend/internal/repositories"
	service "github.com/notaduck/backend/internal/services"
)

const (
	UserFromContext    = iota
	TraceIdFromContext = iota
)

type APIServer struct {
	listenAddr      string
	queries         *db.Queries
	activityService service.ActivityService
	config          *config.Config
}

func NewAPIServer(options ...func(*APIServer)) *APIServer {
	server := &APIServer{
		listenAddr: "127.0.0.1:3000",
	}

	for _, option := range options {
		option(server)
	}

	if server.config == nil {
		cfg := config.NewConfig()
		server.config = cfg
		slog.Info("Config initialized", "config", server.config)
	}

	if server.queries == nil {
		ctx := context.Background()

		pool, err := pgxpool.New(ctx, server.config.DbConnectionString)
		if err != nil {
			panic(fmt.Sprintf("failed to connect to database: %v", err))
		}

		if err := pool.Ping(ctx); err != nil {
			panic("could not ping the database")
		}

		server.queries = db.New(pool)
	}

	activityRepo := repositories.NewActivityRepository(server.queries)
	recordRepo := repositories.NewRecordRepository(server.queries)
	activityService := service.NewActivityService(activityRepo, recordRepo)
	server.activityService = activityService

	return server
}

func WithConfig(config *config.Config) func(*APIServer) {
	return func(s *APIServer) {
		s.config = config
	}
}

func WithDbQueries(q *db.Queries) func(*APIServer) {
	return func(s *APIServer) {
		s.queries = q
	}
}

func WithListenAddr(addr string) func(*APIServer) {
	return func(s *APIServer) {
		s.listenAddr = addr
	}
}

func (s *APIServer) Run() {
	slog.Info("starting http server")
	router := http.NewServeMux()

	publicChain := []middleware{
		CORSMiddleware,
		LoggingMiddleware,
	}

	protectedChain := []middleware{
		CORSMiddleware,
		AuthMiddleware(s),
		LoggingMiddleware,
	}

	router.HandleFunc("/activity", buildChain(makeHTTPHandleFunc(s.handleGetActivity), protectedChain...))
	router.HandleFunc("/activities", buildChain(makeHTTPHandleFunc(s.handleGetActivities), protectedChain...))
	router.HandleFunc("/activity", buildChain(makeHTTPHandleFunc(s.handlePostActivity), protectedChain...))

	router.HandleFunc("/weather", buildChain(makeHTTPHandleFunc(s.handlePOSTWeather), publicChain...))

	router.HandleFunc("/register", buildChain(makeHTTPHandleFunc(s.handleRegistration), publicChain...))
	router.HandleFunc("/login", buildChain(makeHTTPHandleFunc(s.handleLogin), publicChain...))

	slog.Info("api is listening on", "port", s.listenAddr)
	err := http.ListenAndServe(s.listenAddr, router)
	if err != nil {
		panic(err)
	}
}

func (s *APIServer) handlePOSTWeather(w http.ResponseWriter, r *http.Request) error {
	ws := service.NewWeatherService()
	weather, err := ws.GetWeather()
	if err != nil {
		return err
	}
	return WriteJSON(w, http.StatusOK, weather)
}

type apiFunc func(http.ResponseWriter, *http.Request) error

type ApiError struct {
	Error string `json:"error"`
}

func makeHTTPHandleFunc(f apiFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			enableCORS(&w)
			w.WriteHeader(http.StatusOK)
			return
		}
		if err := f(w, r); err != nil {
			WriteJSON(w, http.StatusBadRequest, ApiError{Error: err.Error()})
		}
	}
}

type middleware func(http.HandlerFunc) http.HandlerFunc

// responseWriter is a custom http.ResponseWriter that captures the status code and optionally the response body.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

// newResponseWriter creates a new responseWriter instance.
func newResponseWriter(w http.ResponseWriter) *responseWriter {
	// Default the status code to 200, as if WriteHeader is not called explicitly, the status code is 200.
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

// buildChain builds the middleware chain recursively, functions are first class
func buildChain(f http.HandlerFunc, m ...middleware) http.HandlerFunc {
	// if our chain is done, use the original handlerfunc
	if len(m) == 0 {
		return f
	}
	// otherwise nest the handlerfuncs
	return m[0](buildChain(f, m[1:cap(m)]...))
}

func WriteJSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func CORSMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCORS(&w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

type User struct {
	ID int
}
