package service

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"io"
	"log"
	"log/slog"
	"mime/multipart"

	"github.com/evanoberholster/imagemeta"
	"golang.org/x/sync/errgroup"
)

type ImageService interface {
	UploadImage(images map[string][]*multipart.FileHeader) error
}

type imageService struct {
}

func NewImageService() ImageService {
	return &imageService{}
}

func (is *imageService) UploadImage(images map[string][]*multipart.FileHeader) error {
	errg := new(errgroup.Group)

	for _, imageHeaders := range images {
		for _, imageHeader := range imageHeaders {
			imageHeader := imageHeader

			errg.Go(func() error {
				file, err := imageHeader.Open()
				if err != nil {
					return err
				}
				defer file.Close()

				// Copy the file content to an in-memory buffer
				buf := new(bytes.Buffer)
				_, err = io.Copy(buf, file)
				if err != nil {
					return err
				}

				// Create a ReadSeeker from the buffer
				image := bytes.NewReader(buf.Bytes())

				e, err := imagemeta.Decode(image)
				if err != nil {
					return err
				}

				slog.Info(fmt.Sprintf("%v", e))

				// https://pkg.go.dev/github.com/aws/aws-sdk-go/service/s3
				// 1. Convert image to webp
				webpImg := con
				// 2. UPLOAD THE IMAGE
				// 3. Take the parsed metadata from the image and upload it to a media table in the database
				//    with the returned image location.

				return nil
			})
		}
	}

	if err := errg.Wait(); err != nil {
		slog.Error("failed", err)
		return errors.Join(err)
	}

	return nil
}

func convertImage(file io.Reader) (image.Image, error) {
	// Decode the image
	img, _, err := image.Decode(file)
	if err != nil {
		log.Fatalf("failed to decode image: %v", err)
		return nil, err

	}

	return img, err
}
