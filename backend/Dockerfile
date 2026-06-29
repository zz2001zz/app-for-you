FROM golang:1.22-alpine

WORKDIR /app

# Copy go mod và download trước để tối ưu cache
COPY go.mod go.sum ./
RUN go mod download

# Copy toàn bộ code
COPY . .

# Build ứng dụng (file binary tên là 'main')
RUN go build -o main .

# DÒNG QUAN TRỌNG NHẤT BẠN ĐANG THIẾU:
# Lệnh này bảo container chạy file vừa build xong
CMD ["./main"]
