package config

import (
	"log"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	ServerPort         string `mapstructure:"SERVER_PORT"`
	DbConnectionString string `mapstructure:"DB_CONNECTION_STRING"`
	SupabaseUrl        string `mapstructure:"SUPABASE_URL"`
	SupabaseKey        string `mapstructure:"SUPABASE_API_KEY"`
	SupabaseJwtSecret  string `mapstructure:"SUPABASE_JWT_SECRET"`
	S3EndPoint         string `mapstructure:"S3_ENDPOINT"`
	S3Region           string `mapstructure:"S3_REGION"`
	S3AccessKeyId      string `mapstructure:"S3_ACCESS_KEY_ID"`
	S3SecretAccessKey  string `mapstructure:"S3_SECRET_ACCESS_KEY"`
	S3Bucket           string `mapstructure:"S3_MEDIA_BUCKET"`
}

func NewConfig() *Config {
	config := Config{}

	// Determine the environment
	ENV := os.Getenv("ENV")

	if ENV == "production" || ENV == "preview" {
		// In production, read directly from environment variables
		config.ServerPort = os.Getenv("SERVER_PORT")
		config.DbConnectionString = os.Getenv("DB_CONNECTION_STRING")
		config.SupabaseUrl = os.Getenv("SUPABASE_URL")
		config.SupabaseKey = os.Getenv("SUPABASE_API_KEY")
		config.SupabaseJwtSecret = os.Getenv("SUPABASE_JWT_SECRET")
	} else {
		// In development, read from the .env file
		viper.SetConfigFile(".env")

		err := viper.ReadInConfig()
		if err != nil {
			log.Fatal("Can't find the file .env: ", err)
		}

		err = viper.Unmarshal(&config)
		if err != nil {
			log.Fatal("Environment can't be loaded: ", err)
		}
	}

	return &config
}
