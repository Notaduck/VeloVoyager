package http

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"
)

func (s *APIServer) handleGetActivity(w http.ResponseWriter, r *http.Request) error {

	q := r.URL.Query()

	activityID, err := strconv.ParseInt(q.Get("activityId"), 10, 32)

	if err != nil {

		slog.Error("Error converting activity ID:", err)
		return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "activityId is either missing or must be a number"})

	}

	user := RetrieveUserFromContext(r.Context())

	activity, err := s.activityService.GetSingleActivityById(r.Context(), int32(activityID), user.ID)

	if err != nil {
		slog.Error("failed to fina an activity", "no activity found for", err.Error())

		return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "no activity was found."})

	}

	return WriteJSON(w, http.StatusOK, activity)

}

func (s *APIServer) handleGetActivities(w http.ResponseWriter, r *http.Request) error {

	user := RetrieveUserFromContext(r.Context())

	activities, err := s.activityService.GetActivities(r.Context(), user.ID)

	if err != nil {
		slog.Error(err.Error())
		return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "no activity was found."})

	}

	return WriteJSON(w, http.StatusOK, activities)
}

func (s *APIServer) handlePostActivity(w http.ResponseWriter, r *http.Request) error {
	// First, ensure that the request's Content-Type is multipart/form-data.
	if r.Header.Get("Content-Type") == "" || !strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		return WriteJSON(w, http.StatusBadRequest, ApiError{"Content-Type must be multipart/form-data."})
	}

	// Parse the multipart form with a 10 MB limit for uploaded files.
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		return WriteJSON(w, http.StatusBadRequest, ApiError{"Error parsing multipart form: " + err.Error()})
	}

	// Ensure that MultipartForm is not nil before accessing its File map.
	if r.MultipartForm == nil || r.MultipartForm.File == nil {
		return WriteJSON(w, http.StatusBadRequest, ApiError{"No multipart form data received."})
	}

	// Check if files were included in the request.
	files := r.MultipartForm.File["files"]
	if files == nil || len(files) == 0 {
		return WriteJSON(w, http.StatusBadRequest, ApiError{"Please select one or more .fit files to upload and try again! 📁🚀"})
	}

	// Retrieve the user from the context.
	user := RetrieveUserFromContext(r.Context())
	if user == nil {
		// Handle case where the user is not found in the context
		return WriteJSON(w, http.StatusInternalServerError, ApiError{"User not found in the request context."})
	}

	// Process the uploaded files by calling your service layer.
	activityDetails, err := s.activityService.CreateActivities(r.Context(), files, user.ID)
	if err != nil {
		// Properly pass on the error message to the client.
		return WriteJSON(w, http.StatusInternalServerError, ApiError{Error: err.Error()})
	}

	// Send the successful response back to the client.
	return WriteJSON(w, http.StatusOK, activityDetails)
}
