package service

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/chai2010/webp"
	"github.com/evanoberholster/imagemeta"
	"github.com/google/uuid"
	"github.com/jdeng/goheif"
	"github.com/notaduck/backend/internal/storage"
	"golang.org/x/exp/slog"
	"golang.org/x/sync/errgroup"
)

type ImageService interface {
	UploadImage(ctx context.Context, images map[string][]*multipart.FileHeader, userId string) (string, error)
}

type imageService struct {
	storage storage.Storage
}

func NewImageService(storage storage.Storage) ImageService {
	return &imageService{
		storage: storage,
	}
}

func (is *imageService) UploadImage(ctx context.Context, images map[string][]*multipart.FileHeader, userId string) (string, error) {
	errg, ctx := errgroup.WithContext(ctx)

	for _, imageHeaders := range images {
		for _, imageHeader := range imageHeaders {
			imageHeader := imageHeader

			errg.Go(func() error {
				return is.processAndUploadImage(ctx, imageHeader, userId)
			})
		}
	}

	if err := errg.Wait(); err != nil {
		slog.Error("Failed to upload images", "error", err)
		return "", fmt.Errorf("failed to upload images: %w", err)
	}

	return "Images uploaded successfully", nil
}

func (is *imageService) processAndUploadImage(ctx context.Context, imageHeader *multipart.FileHeader, userId string) error {
	file, err := imageHeader.Open()
	if err != nil {
		return fmt.Errorf("failed to open image file: %w", err)
	}
	defer file.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, file); err != nil {
		return fmt.Errorf("failed to copy image file content: %w", err)
	}

	imageReader := bytes.NewReader(buf.Bytes())

	metadata, err := imagemeta.Decode(imageReader)
	if err != nil {
		return fmt.Errorf("failed to decode image metadata: %w", err)
	}

	slog.Info("Image metadata", "metadata", metadata)

	webpBuf, err := convertToWebP(bytes.NewReader(buf.Bytes()), imageHeader.Filename)
	if err != nil {
		slog.Error("Failed to convert image to webp", "error", err)
		return fmt.Errorf("failed to convert image to webp: %w", err)
	}

	uniqueImageName := uuid.New().String()
	key := fmt.Sprintf("%s/%s.webp", userId, uniqueImageName)
	out, err := is.storage.Upload(storage.ACTIVITY_MEDIA, key, bytes.NewReader(webpBuf))
	if err != nil {
		return fmt.Errorf("failed to upload image: %w", err)
	}

	slog.Info("Image uploaded successfully", "output", out)

	// Assuming storeMetadataInDB is a function to store metadata
	// storeMetadataInDB(metadata, key)

	return nil
}

func convertToWebP(file io.Reader, filename string) ([]byte, error) {
	img, err := decodeImage(file, filename)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	var buf bytes.Buffer
	options := &webp.Options{Lossless: false, Quality: 75}
	if err := webp.Encode(&buf, img, options); err != nil {
		return nil, fmt.Errorf("failed to encode image to webp: %w", err)
	}

	slog.Info("Image converted to webp")
	return buf.Bytes(), nil
}

func decodeImage(file io.Reader, filename string) (image.Image, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".heic", ".heif":
		return decodeHEIC(file)
	default:
		img, _, err := image.Decode(file)
		if err != nil {
			return nil, fmt.Errorf("failed to decode image: %w", err)
		}
		return img, nil
	}
}

func decodeHEIC(file io.Reader) (image.Image, error) {
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read HEIC file: %w", err)
	}

	img, err := goheif.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode HEIC image: %w", err)
	}

	return img, nil
}
