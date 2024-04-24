package http

import (
	"log/slog"
	"net/http"
	"strconv"
)

func (s *APIServer) handleGetActivity(w http.ResponseWriter, r *http.Request) error {

	q := r.URL.Query()

	activityID, err := strconv.ParseInt(q.Get("id"), 10, 32)

	if err != nil {

		slog.Error("Error converting activity ID:", err)
		return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "id must be a number"})

	}

	user := RetrieveUserFromContext(r.Context())

	activity, err := s.activityService.GetSingleActivityById(r.Context(), int32(activityID), []byte(user.ID))

	if err != nil {
		slog.Error("failed to fina an activity", "no activity found for", err.Error())

		return WriteJSON(w, http.StatusBadRequest, ApiError{Error: "no activity was found."})

	}

	return WriteJSON(w, http.StatusOK, activity)

}

func (s *APIServer) handlePostActivity(w http.ResponseWriter, r *http.Request) error {

	err := r.ParseMultipartForm(10 << 20) // 10 MB limit for uploaded files

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, "Please select one or more .fit files to upload and try again! 📁🚀")
	}

	files := r.MultipartForm.File["files"]

	user := RetrieveUserFromContext(r.Context())

	activityDetails, err := s.activityService.CreateActivities(r.Context(), files, user.ID)

	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ApiError{err.Error()})
	}

	return WriteJSON(w, http.StatusOK, activityDetails)

}
