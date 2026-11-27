package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

type order struct {
	ID        string `json:"id"`
	SKU       string `json:"sku"`
	Quantity  int    `json:"quantity"`
	Status    string `json:"status"`
	CreatedBy string `json:"createdBy"`
}

func main() {
	var (
		addr     = flag.String("addr", ":8080", "HTTP listen address")
		latency  = flag.Duration("latency", 15*time.Millisecond, "Simulated processing latency per request")
		failRate = flag.Float64("fail-rate", 0.0, "Optional failure probability [0.0..1.0] for simulating 500 errors")
	)
	flag.Parse()

	var (
		mu      sync.RWMutex
		orders  = make(map[string]order)
		counter atomic.Int64
	)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		simulateWork(*latency)
		writeJSON(w, http.StatusOK, map[string]any{
			"status": "ok",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	mux.HandleFunc("POST /auth/login", func(w http.ResponseWriter, r *http.Request) {
		simulateWork(*latency)
		if shouldFail(*failRate) {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "simulated auth failure"})
			return
		}

		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Email) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid credentials payload"})
			return
		}

		id := counter.Add(1)
		writeJSON(w, http.StatusOK, map[string]any{
			"data": map[string]any{
				"accessToken": fmt.Sprintf("tok-%d-%s", id, req.Email),
				"tokenType":   "Bearer",
			},
		})
	})

	mux.HandleFunc("POST /orders", func(w http.ResponseWriter, r *http.Request) {
		simulateWork(*latency)
		if !hasBearerToken(r) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing bearer token"})
			return
		}
		if shouldFail(*failRate) {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "simulated order creation failure"})
			return
		}

		var req struct {
			SKU      string `json:"sku"`
			Quantity int    `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.SKU) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "sku is required"})
			return
		}
		if req.Quantity <= 0 {
			req.Quantity = 1
		}

		ordID := fmt.Sprintf("ord-%d", counter.Add(1))
		ord := order{
			ID:        ordID,
			SKU:       req.SKU,
			Quantity:  req.Quantity,
			Status:    "created",
			CreatedBy: strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "),
		}

		mu.Lock()
		orders[ordID] = ord
		mu.Unlock()

		writeJSON(w, http.StatusCreated, map[string]any{"data": ord})
	})

	mux.HandleFunc("GET /orders/{id}", func(w http.ResponseWriter, r *http.Request) {
		simulateWork(*latency)
		if !hasBearerToken(r) {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing bearer token"})
			return
		}
		if shouldFail(*failRate) {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "simulated order lookup failure"})
			return
		}

		id := r.PathValue("id")
		mu.RLock()
		ord, ok := orders[id]
		mu.RUnlock()
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "order not found"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"data": ord})
	})

	srv := &http.Server{
		Addr:              *addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	fmt.Fprintf(os.Stderr, "LoadSmith demo server listening on http://localhost%s (latency=%s, fail-rate=%.2f)\n", *addr, *latency, *failRate)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}

func simulateWork(base time.Duration) {
	if base <= 0 {
		return
	}
	jitter := time.Duration(rand.Int63n(int64(base/2 + 1)))
	time.Sleep(base + jitter)
}

func shouldFail(rate float64) bool {
	return rate > 0 && rand.Float64() < rate
}

func hasBearerToken(r *http.Request) bool {
	auth := r.Header.Get("Authorization")
	return strings.HasPrefix(auth, "Bearer ") && len(strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))) > 0
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
