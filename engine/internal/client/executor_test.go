package client

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"loadsmith/engine/internal/scenario"
)

func TestExecuteStepExtractionAndAssertions(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/orders" || r.URL.Query().Get("dryRun") != "true" {
			http.NotFound(w, r)
			return
		}
		if r.Header.Get("Authorization") != "Bearer tok-123" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		var payload map[string]any
		if err := json.Unmarshal(raw, &payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{
			"data": {
				"id": 987654321012345,
				"tags": [{"name": "priority"}],
				"active": true
			}
		}`))
	}))
	defer srv.Close()

	exec := NewExecutor(4)
	defer exec.Close()

	vars := map[string]string{
		"token": "tok-123",
		"sku":   "SKU-1",
	}
	step := scenario.Step{
		ID:     "create",
		Name:   "Create Order",
		Method: "POST",
		Path:   "/orders?dryRun=true",
		Headers: map[string]string{
			"Authorization": "Bearer {{token}}",
		},
		Body: map[string]any{
			"sku": "{{sku}}",
		},
		Extract: map[string]string{
			"orderId": "data.id",
			"tagName": "$.data.tags[0].name",
			"active":  "data.active",
		},
		Assert: &scenario.Assertion{
			Status:        201,
			BodyContains:  "priority",
			MaxDurationMs: 2000,
		},
	}

	res := exec.ExecuteStep(context.Background(), srv.URL, step, vars)
	if res.Err != nil {
		t.Fatalf("ExecuteStep failed: %v", res.Err)
	}
	if res.StatusCode != 201 {
		t.Fatalf("expected 201, got %d", res.StatusCode)
	}
	if res.Extracted["orderId"] != "987654321012345" {
		t.Fatalf("expected exact large int string, got %q", res.Extracted["orderId"])
	}
	if res.Extracted["tagName"] != "priority" || res.Extracted["active"] != "true" {
		t.Fatalf("unexpected extracted values: %+v", res.Extracted)
	}
}

func TestExecuteStepTimeoutAndAssertionFailures(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/slow":
			time.Sleep(150 * time.Millisecond)
			w.WriteHeader(http.StatusOK)
		case "/bad-body":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"nope"}`))
		case "/err-500":
			w.WriteHeader(http.StatusInternalServerError)
		}
	}))
	defer srv.Close()

	exec := NewExecutor(2)
	defer exec.Close()

	resTimeout := exec.ExecuteStep(context.Background(), srv.URL, scenario.Step{
		ID:        "slow",
		Method:    "GET",
		Path:      "/slow",
		TimeoutMs: 40,
	}, map[string]string{})
	if resTimeout.Err == nil {
		t.Fatal("expected timeout error")
	}

	resBody := exec.ExecuteStep(context.Background(), srv.URL, scenario.Step{
		ID:     "body",
		Method: "GET",
		Path:   "/bad-body",
		Assert: &scenario.Assertion{Status: 200, BodyContains: "expected-text"},
	}, map[string]string{})
	if resBody.Err == nil || !strings.Contains(resBody.Err.Error(), "does not contain") {
		t.Fatalf("expected bodyContains error, got %v", resBody.Err)
	}

	res500 := exec.ExecuteStep(context.Background(), srv.URL, scenario.Step{
		ID:     "s500",
		Method: "GET",
		Path:   "/err-500",
	}, map[string]string{})
	if res500.Err == nil || res500.StatusCode != 500 {
		t.Fatalf("expected 500 error, got status=%d err=%v", res500.StatusCode, res500.Err)
	}
}

func TestExtractJSONPathEdgeCases(t *testing.T) {
	payload := []byte(`{"items":[{"id":"a"},{"id":"b"}],"empty":null,"nested":{"ok":1}}`)

	val, err := ExtractJSONPath(payload, "items.1.id")
	if err != nil || val != "b" {
		t.Fatalf("expected 'b', got val=%q err=%v", val, err)
	}
	if _, err := ExtractJSONPath(payload, "items[5].id"); err == nil {
		t.Fatal("expected out-of-bounds error")
	}
	if _, err := ExtractJSONPath(payload, "empty"); err == nil {
		t.Fatal("expected null extraction error")
	}
	if _, err := ExtractJSONPath(payload, "nested"); err == nil {
		t.Fatal("expected non-scalar extraction error")
	}
}

func TestExecuteStepSelfSignedTLS(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"tls":"ok"}`))
	}))
	defer srv.Close()

	step := scenario.Step{
		ID:     "tls-health",
		Method: "GET",
		Path:   "/health",
		Assert: &scenario.Assertion{Status: 200},
	}

	strictExec := NewExecutorWithOptions(2, ExecutorOptions{InsecureSkipVerify: false})
	defer strictExec.Close()
	strictRes := strictExec.ExecuteStep(context.Background(), srv.URL, step, map[string]string{})
	if strictRes.Err == nil {
		t.Fatal("expected TLS verification failure for self-signed cert when InsecureSkipVerify is false")
	}

	insecureExec := NewExecutorWithOptions(2, ExecutorOptions{InsecureSkipVerify: true})
	defer insecureExec.Close()
	insecureRes := insecureExec.ExecuteStep(context.Background(), srv.URL, step, map[string]string{})
	if insecureRes.Err != nil || insecureRes.StatusCode != 200 {
		t.Fatalf("expected 200 OK when InsecureSkipVerify is true, got status=%d err=%v", insecureRes.StatusCode, insecureRes.Err)
	}
}
