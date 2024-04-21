package http

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	jwt "github.com/golang-jwt/jwt"
	"github.com/nedpals/supabase-go"
)

// User represents the structure of the user information.
type UserClaims struct {
	Aud          string      `json:"aud"`
	Exp          int64       `json:"exp"`
	Iat          int64       `json:"iat"`
	Iss          string      `json:"iss"`
	Sub          string      `json:"sub"`
	Email        string      `json:"email"`
	Phone        string      `json:"phone"`
	AppMetadata  AppMetadata `json:"app_metadata"`
	UserMetadata interface{} `json:"user_metadata"` // Using interface{} since it's empty in the example
	Role         string      `json:"role"`
	AAL          string      `json:"aal"`
	AMR          []AMR       `json:"amr"`
	SessionID    string      `json:"session_id"`
	IsAnonymous  bool        `json:"is_anonymous"`
	jwt.StandardClaims
}

// AppMetadata represents metadata related to the application.
type AppMetadata struct {
	Provider  string   `json:"provider"`
	Providers []string `json:"providers"`
}

// AMR represents authentication methods.
type AMR struct {
	Method    string `json:"method"`
	Timestamp int64  `json:"timestamp"`
}

// AuthMiddleware checks if the user is authenticated
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		fmt.Println("Checking authentication")
		// Assume context.Background() is your starting context, but in real use, you should use r.Context() to get the request's existing context.
		ctx := r.Context()
		// var traceId string = fmt.Sprint(ctx.Value(TraceIdFromContext))

		token := r.Header.Get("x-jwt-token")

		if token == "" {
			permissionDenied(w)
			return
		}

		user, err := supaClient().Auth.User(ctx, token)

		if err != nil {
			// slog.Info("Failed login attempt", "token", token, "error", err.Error(), slog.String("trace_id", traceId))
			permissionDenied(w)
			return
		}

		// Store the user in the context
		ctx = context.WithValue(ctx, UserFromContext, user)

		// Pass the context with the user to the next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func RetrieveUserFromContext(ctx context.Context) supabase.User {
	var user supabase.User

	// Retrieve the value from the context and attempt a type assertion
	if value, ok := ctx.Value(UserFromContext).(supabase.User); ok {
		user = value
	} else {
		// Handle the case where the type assertion fails
		slog.Error("Error: Unable to retrieve user from context or user is not of type supabase.User")
	}

	return user
}

func permissionDenied(w http.ResponseWriter) {

	// var traceIdCtx = context.WithValue().Value(UserFromContext)
	// slog.Error("permission denied", "trace_id", traceIdCtx)
	WriteJSON(w, http.StatusForbidden, ApiError{Error: "permission denied"})
}
