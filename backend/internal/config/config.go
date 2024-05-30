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
	SupabaseKey        string `mapstructure:"SUPABASE_KEY"`
	SupabaseJwtSecret  string `mapstructure:"SUPABASE_JWT_SECRET"`
}

func NewConfig() *Config {
	config := Config{}

	// Determine the environment
	ENV := os.Getenv("ENV")

	if ENV == "production" {
		// In production, read directly from environment variables
		config.ServerPort = os.Getenv("SERVER_PORT")
		config.DbConnectionString = os.Getenv("DB_CONNECTION_STRING")
		config.SupabaseUrl = os.Getenv("SUPABASE_URL")
		config.SupabaseKey = os.Getenv("SUPABASE_KEY")
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
