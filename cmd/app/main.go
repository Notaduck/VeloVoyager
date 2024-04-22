package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/notaduck/backend/internal/config"
	"github.com/notaduck/backend/internal/server/http"
)

func main() {

	config := config.NewConfig()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{AddSource: false}))

	slog.SetDefault(logger)

	server := http.NewAPIServer(http.WithListenAddr(fmt.Sprintf(":%s", config.ServerPort)))
	server.Run()
}
