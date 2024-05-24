package http

// import (

// 	"testing"

// 	"github.com/notaduck/backend/internal/config"
// )

// func TestWithListenAddr(t *testing.T) {

// 	customAddr := "127.0.0.2:8080"

// 	config := &config.Config{
// 		DbConnectionString: "",
// 	}

// 	server := NewAPIServer(WithListenAddr(customAddr), WithConfig(config))

// 	if server.listenAddr != customAddr {
// 		t.Errorf("expected listen address %q, got %q", customAddr, server.listenAddr)
// 	}
// }
