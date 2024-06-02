# Stage 1: Build the executable
FROM golang:1.22 AS builder

WORKDIR /app

# Download Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY ./ ./

# Build the executable
RUN CGO_ENABLED=0 GOOS=linux go build -o backend ./cmd/app/

# Stage 2: Create the final image
FROM alpine:latest

WORKDIR /app

# Copy the executable from the builder stage
COPY --from=builder /app/backend /app/backend

# Set environment variables for production
ENV SERVER_PORT=3000
ENV DB_CONNECTION_STRING=your_production_db_connection_string
ENV SUPABASE_URL=your_supabase_url
ENV SUPABASE_KEY=your_supabase_key
ENV SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Expose the port
EXPOSE 3000

# Run the executable
CMD ["./backend"]
