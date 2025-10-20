package middleware

import (
	"net/http"

	"github.com/newrelic/go-agent/v3/newrelic"
)

func NewRelicMiddleware(app *newrelic.Application) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Start a New Relic transaction
			txn := app.StartTransaction(r.URL.Path)
			defer txn.End()

			// Add request and response context to the transaction
			txn.SetWebRequestHTTP(r)
			w = txn.SetWebResponse(w)

			// Call the next handler
			next.ServeHTTP(w, r)
		})
	}
}
