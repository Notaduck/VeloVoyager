package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

type ApiResponse struct {
	Latitude             float64      `json:"latitude"`
	Longitude            float64      `json:"longitude"`
	GenerationTimeMs     float64      `json:"generationtime_ms"`
	UtcOffsetSeconds     int          `json:"utc_offset_seconds"`
	Timezone             string       `json:"timezone"`
	TimezoneAbbreviation string       `json:"timezone_abbreviation"`
	Elevation            float64      `json:"elevation"`
	HourlyUnits          HourlyUnits  `json:"hourly_units"`
	Hourly               HourlyValues `json:"hourly"`
}

type HourlyUnits struct {
	Time             string `json:"time"`
	WindSpeed10m     string `json:"wind_speed_10m"`
	WindDirection10m string `json:"wind_direction_10m"`
}

type HourlyValues struct {
	Time             []string  `json:"time"`
	WindSpeed10m     []float64 `json:"wind_speed_10m"`
	WindDirection10m []int     `json:"wind_direction_10m"`
}

type weatherService struct {
}

func NewWeatherService() *weatherService {
	return &weatherService{}
}

func (ws *weatherService) GetWeather() (*ApiResponse, error) {

	baseUrl := "https://archive-api.open-meteo.com/v1/archive"

	params := url.Values{}
	params.Add("latitude", "52.52")
	params.Add("longitude", "13.41")
	params.Add("hourly", "temperature_2m")

	fullURL := fmt.Sprintf("%s?%s", baseUrl, params.Encode())

	resp, err := http.Get(fullURL)
	if err != nil {
		fmt.Println("Error making request:", err)
		return nil, err
	}
	defer resp.Body.Close()

	// Reading the response body
	var apiResponse ApiResponse

	err = json.NewDecoder(resp.Body).Decode(&apiResponse)
	if err != nil {
		fmt.Println("Error decoding JSON:", err)
		return nil, err
	}

	return &apiResponse, nil

}
