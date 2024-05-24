package http

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
)

func logRequest(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Generate a unique ID for the request.
		requestID := uuid.New().String()

		// Log the incoming request along with its unique ID.
		slog.Info("Incoming request", "method", r.Method, "uri", r.RequestURI, "id", requestID)

		// Store the request ID in the context of the request.
		ctx := context.WithValue(r.Context(), "requestID", requestID)
		r = r.WithContext(ctx)

		// Call the next handler.
		next.ServeHTTP(w, r)
	}
}
