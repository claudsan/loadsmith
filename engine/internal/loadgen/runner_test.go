package loadgen

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"loadsmith/engine/internal/client"
	"loadsmith/engine/internal/metrics"
	"loadsmith/engine/internal/scenario"
	"loadsmith/engine/internal/stream"
)

func TestRunnerSmokeSuccessAndFailFast(t *testing.T) {
	var orderCounter atomic.Int64
	var getCalled atomic.Int64

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == "GET" && r.URL.Path == "/health":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"ok"}`))
		case r.Method == "POST" && r.URL.Path == "/auth/login":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"data":{"accessToken":"secret-jwt"}}`))
		case r.Method == "POST" && r.URL.Path == "/orders":
			if r.Header.Get("Authorization") != "Bearer secret-jwt" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			id := fmt.Sprintf("ord-%d", orderCounter.Add(1))
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"data":{"id":"` + id + `"}}`))
		case r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/orders/"):
			getCalled.Add(1)
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"data":{"status":"created"}}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	sc := &scenario.Scenario{
		Name:    "Smoke Flow",
		BaseURL: srv.URL,
		Steps: []scenario.Step{
			{ID: "health", Method: "GET", Path: "/health", Assert: &scenario.Assertion{Status: 200}},
			{ID: "auth", Method: "POST", Path: "/auth/login", Extract: map[string]string{"token": "data.accessToken"}, Assert: &scenario.Assertion{Status: 200}},
			{ID: "create", Method: "POST", Path: "/orders", Headers: map[string]string{"Authorization": "Bearer {{token}}"}, Extract: map[string]string{"orderId": "data.id"}, Assert: &scenario.Assertion{Status: 201}},
			{ID: "get", Method: "GET", Path: "/orders/{{orderId}}", Assert: &scenario.Assertion{Status: 200}},
		},
	}

	var out, errBuf bytes.Buffer
	exec := client.NewExecutor(4)
	defer exec.Close()
	runner := NewRunner(exec, stream.NewWriter(&out, &errBuf, true))

	finished, err := runner.Run(context.Background(), sc, Options{Mode: scenario.ModeSmoke})
	if err != nil {
		t.Fatalf("smoke run failed: %v", err)
	}
	if finished.TotalRequests != 4 || finished.TotalErrors != 0 || !finished.PassedThresholds {
		t.Fatalf("unexpected finished event: %+v", finished)
	}
	if getCalled.Load() != 1 {
		t.Fatalf("expected get step called once, got %d", getCalled.Load())
	}

	lines := parseNDJSONLines(t, out.String())
	if len(lines) != 3 || lines[0]["type"] != stream.EventRunStarted || lines[1]["type"] != stream.EventMetricTick || lines[2]["type"] != stream.EventRunFinished {
		t.Fatalf("unexpected smoke NDJSON sequence: %+v", lines)
	}

	// Fail-fast check: break auth step and confirm create/get are never executed.
	getCalled.Store(0)
	out.Reset()
	scFail := &scenario.Scenario{
		Name:    "Smoke Fail Fast",
		BaseURL: srv.URL,
		Steps: []scenario.Step{
			{ID: "health", Method: "GET", Path: "/health", Assert: &scenario.Assertion{Status: 200}},
			{ID: "auth", Method: "POST", Path: "/missing", Assert: &scenario.Assertion{Status: 200}},
			{ID: "get", Method: "GET", Path: "/orders/ord-1", Assert: &scenario.Assertion{Status: 200}},
		},
	}

	finishedFail, err := runner.Run(context.Background(), scFail, Options{Mode: scenario.ModeSmoke})
	if err == nil {
		t.Fatal("expected smoke fail-fast error")
	}
	if finishedFail.PassedThresholds || finishedFail.TotalRequests != 2 || finishedFail.TotalErrors != 1 {
		t.Fatalf("unexpected fail-fast summary: %+v", finishedFail)
	}
	if getCalled.Load() != 0 {
		t.Fatalf("subsequent step after failure should not run, got %d calls", getCalled.Load())
	}
	failLines := parseNDJSONLines(t, out.String())
	if len(failLines) != 3 || failLines[1]["type"] != stream.EventErrorSample || failLines[2]["type"] != stream.EventRunFinished {
		t.Fatalf("unexpected fail-fast NDJSON lines: %+v", failLines)
	}
}

func TestRunnerLoadConcurrencyErrorCapAndCancellation(t *testing.T) {
	var reqCount atomic.Int64

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := reqCount.Add(1)
		time.Sleep(5 * time.Millisecond)
		switch r.URL.Path {
		case "/auth":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"data":{"token":"t-ok"}}`))
		case "/work":
			if r.Header.Get("Authorization") != "Bearer t-ok" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			// Inject enough 500 errors to trigger > 25 total errors and test the 25-sample cap.
			if n%3 == 0 {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"ok":true}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	maxErrPct := 5.0
	p95Limit := 500.0
	sc := &scenario.Scenario{
		Name:    "Load With Errors",
		BaseURL: srv.URL,
		Steps: []scenario.Step{
			{ID: "auth", Method: "POST", Path: "/auth", Extract: map[string]string{"token": "data.token"}, Assert: &scenario.Assertion{Status: 200}},
			{ID: "work", Method: "GET", Path: "/work", Headers: map[string]string{"Authorization": "Bearer {{token}}"}, Assert: &scenario.Assertion{Status: 200}},
		},
		Load: scenario.LoadConfig{
			VUs:         6,
			RampUp:      "100ms",
			Duration:    "700ms",
			ThinkTimeMs: 5,
		},
		Thresholds: scenario.Thresholds{
			P95Ms:           &p95Limit,
			MaxErrorRatePct: &maxErrPct,
		},
	}

	var out bytes.Buffer
	exec := client.NewExecutor(10)
	defer exec.Close()
	runner := NewRunner(exec, stream.NewWriter(&out, nil, false))

	finished, err := runner.Run(context.Background(), sc, Options{
		Mode:   scenario.ModeLoad,
		Window: 150 * time.Millisecond,
	})
	if err != nil {
		t.Fatalf("load run returned unexpected err: %v", err)
	}
	if finished.TotalRequests < 50 || finished.TotalErrors <= metrics.MaxErrorSamples {
		t.Fatalf("expected >50 requests and >%d errors to test cap, got %+v", metrics.MaxErrorSamples, finished)
	}
	if finished.PassedThresholds {
		t.Fatalf("expected threshold failure due to injected 500s, got %+v", finished)
	}

	lines := parseNDJSONLines(t, out.String())
	var startedCount, tickCount, errSampleCount, finishedCount int
	for _, ev := range lines {
		switch ev["type"] {
		case stream.EventRunStarted:
			startedCount++
		case stream.EventMetricTick:
			tickCount++
		case stream.EventErrorSample:
			errSampleCount++
		case stream.EventRunFinished:
			finishedCount++
		}
	}
	if startedCount != 1 || finishedCount != 1 || tickCount == 0 {
		t.Fatalf("unexpected event counts started=%d ticks=%d finished=%d", startedCount, tickCount, finishedCount)
	}
	if errSampleCount != metrics.MaxErrorSamples {
		t.Fatalf("expected ERROR_SAMPLE count capped at %d, got %d", metrics.MaxErrorSamples, errSampleCount)
	}
	if lines[len(lines)-1]["type"] != stream.EventRunFinished {
		t.Fatalf("last event must be RUN_FINISHED, got %v", lines[len(lines)-1]["type"])
	}

	// Cancellation check: long duration should exit quickly on context cancel.
	out.Reset()
	scCancel := &scenario.Scenario{
		Name:    "Cancel Flow",
		BaseURL: srv.URL,
		Steps:   []scenario.Step{{ID: "auth", Method: "POST", Path: "/auth"}},
		Load:    scenario.LoadConfig{VUs: 3, Duration: "10s", ThinkTimeMs: 10},
	}
	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Millisecond)
	defer cancel()

	start := time.Now()
	finishedCancel, err := runner.Run(ctx, scCancel, Options{Mode: scenario.ModeLoad, Window: 80 * time.Millisecond})
	if err != nil {
		t.Fatalf("expected clean finish on cancellation, got err: %v", err)
	}
	if time.Since(start) > 2*time.Second {
		t.Fatalf("cancellation took too long: %s", time.Since(start))
	}
	if finishedCancel.PassedThresholds {
		t.Fatal("canceled run should mark PassedThresholds=false")
	}
}

func TestRunnerWithCSVDataFile(t *testing.T) {
	var mu sync.Mutex
	var received []string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		mu.Lock()
		received = append(received, body["email"]+":"+body["sku"])
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	dir := t.TempDir()
	csvPath := filepath.Join(dir, "users.csv")
	if err := os.WriteFile(csvPath, []byte("email,sku\nu1@local,S1\nu2@local,S2\nu3@local,S3\n"), 0o600); err != nil {
		t.Fatalf("write csv: %v", err)
	}

	sc := &scenario.Scenario{
		Name:      "CSV Flow",
		BaseURL:   srv.URL,
		SourceDir: dir,
		DataFile: &scenario.DataFileConfig{
			Path: "users.csv",
			Mode: scenario.DataModeRoundRobin,
		},
		Steps: []scenario.Step{
			{
				ID:     "submit",
				Method: "POST",
				Path:   "/submit",
				Body: map[string]any{
					"email": "{{email}}",
					"sku":   "{{sku}}",
				},
				Assert: &scenario.Assertion{Status: 200},
			},
		},
		Load: scenario.LoadConfig{VUs: 3, Duration: "180ms", ThinkTimeMs: 10},
	}

	var out bytes.Buffer
	exec := client.NewExecutor(5)
	defer exec.Close()
	runner := NewRunner(exec, stream.NewWriter(&out, nil, false))

	// Smoke with 3 iterations should hit all 3 CSV rows in order.
	finishedSmoke, err := runner.Run(context.Background(), sc, Options{
		Mode:            scenario.ModeSmoke,
		SmokeIterations: 3,
	})
	if err != nil || !finishedSmoke.PassedThresholds || finishedSmoke.TotalRequests != 3 {
		t.Fatalf("CSV smoke run failed: finished=%+v err=%v", finishedSmoke, err)
	}
	expected := []string{"u1@local:S1", "u2@local:S2", "u3@local:S3"}
	mu.Lock()
	for i := range expected {
		if received[i] != expected[i] {
			mu.Unlock()
			t.Fatalf("smoke iteration %d: expected %q, got %q", i, expected[i], received[i])
		}
	}
	received = nil
	mu.Unlock()

	// Load mode should distribute CSV rows cleanly across concurrent VUs.
	finishedLoad, err := runner.Run(context.Background(), sc, Options{
		Mode:   scenario.ModeLoad,
		Window: 80 * time.Millisecond,
	})
	if err != nil || !finishedLoad.PassedThresholds || finishedLoad.TotalRequests < 3 {
		t.Fatalf("CSV load run failed: finished=%+v err=%v", finishedLoad, err)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(received) < 3 {
		t.Fatalf("expected >= 3 requests in load mode, got %d", len(received))
	}
}

func TestRunnerWithLocalEnvFile(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer top-secret-token" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"authorized":true}`))
	}))
	defer srv.Close()

	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(envPath, []byte("API_SECRET=top-secret-token\n"), 0o600); err != nil {
		t.Fatalf("write .env: %v", err)
	}

	sc := &scenario.Scenario{
		Name:      "Env Secrets Flow",
		BaseURL:   srv.URL,
		SourceDir: dir,
		Steps: []scenario.Step{
			{
				ID:     "secured",
				Method: "GET",
				Path:   "/private",
				Headers: map[string]string{
					"Authorization": "Bearer {{env.API_SECRET}}",
				},
				Assert: &scenario.Assertion{Status: 200},
			},
		},
	}

	var out bytes.Buffer
	exec := client.NewExecutor(2)
	defer exec.Close()
	runner := NewRunner(exec, stream.NewWriter(&out, nil, false))

	finished, err := runner.Run(context.Background(), sc, Options{Mode: scenario.ModeSmoke})
	if err != nil {
		t.Fatalf("smoke run with .env failed: %v", err)
	}
	if !finished.PassedThresholds || finished.TotalErrors != 0 || finished.TotalRequests != 1 {
		t.Fatalf("unexpected finished summary: %+v", finished)
	}
}

func parseNDJSONLines(t *testing.T, raw string) []map[string]any {
	t.Helper()
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		t.Fatal("expected non-empty NDJSON output")
	}
	rows := strings.Split(trimmed, "\n")
	parsed := make([]map[string]any, 0, len(rows))
	for i, row := range rows {
		var m map[string]any
		if err := json.Unmarshal([]byte(row), &m); err != nil {
			t.Fatalf("line %d is invalid JSON (%q): %v", i+1, row, err)
		}
		parsed = append(parsed, m)
	}
	return parsed
}
