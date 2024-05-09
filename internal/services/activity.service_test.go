package service

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notaduck/backend/internal/db"
	"github.com/notaduck/backend/internal/repositories"
	"github.com/notaduck/backend/misc/testhelpers"
	"github.com/stretchr/testify/suite"

	fit "github.com/tormoder/fit"
)

type ActivityServiceTestSuite struct {
	suite.Suite
	pgContainer *testhelpers.PostgresContainer
	queries     *db.Queries
	ctx         context.Context
}

func (s *ActivityServiceTestSuite) SetupSuite() {
	s.ctx = context.Background()
	absPath, _ := filepath.Abs("../../misc/testhelpers/init-db.sql")
	pgContainer, err := testhelpers.CreatePostgresContainer(s.ctx, absPath)

	if err != nil {
		log.Fatalf("failed to setup test suite: %s", err)
	}

	s.pgContainer = pgContainer

	pool, err := pgxpool.New(s.ctx, s.pgContainer.ConnectionString)

	if err != nil {
		panic(fmt.Sprint("failed to connect to database: %w", err))
	}

	queries := db.New(pool)

	s.queries = queries

}

func (s *ActivityServiceTestSuite) TearDownSuite() {

	// s.pgContainer.Terminate(s.ctx)
	if err := s.pgContainer.Terminate(s.ctx); err != nil {
		log.Fatalf("error terminating postgres container: %s", err)
	}
}

func (s *ActivityServiceTestSuite) TestActivityServiceReturnsAnActivity() {

	userId := "04961e85-8280-4fb3-80d4-a5072bcec9b1"

	recordRepo := repositories.NewRecordRepository(s.queries)
	activityRepo := repositories.NewActivityRepository(s.queries)

	activityService := NewActivityService(activityRepo, recordRepo)

	activity, err := activityService.GetSingleActivityById(s.ctx, 1, userId)

	s.NoError(err)

	s.NotNil(activity)
	s.NotNil(activity.ActivityName)
	s.NotNil(activity.CreatedAt)
	s.NotNil(activity.ElapsedTime)
	s.NotNil(activity.TotalTime)
	s.NotNil(activity.ID)

	s.NotNil(activity.AvgSpeed)
	s.Greater(activity.AvgSpeed, 0.0)
	s.NotNil(activity.MaxSpeed)
	s.Greater(activity.MaxSpeed, 0.0)

	s.Greater(len(activity.Records), 0)
}

func (s *ActivityServiceTestSuite) TestProcessRecords() {
	// Create mock records based on what processRecords expects
	records := []*fit.RecordMsg{
		{
			// Timestamp:                     fit.Time(time.Now()),
			PositionLat:                   fit.NewLatitude(1),
			PositionLong:                  fit.NewLongitude(2),
			Altitude:                      1000,
			HeartRate:                     120,
			Cadence:                       80,
			Distance:                      500,
			Speed:                         30,
			Power:                         0,
			CompressedSpeedDistance:       []byte{},
			Grade:                         0,
			Resistance:                    0,
			TimeFromCourse:                0,
			CycleLength:                   0,
			Temperature:                   20,
			Speed1s:                       []uint8{},
			Cycles:                        0,
			TotalCycles:                   0,
			CompressedAccumulatedPower:    0,
			AccumulatedPower:              0,
			LeftRightBalance:              0,
			GpsAccuracy:                   5,
			VerticalSpeed:                 0,
			Calories:                      0,
			VerticalOscillation:           0,
			StanceTimePercent:             0,
			StanceTime:                    0,
			ActivityType:                  0,
			LeftTorqueEffectiveness:       0,
			RightTorqueEffectiveness:      0,
			LeftPedalSmoothness:           0,
			RightPedalSmoothness:          0,
			CombinedPedalSmoothness:       0,
			Time128:                       0,
			StrokeType:                    0,
			Zone:                          0,
			BallSpeed:                     0,
			Cadence256:                    0,
			FractionalCadence:             0,
			TotalHemoglobinConc:           0,
			TotalHemoglobinConcMin:        0,
			TotalHemoglobinConcMax:        0,
			SaturatedHemoglobinPercent:    0,
			SaturatedHemoglobinPercentMin: 0,
			SaturatedHemoglobinPercentMax: 0,
			DeviceIndex:                   0,
			EnhancedSpeed:                 0,
			EnhancedAltitude:              1002,
		},
		// Add more records as needed to simulate a realistic input
	}

	// You would need a reference to your service instance
	// Assuming you have a method to create an instance of activityService
	recordRepo := repositories.NewRecordRepository(s.queries)
	activityRepo := repositories.NewActivityRepository(s.queries)
	activityService := NewActivityService(activityRepo, recordRepo)
	_ = activityService
	_ = records
	// activityService.

	// Directly call processRecords (this assumes it's exported or tests are in the same package)
	// recordEntities, stats, err := activityService.processRecords(records)

	// s.NoError(err)
	// s.NotNil(recordEntities)
	// s.NotNil(stats)
	// s.NotZero(len(recordEntities), "There should be at least one record processed.")
	// s.Greater(stats.AvgSpeed, 0.0, "Average speed should be calculated and greater than 0.")
	// s.Greater(stats.MaxSpeed, 0.0, "Max speed should be calculated and greater than 0.")
	// s.Greater(stats.Distance, 0.0, "Distance should be calculated and greater than 0.")
}

func TestActivityServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ActivityServiceTestSuite))
}
