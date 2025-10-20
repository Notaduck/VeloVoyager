# Backend Guide

## Stack & Entry Points
- HTTP server: `internal/server/http` with routes registered in `server.go`
- Connect RPC server: `cmd/app/main.go` bootstraps services and New Relic instrumentation
- Business logic: `internal/services`, persistence in `internal/repositories`, generated queries in `internal/db`

## Configuration
- Development loads `.env` via Viper; production reads environment variables directly.
- Required keys: `SERVER_PORT`, `DB_CONNECTION_STRING`, `SUPABASE_URL`, `SUPABASE_API_KEY`, `SUPABASE_JWT_SECRET`, plus optional `NEW_RELIC_APP_NAME` and `NEW_RELIC_LICENSE`.
- Copy `backend/.env` to a local secrets vault; never commit real credentials.

## Common Commands
- `task build-backend` – compile all Go packages
- `task run-backend` – run the HTTP server using `go run ./...`
- `task test-backend` – execute Go tests (ensure Docker is running for suites that use testcontainers)
- `task generate-proto` – regenerate Go stubs in `gen/` after modifying `proto/`

## Development Tips
- Logging middleware attaches a trace ID to each request; retrieve it via `TraceIdFromContext`.
- Supabase auth helpers live in `auth.handler.go` and `jwt.middleware.go`; reuse them for protected routes.
- Keep new Go files formatted with `gofmt`/`gofumpt` and run `go vet ./...` when touching critical paths.
