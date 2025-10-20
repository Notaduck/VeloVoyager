package http

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/nedpals/supabase-go"
)

// LoggingMiddleware logs the request, response status code, and the duration it took to serve the request.
func LoggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Generate a unique ID for the request.
		traceID := uuid.New().String()

		// Store the request ID in the context of the request.
		ctx := context.WithValue(r.Context(), TraceIdFromContext, traceID)
		r = r.WithContext(ctx)

		var userCtx = ctx.Value(UserFromContext)

		if userCtx != nil {
			// Log the incoming request along with its unique ID.
			user, ok := userCtx.(*supabase.User)
			if ok {
				slog.Info("request",
					slog.String("method", r.Method),
					slog.String("uri", r.RequestURI),
					slog.String("user_id", user.ID),
					slog.String("trace_id", traceID),
				)
			}

		} else {
			slog.Info("request",
				slog.String("method", r.Method),
				slog.String("uri", r.RequestURI),
				slog.String("trace_id", traceID),
			)
		}

		// Call the next handler.
		// Wrap the original http.ResponseWriter with our custom writer to capture the status code.
		rw := newResponseWriter(w)

		// Call the next handler, passing our custom ResponseWriter.
		next.ServeHTTP(rw, r)

		// After the handler returns, log the request details and response status.
		duration := time.Since(start)
		slog.Info("response",
			slog.String("method:", r.Method),
			slog.String("uri:", r.RequestURI),
			slog.Int("status:", rw.statusCode),
			slog.Duration("duration", duration),
			slog.String("trace_id", traceID),
		)

	}
}
