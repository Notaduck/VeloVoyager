package http

import "net/http"

func (s *APIServer) handlePostImage(w http.ResponseWriter, r *http.Request) error {

	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
	}

	// Parse the form data
	err := r.ParseMultipartForm(10 << 20) // Limit upload size to 10 MB
	if err != nil {
		http.Error(w, "Error parsing form data", http.StatusBadRequest)
	}

	user := RetrieveUserFromContext(r.Context())

	err = s.imageService.UploadImage(r.MultipartForm.File, user.ID)

	if err != nil {
		return err
	}

	return nil

}
