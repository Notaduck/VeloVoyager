package storage

import (
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

type Storage interface {
	Upload(bucket string, key string, file io.Reader) (*s3.PutObjectOutput, error)
}

type storage struct {
	client *s3.S3
}

func New(region string) (*storage, error) {

	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(region),
	})

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
		Bucket: aws.String(bucket),
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
