# Repository Guidelines

## Project Structure & Module Organization
- Backend services live under `backend/internal`: HTTP handlers in `server/http`, core logic in `services`, persistence in `repositories`.
- Executable entrypoints sit in `backend/cmd`; generated RPC stubs land in `backend/gen`; SQL migrations and fixtures stay in `backend/misc`.
- The React client sits in `frontend/src` with UI in `components`, routed pages in `routes`, hooks in `hooks`, and generated clients in `gen`; protobuf sources live in `proto/activity/v1`.

## Build, Test, and Development Commands
- Run `task build-backend` or `task run-backend` to compile or start the Go API (wrapping `go build`/`go run`).
- Use `task test-backend`—or directly `go test ./...`—before pushing to cover repository, service, and HTTP packages.
- In `frontend`, use `yarn install` once, `yarn dev` for Vite HMR, and `yarn build` for production bundles; regenerate clients with `buf generate` whenever protos change.

## Coding Style & Naming Conventions
- Format Go code with `gofmt`/`gofumpt`; keep package names lower_snake_case and constructor helpers prefixed `New`.
- Propagate contexts explicitly and suffix interfaces with `er` to match conventions already in `backend/internal`.
- Run `yarn lint` for ESLint plus Prettier; React components stay PascalCase, hooks camelCase beginning with `use`, and Tailwind utilities remain inline unless promoted to `src/lib`.

## Testing Guidelines
- Co-locate Go tests as `_test.go` files and follow the table-driven style used in `internal/repositories` and `server/http`.
- Ensure Docker is running before suites that rely on `testcontainers` (Postgres-backed specs).
- Plan Vitest suites under `frontend/src/**/__tests__`; document temporary coverage gaps in PRs until they are in place.

## Commit & Pull Request Guidelines
- Write short, imperative subjects (`cache lookup fallback`, `lazyload map`) to mirror existing history.
- Keep schema edits and generated artifacts in the same commit so reviewers see a single diff.
- PRs should summarize intent, list verification steps (`task test-backend`, `yarn build`), include UI screenshots for visual tweaks, and link issues when relevant.

## Protocol Buffers & Code Generation
- Edit `proto` definitions first, then run `buf generate` (optionally `buf format`) to refresh Go and TypeScript clients.
- Commit updates under `backend/gen` and `frontend/src/gen` alongside the proto change, reviewing for breaking RPC surfaces.
