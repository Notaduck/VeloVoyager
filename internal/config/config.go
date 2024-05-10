package config

import (
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	ServerPort         string `mapstructure:"SERVER_PORT"`
	DbConnectionString string `mapstructure:"DB_CONNECTION_STRING"`
	SupabaseUrl        string `mapstructure:"SUPABASE_URL"`
	SupabaseKey        string `mapstructure:"SUPABASE_KEY"`
	SupwbaseJwtSecret  string `mapstructure:"SUPABASE_JWT_SECRET"`
}

func NewConfig() *Config {
	config := Config{}
	viper.SetConfigFile(".env")

	err := viper.ReadInConfig()
	if err != nil {
		log.Fatal("Can't find the file .env : ", err)
	}

	err = viper.Unmarshal(&config)
	if err != nil {
		log.Fatal("Environment can't be loaded: ", err)
	}

	//  if env.AppEnv == "development" {
	//   log.Println("The App is running in development env")
	//  }

	return &config
}
