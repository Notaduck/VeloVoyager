package storage

import (
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

type Storage interface {
	Upload(bucket string, key string, file io.Reader) (*s3.PutObjectOutput, error)
}

type storage struct {
	client *s3.S3
}

func New(region, endpoint, accessKeyID, secretAccessKey string) (Storage, error) {
	// Validate the credentials
	if accessKeyID == "" || secretAccessKey == "" {
		return nil, fmt.Errorf("accessKeyID and secretAccessKey must be provided")
	}

	creds := credentials.NewStaticCredentials(accessKeyID, secretAccessKey, "")

	awsConfig := &aws.Config{
		Region:           aws.String(region),
		Endpoint:         aws.String(endpoint),
		Credentials:      creds,
		S3ForcePathStyle: aws.Bool(true),
	}

	sess, err := session.NewSession(awsConfig)
	if err != nil {
		slog.Error("Error creating storage session:", err)
		return nil, err
	}

	svc := s3.New(sess)
	return &storage{
		client: svc,
	}, nil
}

func (s *storage) Upload(bucket string, key string, file io.Reader) (*s3.PutObjectOutput, error) {
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, file); err != nil {
		slog.Error("buffer copy err", fmt.Sprintf("%v", os.Stderr), "Error reading file:", err)
		return nil, err
	}

	out, err := s.client.PutObject(&s3.PutObjectInput{
		Bucket: aws.String("activity_media"),
		Key:    aws.String(key),
		Body:   bytes.NewReader(buf.Bytes()),
	})

	if err != nil {
		fmt.Println("Error uploading file:", err)
		return nil, err
	}

	fmt.Println("File uploaded successfully!!!")

	return out, nil
}
