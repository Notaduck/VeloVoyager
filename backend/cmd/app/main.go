package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lmittmann/tint"
	nrslog "github.com/newrelic/go-agent/v3/integrations/nrslog"
	"github.com/newrelic/go-agent/v3/newrelic"

	"github.com/notaduck/backend/internal/config"
	"github.com/notaduck/backend/internal/db"
	"github.com/notaduck/backend/internal/repositories"
	rpcserver "github.com/notaduck/backend/internal/rpc/server"
	service "github.com/notaduck/backend/internal/services"
)

func main() {
	config := config.NewConfig()

	w := os.Stderr

	w.Chmod()

	// Create a tint handler for pretty logging
	tintHandler := tint.NewHandler(w, &tint.Options{
		Level:      slog.LevelDebug,
		TimeFormat: time.Kitchen,
		AddSource:  true,
	})

	// Create a slog logger for tint
	tintLogger := slog.New(tintHandler)

	// Initialize New Relic application with slog logger integration
	newRelicApp, err := newrelic.NewApplication(
		newrelic.ConfigAppName(config.NewRelicAppName),
		newrelic.ConfigLicense(config.NewRelicLicense),
		newrelic.ConfigAppLogForwardingEnabled(true),
		newrelic.ConfigAppLogEnabled(true),
		nrslog.ConfigLogger(tintLogger), // Configure New Relic to use slog
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize New Relic application: %v\n", err)
		os.Exit(1)
	}

	// Set the combined logger (tint + New Relic) as default
	slog.SetDefault(tintLogger)

	ctx := context.Background()

	// Set up database connection pool
	pool, err := pgxpool.New(ctx, config.DbConnectionString)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}

	if err := pool.Ping(ctx); err != nil {
		slog.Error("Could not ping the database", "error", err)
		os.Exit(1)
	}

	db := db.New(pool)

	// Initialize repositories and services
	activityRepo := repositories.NewActivityRepository(db)
	recordRepo := repositories.NewRecordRepository(db)
	activityService := service.NewActivityService(activityRepo, recordRepo)

	// Initialize RPC server
	server := rpcserver.NewServer(config, activityService, newRelicApp)

	// Start the server
	slog.Info("Starting RPC server...")
	server.Start(ctx)
}
