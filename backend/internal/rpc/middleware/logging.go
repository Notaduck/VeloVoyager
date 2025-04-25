package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
)

const (
	UserFromContext    = iota
	TraceIdFromContext = iota
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// LoggingMiddleware logs requests and responses, including status codes and duration.
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Generate a unique ID for the request.
		traceID := uuid.NewString()

		// Store the trace ID in the context.
		ctx := context.WithValue(r.Context(), TraceIdFromContext, traceID)
		r = r.WithContext(ctx)

		// Wrap the ResponseWriter to capture the status code.
		rw := newResponseWriter(w)

		// Log request details.
		slog.Info("Request received",
			slog.String("method", r.Method),
			slog.String("uri", r.RequestURI),
			slog.String("trace_id", traceID),
		)

		// Call the next handler.
		next.ServeHTTP(rw, r)

		// Log response details.
		duration := time.Since(start)
		slog.Info("Response sent",
			slog.String("method", r.Method),
			slog.String("uri", r.RequestURI),
			slog.Int("status", rw.statusCode),
			slog.Duration("duration", duration),
			slog.String("trace_id", traceID),
		)
	})
}
