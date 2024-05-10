package main

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/lmittmann/tint"
	"github.com/notaduck/backend/internal/config"
	"github.com/notaduck/backend/internal/server/http"
)

func main() {

	config := config.NewConfig()

	w := os.Stderr

	// create a new logger
	logger := slog.New(tint.NewHandler(w, nil))

	// set global logger with custom options
	slog.SetDefault(slog.New(
		tint.NewHandler(w, &tint.Options{
			Level:      slog.LevelDebug,
			TimeFormat: time.Kitchen,
			AddSource:  true,
		}),
	))
	// logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{AddSource: false}))

	slog.SetDefault(logger)

	server := http.NewAPIServer(http.WithListenAddr(fmt.Sprintf("%s", config.ServerPort)))
	server.Run()
}
