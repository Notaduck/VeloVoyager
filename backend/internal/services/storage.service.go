
type StorageService interface {
	UploadImage(bucketName, filePath string, fileData []byte, contentType string) (string, error)
}