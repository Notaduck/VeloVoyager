FROM golang:1.22

WORKDIR /app

# Download Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code. 
COPY ./ ./

# Set environment variables for production
ENV SERVER_PORT=3000
ENV DB_CONNECTION_STRING=your_production_db_connection_string
ENV SUPABASE_URL=your_supabase_url
ENV SUPABASE_KEY=your_supabase_key
ENV SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Build the executable
RUN CGO_ENABLED=0 GOOS=linux go build -o backend ./cmd/app/

# Expose the port
EXPOSE 3000

# Run the executable
CMD ["./backend"]
