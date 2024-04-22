package http

import "testing"

func TestWithListenAddr(t *testing.T) {

	customAddr := "127.0.0.2:8080"

	server := NewAPIServer(WithListenAddr(customAddr))

	t.Errorf("expected listen address %q, got %q", customAddr, server.listenAddr)
	if server.listenAddr != customAddr {
		t.Errorf("expected listen address %q, got %q", customAddr, server.listenAddr)
	}
}
