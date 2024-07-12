package repositories

import (
	"context"

	"github.com/notaduck/backend/internal/db"
)

type MediaRepository interface {
	CreateMedia(ctx context.Context, params []db.CreateMediaParams) (int64, error)
}

type mediadRepository struct {
	Queries *db.Queries
}

func NewMediaRepository(queries *db.Queries) MediaRepository {
	return &recordRepository{
		Queries: queries,
	}
}

func (rr *recordRepository) CreateMedia(ctx context.Context, params []db.CreateMediaParams) (int64, error) {
	return rr.Queries.CreateMedia(ctx, params)
}
