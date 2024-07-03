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
	"github.com/notaduck/backend/internal/storage"
	"golang.org/x/sync/errgroup"
)

type ImageService interface {
	UploadImage(images map[string][]*multipart.FileHeader, userId string) error
}

type imageService struct {
	storage storage.Storage
}

func NewImageService(storage storage.Storage) ImageService {
	return &imageService{
		storage: storage,
	}
}

func (is *imageService) UploadImage(images map[string][]*multipart.FileHeader, userId string) error {
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

				// Convert image to webp (not implemented in the provided code)
				// webpImg := convertToWebP(image)  //assuming convertToWebP is a function to convert image to webp
				//
				// Upload the image
				_, err = is.storage.Upload("images"+userId, imageHeader.Filename, bytes.NewReader(buf.Bytes()))
				if err != nil {
					return err
				}

				// Store the parsed metadata in the database (not implemented in the provided code)
				// storeMetadataInDB(e, imageLocation) // assuming storeMetadataInDB is a function to store metadata

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
