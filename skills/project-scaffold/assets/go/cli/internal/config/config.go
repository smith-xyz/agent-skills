package config

import "os"

type Config struct {
	Env string
}

func Load() Config {
	return Config{
		Env: getEnv("ENV", "development"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
