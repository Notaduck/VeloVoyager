package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/nedpals/supabase-go"
)

// Key type to avoid context key collisions
type contextKey string

func AuthMiddleware(supabaseClient *supabase.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				slog.Error("no Authorization header was provided")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				slog.Error("invalid Authorization header format")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			accessToken := parts[1]

			user, err := supabaseClient.Auth.User(ctx, accessToken)
			if err != nil {
				slog.Error("error retrieving user from token")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			ctx = context.WithValue(ctx, UserFromContext, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RetrieveUserFromContext(ctx context.Context) *supabase.User {
	u := ctx.Value(UserFromContext)

	if user, ok := u.(*supabase.User); ok {
		return user
	}
	slog.Error("Unable to retrieve user from context or user is not of type *supabase.User")
	return nil
}
