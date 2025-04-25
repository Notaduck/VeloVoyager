package rpcserver

import (
	"context"
	"log"
	"net/http"

	"github.com/nedpals/supabase-go"
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/notaduck/backend/gen/activity/v1/activityv1connect"
	"github.com/notaduck/backend/internal/config"
	handlers "github.com/notaduck/backend/internal/rpc/activity"
	"github.com/notaduck/backend/internal/rpc/middleware"
	service "github.com/notaduck/backend/internal/services"
)

type RPCServe2 struct {
	activityHandler  *handlers.ActivityHandler
	config           *config.Config
	supabaseClient   *supabase.Client
	registeredRoutes []string
	newRelic         *newrelic.Application
}

func NewServerServer(cfg *config.Config, activityService service.ActivityService, newRelic *newrelic.Application) *RPCServe2 {

	activityHandler := handlers.NewActivityHandler(activityService)
	sc := supabase.CreateClient(cfg.SupabaseUrl, cfg.SupabaseKey)

	return &RPCServe2{
		activityHandler:  activityHandler,
		config:           cfg,
		supabaseClient:   sc,
		registeredRoutes: []string{},
		newRelic:         newRelic,
	}
}

func (s *RPCServe2) Handle(mux *http.ServeMux, path string, handler http.Handler) {
	mux.Handle(path, handler)
	s.registeredRoutes = append(s.registeredRoutes, path)
}

func (s *RPCServe2) Routes() http.Handler {
	mux := http.NewServeMux()

	// Create the AuthMiddleware with supabase client
	authMiddleware := middleware.AuthMiddleware(s.supabaseClient)
	newRelicMiddleware := middleware.NewRelicMiddleware(s.newRelic)

	// Register ActivityService with AuthMiddleware and LoggingMiddleware
	path, handler := activityv1connect.NewActivityServiceHandler(s.activityHandler)
	chainedHandler := middleware.Chain(handler, newRelicMiddleware, authMiddleware, middleware.LoggingMiddleware)

	// Use New Relic's WrapHandleFunc for instrumentation
	wrappedPath, wrappedHandler := newrelic.WrapHandleFunc(s.newRelic, path, chainedHandler.ServeHTTP)
	mux.Handle(wrappedPath, http.HandlerFunc(wrappedHandler))

	// Configure CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:8081"}, // Update to specific origins
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
		Debug:            false, // Set to false in production
	})

	// Wrap the entire mux with the CORS middleware.
	return c.Handler(mux)
}

func (s *RPCServe2) Start(ctx context.Context) error {

	handler := h2c.NewHandler(s.Routes(), &http2.Server{})

	server := &http.Server{
		Addr:    "127.0.0.1:8080",
		Handler: handler,
	}

	log.Printf("Server is running on %s", server.Addr)

	log.Println("Registered routes:")
	for _, route := range s.registeredRoutes {
		log.Printf(" - %s\n", route)
	}

	// Start the server
	log.Println("Listen and serve")
	return server.ListenAndServe()
}
