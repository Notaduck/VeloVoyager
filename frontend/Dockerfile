# Stage 1: Build the application
FROM node:22-alpine as builder

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_API_KEY
ARG VITE_API_URL
ARG VITE_MAPBOX_TOKEN

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_API_KEY=$VITE_SUPABASE_API_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Remove default nginx website
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output to the Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]
