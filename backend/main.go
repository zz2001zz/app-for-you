package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq" // Driver kết nối PostgreSQL chính thức cho Go
)

type BusyLog struct {
	ID        int       `json:"id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type Appointment struct {
	ID        int       `json:"id"`
	Time      string    `json:"time"`
	Location  string    `json:"location"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

var db *sql.DB

func initDB() {
	var err error

	// Railway tự động cấp biến DATABASE_URL khi bạn liên kết dịch vụ Postgres
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// Chuỗi dự phòng chạy local nếu cần test máy cá nhân
		connStr = "postgresql://postgres:postgres@localhost:5432/date_app?sslmode=disable"
	}

	// Khởi tạo kết nối sử dụng driver "postgres"
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Lỗi mở kết nối Database: %v", err)
	}

	// Đảm bảo kết nối thực sự thông suốt đến Postgres Server
	err = db.Ping()
	if err != nil {
		log.Fatalf("Không thể kết nối (ping) tới PostgreSQL: %v", err)
	}

	// Khởi tạo bảng viết thường toàn bộ để PostgreSQL không bị phân biệt hoa/thường
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS appointments (
		id SERIAL PRIMARY KEY,
		time TEXT,
		location TEXT,
		message TEXT,
		created_at TIMESTAMP WITH TIME ZONE
	)`)
	if err != nil {
		log.Fatalf("Lỗi tạo bảng appointments: %v", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS busy_logs (
		id SERIAL PRIMARY KEY,
		message TEXT,
		created_at TIMESTAMP WITH TIME ZONE
	)`)
	if err != nil {
		log.Fatalf("Lỗi tạo bảng busy_logs: %v", err)
	}

	fmt.Println("Khởi tạo cấu trúc Database PostgreSQL thành công!")
}

func inviteHandler(w http.ResponseWriter, r *http.Request) {
	// Cấu hình CORS để cho phép Frontend gọi sang thoải mái
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var appt Appointment
	err := json.NewDecoder(r.Body).Decode(&appt)
	if err != nil {
		http.Error(w, "Dữ liệu gửi lên không hợp lệ: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Sử dụng placeholder dạng $1, $2, $3 chuẩn hóa của PostgreSQL
	query := `INSERT INTO appointments (time, location, message, created_at) VALUES ($1, $2, $3, $4)`
	_, err = db.Exec(query, appt.Time, appt.Location, appt.Message, time.Now())
	if err != nil {
		// Trả về lỗi 500 nếu ghi vào DB thất bại (bảng chưa có hoặc sai cột)
		log.Printf("Lỗi khi ghi vào bảng appointments: %v", err)
		http.Error(w, "Lỗi lưu Database: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func busyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var logData BusyLog
	err := json.NewDecoder(r.Body).Decode(&logData)
	if err != nil {
		http.Error(w, "Dữ liệu gửi lên không hợp lệ: "+err.Error(), http.StatusBadRequest)
		return
	}

	query := `INSERT INTO busy_logs (message, created_at) VALUES ($1, $2)`
	_, err = db.Exec(query, logData.Message, time.Now())
	if err != nil {
		log.Printf("Lỗi khi ghi vào bảng busy_logs: %v", err)
		http.Error(w, "Lỗi lưu Database: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "recorded_busy"})
}

func main() {
	fmt.Println("SERVER ĐANG KHỞI ĐỘNG...")
	initDB()
	defer db.Close()

	// Các API endpoints chính
	http.HandleFunc("/api/invite", inviteHandler)
	http.HandleFunc("/api/busy", busyHandler)

	// Lấy cổng PORT từ môi trường tự động của Railway
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Server Golang đang chạy ổn định tại port: " + port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
