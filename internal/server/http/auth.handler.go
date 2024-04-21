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

// AUTHENTICATION
func supaClient() *supa.Client {

	supabaseUrl := "https://aryooqhdgtuhynbydyvf.supabase.co"
	supabaseKey := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeW9vcWhkZ3R1aHluYnlkeXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk4NjM3NzAsImV4cCI6MjAxNTQzOTc3MH0.P7Gai2hPcVZf4VCpW4WmVQ53Q48z2kz_2gmhqG2UTb4"
	supwbaseJwtSecret := "s5HfybBeOaiwd4QFaYVoHOG83wKaWqAm7kxzHUi74LzwhSMsM66milvjKGiFHf4d6WjAwj0O5Kxa/mCnlwgghQ=="

	_ = supwbaseJwtSecret

	return supa.CreateClient(supabaseUrl, supabaseKey)

}

func (s *APIServer) supaClient() *supa.Client {

	supabaseUrl := "https://aryooqhdgtuhynbydyvf.supabase.co"
	supabaseKey := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeW9vcWhkZ3R1aHluYnlkeXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk4NjM3NzAsImV4cCI6MjAxNTQzOTc3MH0.P7Gai2hPcVZf4VCpW4WmVQ53Q48z2kz_2gmhqG2UTb4"
	supwbaseJwtSecret := "s5HfybBeOaiwd4QFaYVoHOG83wKaWqAm7kxzHUi74LzwhSMsM66milvjKGiFHf4d6WjAwj0O5Kxa/mCnlwgghQ=="

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

			// Respond with error.
			WriteJSON(w, http.StatusBadRequest, ApiError{Error: err.Error()})
		}
	}))

	// Return the handler already wrapped with logging middleware.
	return handlerWithLogging
}

// func AuthMiddleware(f apiFunc)  {
// 	return func(w http.ResponseWriter, r *http.Request) error {
// 		// JWT authentication logic here...
// 		fmt.Println("calling JWT auth middleware")

// 		// For simplicity, let's assume authentication passes or this is your actual auth logic
// 		// If authentication fails, you can return an error here
// 		// If it succeeds, call the original function `f`
// 		return f(w, r)
// 	}
// return func(w http.ResponseWriter, r *http.Request) {
// 	fmt.Println("calling JWT auth middleware")

// 	ctx := context.Background()
// 	ctx, _ = context.WithTimeout(ctx, 60000*time.Millisecond)
// 	token := r.Header.Get("x-jwt-token")

// 	user, err := supaClient().Auth.User(ctx, token)

// 	if err != nil {
// 		slog.Info("failed  login atempt", slog.String("token", token), err.Error())
// 	}
// 	_ = user

// 	handlerFunc(w, r)
// }
// }

func (s *APIServer) AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel() // Ensure the cancel function is called to avoid leaking resources.

		token := r.Header.Get("Authorization")

		fmt.Println(ctx)

		user, err := supaClient().Auth.User(ctx, token)

		if err != nil {
			slog.Info("failed  login atempt", slog.String("token", token), slog.String("err", err.Error()))
		}
		_ = user

		next.ServeHTTP(w, r.WithContext(ctx))

	}
}
