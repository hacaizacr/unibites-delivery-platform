package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
)

// decodeBase64URL decodes base64url encoded strings with optional padding.
func decodeBase64URL(s string) ([]byte, error) {
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}
	return base64.URLEncoding.DecodeString(s)
}

// verifyJWT validates an HS256 JWT token using a shared secret.
func verifyJWT(tokenString string) (map[string]interface{}, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token parts count")
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "super-secret-unibites-key-change-in-production-123456"
	}

	// Verify signature
	signingInput := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	expectedSignature := mac.Sum(nil)

	sigDecoded, err := decodeBase64URL(parts[2])
	if err != nil {
		return nil, fmt.Errorf("invalid signature encoding")
	}

	if !hmac.Equal(expectedSignature, sigDecoded) {
		return nil, fmt.Errorf("signature mismatch")
	}

	// Decode payload
	payloadBytes, err := decodeBase64URL(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid payload encoding")
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, fmt.Errorf("invalid payload json")
	}

	// Check expiration
	expFloat, ok := claims["exp"].(float64)
	if ok {
		if time.Now().Unix() > int64(expFloat) {
			return nil, fmt.Errorf("token expired")
		}
	}

	return claims, nil
}


// --- STRUCTS & MODELS ---

// Message matches the required Go specification and database columns
type Message struct {
	IDPedido    string    `json:"id_pedido"`
	IDRemitente string    `json:"id_remitente"`
	Contenido   string    `json:"contenido"`
	FechaEnvio  time.Time `json:"fecha_envio"`
	Lat         float64   `json:"lat,omitempty"`
	Lng         float64   `json:"lng,omitempty"`
}

// Client represents a single active WebSocket connection
type Client struct {
	Conn   *websocket.Conn
	UserID string
}

// ChatRoom manages all active clients in a single order's chat
type ChatRoom struct {
	Clients map[*Client]bool
	Mutex   sync.Mutex
}

// Hub manages active chatrooms in a thread-safe manner
type Hub struct {
	Rooms map[string]*ChatRoom
	Mutex sync.RWMutex
}

var (
	hub = Hub{
		Rooms: make(map[string]*ChatRoom),
	}
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow CORS for all origins in local PWA development
		},
	}
	db *sql.DB
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8003"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://unibites_user:unibites_password@postgres-db:5432/unibites_db?sslmode=disable"
	}

	// Connect to PostgreSQL with retry mechanism
	var err error
	for i := 0; i < 12; i++ {
		db, err = sql.Open("postgres", dbURL)
		if err == nil {
			err = db.Ping()
			if err == nil {
				log.Println("Go Chat: Successfully connected to PostgreSQL!")
				break
			}
		}
		log.Printf("Go Chat: Waiting for PostgreSQL... (%d/12) - Error: %v\n", i+1, err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Println("Go Chat WARNING: Could not connect to database. Operating in memory-only fallback mode.")
	} else {
		// Initialize chat messages table dynamically
		_, err = db.Exec(`
			CREATE TABLE IF NOT EXISTS mensajes_chat (
				id SERIAL PRIMARY KEY,
				id_pedido VARCHAR(50) NOT NULL,
				id_remitente VARCHAR(100) NOT NULL,
				contenido TEXT NOT NULL,
				fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`)
		if err != nil {
			log.Printf("Go Chat: Error checking/creating tables: %v\n", err)
		}
	}

	// Routes
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/ws/chat/", handleWebSocket)               // Matches /ws/chat/{id_pedido}/{id_usuario}
	http.HandleFunc("/api/chat/system-broadcast", handleSystemBroadcast)
	http.HandleFunc("/api/chat/", handleHistoryFallback)         // Matches /api/chat/{id_pedido}/historial

	log.Printf("Go Chat Microservice starting on port %s...\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Fatal: Go Chat Server aborted: %v\n", err)
	}
}

// --- CONTROLLERS & HANDLERS ---

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	status := "healthy"
	dbStatus := "connected"

	if db == nil {
		dbStatus = "disconnected (db client nil)"
	} else if err := db.Ping(); err != nil {
		status = "degraded"
		dbStatus = fmt.Sprintf("error: %v", err)
	}

	response := map[string]interface{}{
		"service":   "api-go-chat",
		"status":    status,
		"database":  dbStatus,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	json.NewEncoder(w).Encode(response)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Parse parameters from path variables (/ws/chat/{id_pedido}/{id_usuario})
	// Splitting yields: ["", "ws", "chat", "{id_pedido}", "{id_usuario}"]
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		log.Println("WebSocket Error: Invalid URL structure. Expected /ws/chat/{id_pedido}/{id_usuario}")
		http.Error(w, "Bad Request: Invalid path parameters", http.StatusBadRequest)
		return
	}

	idPedido := parts[3]
	idUsuario := parts[4]

	if idPedido == "" || idUsuario == "" {
		log.Println("WebSocket Error: Missing id_pedido or id_usuario path parameters")
		http.Error(w, "Bad Request: Missing parameters", http.StatusBadRequest)
		return
	}

	// JWT Security Check
	token := r.URL.Query().Get("token")
	if token == "" {
		log.Printf("WebSocket Auth Error: Missing token parameter for user %s\n", idUsuario)
		http.Error(w, "Unauthorized: Missing token", http.StatusUnauthorized)
		return
	}

	claims, err := verifyJWT(token)
	if err != nil {
		log.Printf("WebSocket Auth Error: Invalid token for user %s: %v\n", idUsuario, err)
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	// Validate subject matches user
	if claims["sub"] != idUsuario {
		log.Printf("WebSocket Auth Error: User email %s mismatch with token sub %v\n", idUsuario, claims["sub"])
		http.Error(w, "Forbidden: User mismatch", http.StatusForbidden)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket Upgrade Error for user %s: %v\n", idUsuario, err)
		return
	}
	defer conn.Close()

	client := &Client{Conn: conn, UserID: idUsuario}

	// Register client inside the Hub
	hub.Mutex.Lock()
	room, exists := hub.Rooms[idPedido]
	if !exists {
		room = &ChatRoom{Clients: make(map[*Client]bool)}
		hub.Rooms[idPedido] = room
	}
	hub.Mutex.Unlock()

	room.Mutex.Lock()
	room.Clients[client] = true
	room.Mutex.Unlock()

	log.Printf("Go Chat: User %s connected to ChatRoom for order %s\n", idUsuario, idPedido)

	// Deregister on connection loss
	defer func() {
		room.Mutex.Lock()
		delete(room.Clients, client)
		clientCount := len(room.Clients)
		room.Mutex.Unlock()

		if clientCount == 0 {
			hub.Mutex.Lock()
			delete(hub.Rooms, idPedido)
			hub.Mutex.Unlock()
			log.Printf("Go Chat: ChatRoom %s destroyed (no users left)\n", idPedido)
		}
		log.Printf("Go Chat: User %s disconnected from order %s\n", idUsuario, idPedido)
	}()

	// Listening loop for incoming messages
	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Go Chat: Read error from user %s: %v\n", idUsuario, err)
			}
			break
		}

		// Parse the incoming JSON message
		var msg Message
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			log.Printf("Go Chat: JSON Unmarshal error: %v\n", err)
			continue
		}

		// Asegurar que se asignan los datos de la URL si no vienen en el JSON
		msg.IDPedido = idPedido
		msg.IDRemitente = idUsuario
		if msg.FechaEnvio.IsZero() {
			msg.FechaEnvio = time.Now()
		}

		// Validar que el mensaje tenga contenido o sea una actualización de ubicación
		isLocationUpdate := msg.Lat != 0.0 && msg.Lng != 0.0
		if msg.Contenido == "" && !isLocationUpdate {
			continue
		}

		// a) Guardar en base de datos solo si es un mensaje de chat ordinario (no es location update)
		if !isLocationUpdate {
			go saveMessageToDB(msg)
		}

		// b) Hacer un "broadcast" retransmitiendo el mensaje instantáneamente
		broadcastBytes, err := json.Marshal(msg)
		if err != nil {
			log.Printf("Go Chat: JSON Marshal broadcast error: %v\n", err)
			continue
		}

		room.Mutex.Lock()
		for c := range room.Clients {
			err := c.Conn.WriteMessage(websocket.TextMessage, broadcastBytes)
			if err != nil {
				log.Printf("Go Chat: Failed to write message to client %s: %v\n", c.UserID, err)
				c.Conn.Close()
			}
		}
		room.Mutex.Unlock()
	}
}

func handleSystemBroadcast(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-System-Token")

	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	// Validate secret token in X-System-Token header
	token := r.Header.Get("X-System-Token")
	secretToken := "unibites-core-system-token"
	if token != secretToken {
		log.Printf("Go Chat: Unauthorized system broadcast request (invalid token: %s)\n", token)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse JSON body
	var req struct {
		IDPedido string `json:"id_pedido"`
		Status   string `json:"status"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Bad Request: Invalid JSON body", http.StatusBadRequest)
		return
	}

	if req.IDPedido == "" || req.Status == "" {
		http.Error(w, "Bad Request: Missing id_pedido or status", http.StatusBadRequest)
		return
	}

	// Retrieve room from hub
	hub.Mutex.RLock()
	room, exists := hub.Rooms[req.IDPedido]
	hub.Mutex.RUnlock()

	if !exists {
		// Room doesn't exist, nobody is connected. Return 200/OK since there's nothing to broadcast.
		log.Printf("Go Chat: System broadcast ignored, room %s has no active connections\n", req.IDPedido)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ignored", "reason": "no active connections"})
		return
	}

	msg := Message{
		IDPedido:    req.IDPedido,
		IDRemitente: "sistema",
		Contenido:   "estado:" + req.Status,
		FechaEnvio:  time.Now(),
	}

	broadcastBytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Go Chat: JSON Marshal broadcast error: %v\n", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Send message to all clients in the room
	room.Mutex.Lock()
	for c := range room.Clients {
		err := c.Conn.WriteMessage(websocket.TextMessage, broadcastBytes)
		if err != nil {
			log.Printf("Go Chat: Failed to write system message to client %s: %v\n", c.UserID, err)
			c.Conn.Close()
		}
	}
	room.Mutex.Unlock()

	log.Printf("Go Chat: System broadcasted status %s for order %s\n", req.Status, req.IDPedido)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "broadcasted"})
}

func handleHistoryFallback(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != "GET" {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	// JWT Auth Verification
	token := r.URL.Query().Get("token")
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if token == "" {
		http.Error(w, "Unauthorized: Missing token", http.StatusUnauthorized)
		return
	}

	_, err := verifyJWT(token)
	if err != nil {
		http.Error(w, "Unauthorized: Invalid token", http.StatusUnauthorized)
		return
	}

	// Parse parameters from path (/api/chat/{id_pedido}/historial)
	// Splitting yields: ["", "api", "chat", "{id_pedido}", "historial"]
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 || parts[4] != "historial" {
		http.Error(w, "Bad Request: Expected format /api/chat/{id_pedido}/historial", http.StatusBadRequest)
		return
	}

	idPedido := parts[3]
	if idPedido == "" {
		http.Error(w, "Bad Request: Missing id_pedido parameter", http.StatusBadRequest)
		return
	}

	if db == nil {
		http.Error(w, "Service Unavailable: Database client not connected", http.StatusServiceUnavailable)
		return
	}

	// Query message log from Postgres
	rows, err := db.Query(`
		SELECT id_pedido, id_remitente, contenido, fecha_envio
		FROM mensajes_chat
		WHERE id_pedido = $1
		ORDER BY fecha_envio ASC
	`, idPedido)

	if err != nil {
		log.Printf("Go Chat Database Error: Query history failed: %v\n", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var m Message
		err := rows.Scan(&m.IDPedido, &m.IDRemitente, &m.Contenido, &m.FechaEnvio)
		if err != nil {
			log.Printf("Go Chat: Row scan error: %v\n", err)
			continue
		}
		messages = append(messages, m)
	}

	// Respond with complete history log in JSON format
	json.NewEncoder(w).Encode(messages)
}

// --- DATABASE OPERATIONS ---

func saveMessageToDB(m Message) {
	if db == nil {
		log.Println("Go Chat: Postgres DB client is nil, skipping persistence log")
		return
	}

	_, err := db.Exec(`
		INSERT INTO mensajes_chat (id_pedido, id_remitente, contenido, fecha_envio)
		VALUES ($1, $2, $3, $4)
	`, m.IDPedido, m.IDRemitente, m.Contenido, m.FechaEnvio)

	if err != nil {
		log.Printf("Go Chat Database Error: Failed to persist message: %v\n", err)
	}
}
