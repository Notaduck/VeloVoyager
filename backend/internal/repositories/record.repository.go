package repositories

import (
	"context"

	"github.com/notaduck/backend/internal/db"
)

type RecordRepository interface {
	CreateRecords(ctx context.Context, params []db.CreateRecordsParams) (int64, error)
}

type recordRepository struct {
	Queries *db.Queries
}

func NewRecordRepository(queries *db.Queries) RecordRepository {
	return &recordRepository{
		Queries: queries,
	}
}

func (rr *recordRepository) CreateRecords(ctx context.Context, params []db.CreateRecordsParams) (int64, error) {
	return rr.Queries.CreateRecords(ctx, params)
}
