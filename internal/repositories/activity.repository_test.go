package repositories

// type ActivityRepositoryTestSuite struct {
// 	suite.Suite
// 	pgContainer *testhelpers.PostgresContainer
// 	queries     *Queries
// 	ctx         context.Context
// }

// func (s *ActivityRepositoryTestSuite) SetupSuite() {
// 	s.ctx = context.Background()
// 	absPath, _ := filepath.Abs("../../misc/testhelpers/init-db.sql")
// 	pgContainer, err := testhelpers.CreatePostgresContainer(s.ctx, absPath)
// 	if err != nil {
// 		log.Fatalf("failed to setup test suite: %s", err)
// 	}
// 	s.pgContainer = pgContainer

// 	db, err := pgxpool.New(s.ctx, s.pgContainer.ConnectionString)
// 	if err != nil {
// 		panic(fmt.Errorf("failed to connect to database: %w", err))
// 	}

// 	s.queries = New(db)
// }

// func (s *ActivityRepositoryTestSuite) TearDownSuite() {
// 	if err := s.pgContainer.Terminate(s.ctx); err != nil {
// 		log.Fatalf("error terminating postgres container: %s", err)
// 	}
// }

// func (s *ActivityRepositoryTestSuite) TestCreateActivity() {

// 	repo := NewActivityRepository(s.queries)

// 	uuidStr := "04961e85-8280-4fb3-80d4-a5072bcec9b1"

// 	// Parse the UUID from the string
// 	u, err := uuid.Parse(uuidStr)
// 	if err != nil {
// 		fmt.Printf("Failed to parse UUID: %v\n", err)
// 		return
// 	}

// 	UUID := pgtype.UUID{
// 		Bytes: u,
// 		Valid: true,
// 	}

// 	params := CreateActivityParams{
// 		UserID: UUID,
// 	}

// 	activity, err := repo.CreateActivity(s.ctx, params)

// 	s.NoError(err)
// 	s.NotNil(activity)
// 	s.Equal("Expected Activity Name", activity.ActivityName)
// }

// func (s *ActivityRepositoryTestSuite) TestGetActivity() {
// 	repo := NewActivityRepository(s.queries)
// 	activity, err := repo.GetActivity(s.ctx, 1)

// 	s.NoError(err)
// 	s.NotNil(activity)
// 	s.Equal(1, activity.ID)
// }

// func TestActivityRepositoryTestSuite(t *testing.T) {
// 	suite.Run(t, new(ActivityRepositoryTestSuite))
// }
