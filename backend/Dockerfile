FROM golang:1.22

WORKDIR /app

# Download Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code. 
COPY ./ ./

# Build the executable
RUN CGO_ENABLED=0 GOOS=linux go build -o backend ./cmd/app/

# Expose the port
EXPOSE 3000

# Run the executable
CMD ["./backend"]
