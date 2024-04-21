package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestLoggingMiddleware tests the LoggingMiddleware's ability to process requests and modify the response.
func TestLoggingMiddleware(t *testing.T) {
	// Define a simple next handler that writes a specific header and status code.
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

	// Here you could also test if the logging output is correct, but that's more complex as it involves intercepting the logger.
}
