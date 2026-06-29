# Thường là stage-0 (ví dụ: FROM golang:1.22 AS builder)
FROM golang:1.22-alpine AS builder

WORKDIR /app

# 1. Copy file định nghĩa thư viện vào trước
COPY go.mod go.sum ./

# 2. Tải toàn bộ dependency (bao gồm cả github.com/lib/pq)
RUN go mod download

# 3. Copy toàn bộ source code còn lại vào sau
COPY . .

# 4. Tiến hành build (Lệnh của bạn đang bị lỗi ở đây)
RUN go build -o out .