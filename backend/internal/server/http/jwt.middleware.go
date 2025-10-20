package http

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/nedpals/supabase-go"
)

func AuthMiddleware(apiServer *APIServer) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			token := r.Header.Get("x-jwt-token")
			if token == "" {
				slog.Error("no x-jwt-token was provided in the header")
				permissionDenied(w)
				return
			}

			user, err := apiServer.supaClient().Auth.User(ctx, token)
			if err != nil {
				slog.Error("failed to fetch user from supabase", "error", err, "token", token)
				permissionDenied(w)
				return
			}

			ctx = context.WithValue(ctx, UserFromContext, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		}
	}
}

func RetrieveUserFromContext(ctx context.Context) *supabase.User {
	u := ctx.Value(UserFromContext)

	if user, ok := u.(*supabase.User); ok {
		return user
	} else {
		slog.Error("Error: Unable to retrieve user from context or user is not of type *supabase.User")
		return nil
	}
}

func permissionDenied(w http.ResponseWriter) {
	WriteJSON(w, http.StatusForbidden, ApiError{Error: "permission denied"})
}
