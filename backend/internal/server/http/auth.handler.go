package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	supa "github.com/nedpals/supabase-go"
)

type AuthRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (s *APIServer) supaClient() *supa.Client {

	supabaseUrl := s.config.SupabaseUrl
	supabaseKey := s.config.SupabaseKey
	slog.Info("=>", supabaseKey, supabaseUrl)
	supwbaseJwtSecret := s.config.SupabaseJwtSecret

	_ = supwbaseJwtSecret

	return supa.CreateClient(supabaseUrl, supabaseKey)

}

func (s *APIServer) handleRegistration(w http.ResponseWriter, r *http.Request) error {

	if r.Method != "POST" {
		return fmt.Errorf("method not allowed %s", r.Method)
	}

	var req AuthRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return fmt.Errorf("error decoding request body: %v", err)
	}

	user, err := s.supaClient().Auth.SignUp(context.Background(), supa.UserCredentials{
		Email:    req.Email,
		Password: req.Password,
		Data: map[string]interface{}{
			"first_name": req.FirstName,
			"last_name":  req.LastName,
		},
	})

	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, user)

}

func (s *APIServer) handleLogin(w http.ResponseWriter, r *http.Request) error {

	if r.Method == "POST" {

		var req AuthRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return fmt.Errorf("error decoding request body: %v", err)
		}

		user, err := s.supaClient().Auth.SignIn(context.Background(), supa.UserCredentials{
			Email:    req.Email,
			Password: req.Password,
		})

		if err != nil {
			return err
		}

		return WriteJSON(w, http.StatusOK, user)
	}

	return fmt.Errorf("method not allowed %s", r.Method)

}

func AuthHandler(f apiFunc) http.HandlerFunc {
	// Wrap the apiFunc with logRequest middleware.
	handlerWithLogging := logRequest(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := f(w, r); err != nil {
			// Log the error with the request ID for better traceability.
			requestID, _ := r.Context().Value("requestID").(string)
			slog.Error("Request error", "id", requestID, "error", err.Error())

			WriteJSON(w, http.StatusBadRequest, ApiError{Error: err.Error()})
		}
	}))

	return handlerWithLogging
}

func (s *APIServer) AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()

		token := r.Header.Get("Authorization")

		fmt.Println(ctx)

		user, err := s.supaClient().Auth.User(ctx, token)

		if err != nil {
			slog.Info("failed  login atempt", slog.String("token", token), slog.String("err", err.Error()))
		}
		_ = user

		next.ServeHTTP(w, r.WithContext(ctx))

	}
}
