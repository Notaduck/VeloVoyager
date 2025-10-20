package handlers

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	activityv1 "github.com/notaduck/backend/gen/activity/v1"
	"github.com/notaduck/backend/internal/rpc/middleware"
	service "github.com/notaduck/backend/internal/services"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ActivityHandler struct {
	service service.ActivityService
}

func NewActivityHandler(service service.ActivityService) *ActivityHandler {
	return &ActivityHandler{service: service}
}

func (h *ActivityHandler) UploadActivities(
	ctx context.Context,
	stream *connect.ClientStream[activityv1.UploadActivitiesRequest],
) (*connect.Response[activityv1.UploadActivitiesResponse], error) {
	// Retrieve user from context
	user := middleware.RetrieveUserFromContext(ctx)
	if user == nil {
		err := fmt.Errorf("user not authenticated")
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	var currentFileBuffer []byte

	// Process incoming stream of file chunks
	for stream.Receive() {
		req := stream.Msg()

		// Handle incoming payload
		switch payload := req.GetPayload().(type) {
		case *activityv1.UploadActivitiesRequest_FileChunk:
			// Append file chunk to buffer
			currentFileBuffer = append(currentFileBuffer, payload.FileChunk...)

		case *activityv1.UploadActivitiesRequest_Metadata:
			// Optional: Handle metadata
			log.Printf("Received metadata: %s", payload.Metadata)
		}
	}

	// Check for stream errors after the loop
	if err := stream.Err(); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Ensure file buffer is not empty
	if len(currentFileBuffer) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no file data received"))
	}

	// Process the file yourself
	log.Printf("Received file of size %d bytes from user %s", len(currentFileBuffer), user.ID)

	// Create the response
	response := &activityv1.UploadActivitiesResponse{
		Status: "success",
	}

	// Return the response
	return connect.NewResponse(response), nil
}

func (h *ActivityHandler) UploadActivitiesUnary(
	ctx context.Context,
	req *connect.Request[activityv1.UploadActivitiesUnaryRequest],
) (*connect.Response[activityv1.UploadActivitiesResponse], error) {
	user := middleware.RetrieveUserFromContext(ctx)
	if user == nil {
		err := fmt.Errorf("user not authenticated")
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	if len(req.Msg.GetFiles()) == 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("no file data received"))
	}

	files := make([]service.ActivityFilePayload, 0, len(req.Msg.Files))
	for _, file := range req.Msg.Files {
		if len(file.GetData()) == 0 {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("file %q has no data", file.GetFilename()))
		}

		payload := service.ActivityFilePayload{
			Filename:    file.GetFilename(),
			ContentType: file.GetContentType(),
			Data:        file.GetData(),
		}

		if lm := file.GetLastModified(); lm > 0 {
			payload.LastModified = time.UnixMilli(lm)
		}

		files = append(files, payload)
	}

	if _, err := h.service.CreateActivitiesFromBytes(ctx, files, user.ID); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	response := &activityv1.UploadActivitiesResponse{
		Status: "success",
	}

	return connect.NewResponse(response), nil
}

// GetActivity handles fetching a single activity by ID with records.
func (h *ActivityHandler) GetActivity(
	ctx context.Context,
	req *connect.Request[activityv1.GetActivityRequest],
) (*connect.Response[activityv1.GetActivityResponse], error) {

	// Retrieve user from context
	user := middleware.RetrieveUserFromContext(ctx)
	if user == nil {
		err := fmt.Errorf("user not authenticated")
		slog.ErrorContext(ctx, "failed to retrieve user from context", "error", err)
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	// Fetch activity from the service
	activity, err := h.service.GetSingleActivityById(ctx, req.Msg.ActivityId, user.ID)
	if err != nil {
		slog.ErrorContext(ctx, "failed to get activity", "error", err, "activity_id", req.Msg.ActivityId)
		// Wrap the error with an appropriate ConnectRPC error code
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("activity not found"))
	}

	// Convert internal records to Protobuf records
	protobufRecords := make([]*activityv1.Record, len(activity.Records))
	for i, rec := range activity.Records {
		protobufRecords[i] = &activityv1.Record{
			Id:          rec.ID,
			Coordinates: &activityv1.Point{X: rec.Coordinates.X, Y: rec.Coordinates.Y},
			Speed:       rec.Speed,
			TimeStamp:   timestamppb.New(rec.TimeStamp),
			Distance:    rec.Distance,
			HeartRate:   int32(rec.HeartRate),
		}
	}

	// Create the Protobuf response
	activityResponse := &activityv1.GetActivityResponse{
		Id:           activity.ID,
		CreatedAt:    activity.CreatedAt.String(),
		Distance:     activity.Distance,
		ActivityName: activity.ActivityName,
		AvgSpeed:     activity.AvgSpeed,
		MaxSpeed:     activity.MaxSpeed,
		ElapsedTime:  activity.ElapsedTime, // Ensure this is a string
		TotalTime:    activity.TotalTime,   // Ensure this is a string
		Records:      protobufRecords,
	}

	// Create a ConnectRPC response
	connectResp := connect.NewResponse(activityResponse)
	connectResp.Header().Set("Greet-Version", "v1")

	return connectResp, nil
}

func (h *ActivityHandler) GetActivities(
	ctx context.Context,
	req *connect.Request[activityv1.GetActivitiesRequest], // Changed to Empty
) (*connect.Response[activityv1.GetActivitiesResponse], error) {

	user := middleware.RetrieveUserFromContext(ctx)

	activities, err := h.service.GetActivities(ctx, user.ID)
	if err != nil {
		log.Printf("Error fetching activities: %v", err)
		return nil, err
	}

	activityList := make([]*activityv1.ActivitySummary, len(activities))
	for i, activity := range activities {
		activityList[i] = &activityv1.ActivitySummary{
			Id:           activity.ID,
			ActivityName: activity.ActivityName,
			TotalTime:    activity.TotalTimeChar,
			Distance:     activity.Distance.InexactFloat64(),
			ElapsedTime:  activity.ElapsedTimeChar,
		}
	}

	response := &activityv1.GetActivitiesResponse{
		Activities: activityList,
	}

	connectResp := connect.NewResponse(response)
	connectResp.Header().Set("Greet-Version", "v1")

	return connectResp, nil
}
