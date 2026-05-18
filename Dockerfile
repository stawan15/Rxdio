# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

# คัดลอกแพ็กเกจก่อนเพื่อใช้ Docker layer cache และติดตั้ง dependencies
COPY package*.json ./
RUN npm ci

# คัดลอกแพ็กเกจ lock และโค้ดทั้งหมดแล้ว build
COPY . .
RUN npm run build

# Stage 2: Production stage
FROM nginx:stable-alpine

# คัดลอกไฟล์ build ที่เสร็จแล้วไปยัง public folder ของ Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
