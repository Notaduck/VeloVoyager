package service

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notaduck/backend/internal/repositories"
	"github.com/notaduck/backend/misc/testhelpers"
	"github.com/stretchr/testify/suite"
)

type ActivityServiceTestSuite struct {
	suite.Suite
	pgContainer *testhelpers.PostgresContainer
	queries     *repositories.Queries
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

	db, err := pgxpool.New(s.ctx, s.pgContainer.ConnectionString)

	if err != nil {
		panic(fmt.Sprint("failed to connect to database: %w", err))
	}

	queries := repositories.New(db)

	s.queries = queries

}

func (s *ActivityServiceTestSuite) TearDownSuite() {

	// s.pgContainer.Terminate(s.ctx)
	if err := s.pgContainer.Terminate(s.ctx); err != nil {
		log.Fatalf("error terminating postgres container: %s", err)
	}
}

func (s *ActivityServiceTestSuite) TestActivityServiceReturnsAnActivity() {

	userId := []byte("04961e85-8280-4fb3-80d4-a5072bcec9b1")

	activityService := NewActivityService(s.queries)

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

func TestActivityServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ActivityServiceTestSuite))
}
