package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

// TestLoggingMiddleware tests the LoggingMiddleware's ability to process requests and modify the response.
func TestLoggingMiddleware(t *testing.T) {
	// Define a simple next handler that writes a specific header and status code.
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID, ok := r.Context().Value(TraceIdFromContext).(string)
		if !ok || traceID == "" {
			t.Fatal("missing trace ID in request context")
		}
		if _, err := uuid.Parse(traceID); err != nil {
			t.Fatalf("invalid trace ID: %v", err)
		}

		w.Header().Set("X-Trace-ID", traceID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Wrap the nextHandler with the LoggingMiddleware.
	handlerToTest := LoggingMiddleware(nextHandler)

	// Create a request to pass through the middleware.
	req, err := http.NewRequest("GET", "/test", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a ResponseRecorder to capture the middleware's response.
	rr := httptest.NewRecorder()

	// Serve the request through the middleware.
	handlerToTest.ServeHTTP(rr, req)

	// Check the status code of the response.
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Check the response body is what we expect.
	expected := `{"status":"ok"}`
	if rr.Body.String() != expected {
		t.Errorf("handler returned unexpected body: got %v want %v", rr.Body.String(), expected)
	}

	// Ensure the middleware surfaced a trace ID.
	traceID := rr.Header().Get("X-Trace-ID")
	if traceID == "" {
		t.Fatal("missing X-Trace-ID header")
	}
}
