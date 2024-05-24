package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strings"

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
		LoggingMiddleware,
	}

	protectedChain := []middleware{
		AuthMiddleware(s),
		LoggingMiddleware,
	}

	// router.Handle("/activity", buildChain(makeHTTPHandleFunc(s.handleGetActivity), protectedChain...))
	router.Handle("/activities", buildChain(makeHTTPHandleFunc(s.handleGetActivities), protectedChain...))
	router.Handle("/activity", buildChain(makeHTTPHandleFunc(s.handlePostActivity), protectedChain...))

	router.Handle("/weather", buildChain(makeHTTPHandleFunc(s.handlePOSTWeather), publicChain...))

	router.Handle("/register", buildChain(makeHTTPHandleFunc(s.handleRegistration), publicChain...))
	router.Handle("/login", buildChain(makeHTTPHandleFunc(s.handleLogin), publicChain...))

	// Handle OPTIONS requests for all routes
	router.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			handleOptions(w, r)
		} else {
			http.NotFound(w, r)
		}
	}))

	slog.Info("api is listening on", "port", s.listenAddr)
	err := http.ListenAndServe(s.listenAddr, checkCORS(router))
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
			handleOptions(w, r)
			return
		}
		if err := f(w, r); err != nil {
			WriteJSON(w, http.StatusBadRequest, ApiError{Error: err.Error()})
		}
	}
}

type middleware func(http.HandlerFunc) http.HandlerFunc

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func buildChain(f http.HandlerFunc, m ...middleware) http.HandlerFunc {
	if len(m) == 0 {
		return f
	}
	return m[0](buildChain(f, m[1:cap(m)]...))
}

func WriteJSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}

var methodAllowlist = []string{"GET", "POST", "DELETE", "OPTIONS"}

func isPreflight(r *http.Request) bool {
	return r.Method == "OPTIONS" &&
		r.Header.Get("Origin") != "" &&
		r.Header.Get("Access-Control-Request-Method") != ""
}

var originAllowlist = []string{
	"http://127.0.0.1:5173",
	"http://localhost:5173",
}

func handleOptions(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if slices.Contains(originAllowlist, origin) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", strings.Join(methodAllowlist, ", "))
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, x-jwt-token")
		w.WriteHeader(http.StatusOK)
	}
}

func checkCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if slices.Contains(originAllowlist, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", strings.Join(methodAllowlist, ", "))
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, x-jwt-token")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
