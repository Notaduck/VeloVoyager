# VeloVoyager

## Overview
VeloVoyager combines a Go API with a React + Vite web client to help cyclists visualise activity data. The backend exposes HTTP and Connect RPC endpoints backed by Postgres and Supabase auth, while the frontend delivers interactive dashboards and maps. Taskfile targets streamline day-to-day build, test, and code-generation chores across both apps.

## Prerequisites
- Go 1.23+ and Docker (required for tests that spin up ephemeral Postgres via testcontainers)
- Node 18+ with Yarn (`corepack enable`), plus the Buf CLI for protobuf workflows
- Supabase project credentials and a `.env` file in `backend/` and `frontend/` populated from your workspace secrets

## Quick Start
1. Install dependencies: `task build-frontend` (runs `yarn install` + build) and `go mod download` from `backend/`.
2. Launch the backend API: `task run-backend` (or `go run ./cmd/app` for the RPC server entrypoint).
3. In another shell, serve the frontend: `task run-frontend` or `yarn dev` from `frontend/`.
4. Regenerate API clients whenever you touch proto files: `task generate-proto`.
5. Before submitting changes, run `task test-backend` and `task lint-frontend`.

## Directory Layout
- `backend/cmd`: Go entrypoints (HTTP server under `internal/server/http`, Connect RPC server under `internal/rpc`)
- `backend/internal`: configuration, repositories, services, and HTTP middleware
- `backend/misc`: SQL migrations, fixtures, and test helpers
- `frontend/src`: React app organised by `components/`, `routes/`, `hooks/`, and generated API clients in `gen/`
- `proto/activity/v1`: source protobuf definitions shared between the backend and frontend
- `Taskfile.yml`: canonical commands for builds, tests, linting, and code generation

## Backend Architecture
```mermaid
flowchart TD
    subgraph Clients
        Web[HTTP Clients]
        ConnectRPC[Connect RPC Clients]
    end

    subgraph Transport
        HTTP[HTTP Handlers\ninternal/server/http]
        RPC[Connect RPC Handlers\ninternal/rpc]
    end

    subgraph Services
        ActivitySvc[Activity Service\ninternal/services]
        WeatherSvc[Weather Service]
    end

    subgraph Persistence
        ActivityRepo[Activity & Record Repositories\ninternal/repositories]
        SQLC[sqlc Queries\ninternal/db]
        DB[(Postgres\nactivities, records, views)]
    end

    subgraph Workers
        FitParser[.fit Decoder\n(tormoder/fit)]
        Metrics[Utils (haversine, speed)]
    end

    subgraph Auth
        Supabase[Supabase Auth\nmiddleware]
    end

    Web --> HTTP
    ConnectRPC --> RPC
    HTTP --> ActivitySvc
    RPC --> ActivitySvc
    HTTP --> Supabase
    RPC --> Supabase
    ActivitySvc --> FitParser
    ActivitySvc --> Metrics
    ActivitySvc --> ActivityRepo
    ActivityRepo --> SQLC --> DB
```

## Additional Notes
- Backend configuration resolves `.env` files in development; production relies on environment variables (`SERVER_PORT`, `DB_CONNECTION_STRING`, Supabase and New Relic keys).
- Logging and instrumentation are wired through `slog`, `tint`, and New Relic; ensure those environment variables are present before deploying.
