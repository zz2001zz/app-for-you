package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os" // Thêm thư viện os để đọc cấu hình hệ thống
	"time"

	_ "github.com/mattn/go-sqlite3"
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
	// Railway Volume sẽ map vào thư mục /data để bảo toàn file dữ liệu
	db, err = sql.Open("sqlite3", "/data/date_app.db")
	if err != nil {
		log.Fatal(err)
	}

	db.Exec(`CREATE TABLE IF NOT EXISTS appointments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		time TEXT,
		location TEXT,
		message TEXT,
		created_at DATETIME
	)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS busy_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		message TEXT,
		created_at DATETIME
	)`)
}

func inviteHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var appt Appointment
	json.NewDecoder(r.Body).Decode(&appt)

	query := `INSERT INTO appointments (time, location, message, created_at) VALUES (?, ?, ?, ?)`
	db.Exec(query, appt.Time, appt.Location, appt.Message, time.Now())

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
	json.NewDecoder(r.Body).Decode(&logData)

	query := `INSERT INTO busy_logs (message, created_at) VALUES (?, ?)`
	_, err := db.Exec(query, logData.Message, time.Now())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "recorded_busy"})
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/api/invite", inviteHandler)
	http.HandleFunc("/api/busy", busyHandler)

	// Đọc PORT do hệ thống Railway cấp phát tự động
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Server đang chạy tại port :" + port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
