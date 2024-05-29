package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

// TestLogRequestMiddleware tests that the logRequest middleware generates a unique ID for each request
// and injects it into the request's context.
func TestLogRequestMiddleware(t *testing.T) {
	// Create a mock handler that will be wrapped by the middleware.
	// This handler simply writes the value of "requestID" from the request's context to the response.
	mockHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if requestID, ok := r.Context().Value("requestID").(string); ok {
			w.Write([]byte(requestID))
		} else {
			t.Fatal("requestID not found in request context")
		}
	})

	// Wrap the mock handler with the logRequest middleware.
	wrappedHandler := logRequest(mockHandler)

	// Create a new HTTP request to pass to the handler.
	req, err := http.NewRequest("GET", "http://example.com/foo", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Use httptest.ResponseRecorder to record the response.
	rr := httptest.NewRecorder()

	// Serve the request using the wrapped handler.
	wrappedHandler.ServeHTTP(rr, req)

	// Check the status code of the response.
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Optionally, check that the response body contains a valid UUID.
	// This part of the test assumes the mock handler writes the requestID back in the response for verification.
	responseRequestID := rr.Body.String()
	if _, err := uuid.Parse(responseRequestID); err != nil {
		t.Errorf("handler returned invalid UUID: %v", err)
	}
}
