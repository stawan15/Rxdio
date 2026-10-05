# Stage 1: build
FROM node:24-alpine AS build

WORKDIR /app

# Copy manifests first so the dependency layer is cached
COPY package*.json ./
RUN npm ci

# Vite inlines these at build time (all optional; without them the app is guest-only)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SITE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_SITE_URL=$VITE_SITE_URL

COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
