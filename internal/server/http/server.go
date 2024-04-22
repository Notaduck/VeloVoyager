package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notaduck/backend/internal/config"
	service "github.com/notaduck/backend/internal/services"
	"github.com/notaduck/backend/internal/storage"
)

const (
	UserFromContext    = iota
	TraceIdFromContext = iota
)

type APIServer struct {
	listenAddr      string
	storage         *storage.Queries
	activityService *service.ActivityServiceImp
	config          *config.Config
}

func NewAPIServer(options ...func(*APIServer)) *APIServer {

	server := &APIServer{
		listenAddr: "127.0.0.1:3000",
		// storage:         queries,
		// activityService: service.NewActivityService(queries),
	}

	for _, option := range options {
		option(server)
	}

	if server.config == nil {

		cfg := config.NewConfig()
		server.config = cfg

	}

	if server.storage == nil {
		ctx := context.Background()

		db, err := pgxpool.New(ctx, server.config.DbConnectionString)

		if err != nil {
			panic(fmt.Sprint("failed to connect to database: %w", err))
		}

		queries := storage.New(db)

		server.storage = queries

	}

	return server
}

func WithConfig(config *config.Config) func(*APIServer) {
	return func(s *APIServer) {
		s.config = config
	}
}

func WithDbQueries(q *storage.Queries) func(*APIServer) {
	return func(s *APIServer) {
		s.storage = q
	}
}

func WithListenAddr(addr string) func(*APIServer) {
	return func(s *APIServer) {
		s.listenAddr = addr
	}
}

func (s *APIServer) Run() {

	slog.Info("staring http server\n")
	router := http.NewServeMux()

	publicChain := []middleware{
		LoggingMiddleware,
	}

	protectedChain := []middleware{
		AuthMiddleware(s),
		LoggingMiddleware,
	}

	router.HandleFunc("GET /activity", buildChain(makeHTTPHandleFunc(s.handleGetActivity), protectedChain...))
	router.HandleFunc("POST /activity", buildChain(makeHTTPHandleFunc(s.handlePostActivity), protectedChain...))

	router.HandleFunc("/register", buildChain(makeHTTPHandleFunc(s.handleRegistration), publicChain...))
	router.HandleFunc("/login", buildChain(makeHTTPHandleFunc(s.handleLogin), publicChain...))

	slog.Info("api is listening on", "port", s.listenAddr)
	http.ListenAndServe(s.listenAddr, router)
}

func (s *APIServer) testRoute(w http.ResponseWriter, r *http.Request) error {
	fmt.Print(r)
	return WriteJSON(w, http.StatusOK, "Hello, World!")
}

type apiFunc func(http.ResponseWriter, *http.Request) error

type ApiError struct {
	Error string `json:"error"`
}

func makeHTTPHandleFunc(f apiFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

// WriteHeader captures the status code and calls the original WriteHeader method.
func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// buildChain builds the middlware chain recursively, functions are first class
func buildChain(f http.HandlerFunc, m ...middleware) http.HandlerFunc {
	// if our chain is done, use the original handlerfunc
	if len(m) == 0 {
		return f
	}
	// otherwise nest the handlerfuncs
	return m[0](buildChain(f, m[1:cap(m)]...))
}

func WriteJSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(status)

	return json.NewEncoder(w).Encode(v)
}
