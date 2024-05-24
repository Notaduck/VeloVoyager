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

	logger := slog.New(tint.NewHandler(w, nil))

	slog.SetDefault(slog.New(
		tint.NewHandler(w, &tint.Options{
			Level:      slog.LevelDebug,
			TimeFormat: time.Kitchen,
			AddSource:  true,
		}),
	))

	slog.SetDefault(logger)

	server := http.NewAPIServer(http.WithListenAddr(fmt.Sprintf("%s", config.ServerPort)))
	server.Run()
}
