package clients

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageClient interface {
	GeneratePresignedPutURL(ctx context.Context, bucketName, key string, expiration time.Duration, longitude float64, latitude float64) (string, error)
}

type storageClient struct {
	s3Client      *s3.Client
	presignClient *s3.PresignClient
}

func NewStorageClient(ctx context.Context) StorageClient {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion("us-west-2"))
	if err != nil {
		panic(err)
	}

	s3Client := s3.NewFromConfig(cfg)
	presignClient := s3.NewPresignClient(s3Client)

	return &storageClient{
		s3Client:      s3Client,
		presignClient: presignClient,
	}
}

func (s *storageClient) GeneratePresignedPutURL(ctx context.Context, bucketName, key string, expiration time.Duration, longitude float64, latitude float64) (string, error) {
	metadata := map[string]string{
		"longitude": fmt.Sprintf("%.6f", longitude),
		"latitude":  fmt.Sprintf("%.6f", latitude),
	}

	request, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:   aws.String(bucketName),
		Key:      aws.String(key),
		Metadata: metadata,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiration
	})

	if err != nil {
		return "", err
	}

	return request.URL, nil
}
