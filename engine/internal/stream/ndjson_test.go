package stream

import (
	"bytes"
	"encoding/json"
	"strings"
	"sync"
	"testing"
)

func TestWriterConcurrentEmitAndPrettySeparation(t *testing.T) {
	var stdout, stderr bytes.Buffer
	w := NewWriter(&stdout, &stderr, true)

	const workers = 12
	const perWorker = 20

	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < perWorker; j++ {
				if err := w.Emit(MetricTickEvent{
					Type:      EventMetricTick,
					RunID:     "run-concurrent",
					ElapsedMs: int64(j * 100),
					ActiveVUs: id + 1,
					RPS:       42.5,
					P50Ms:     5.1,
					P95Ms:     12.3,
					P99Ms:     18.9,
					Successes: 10,
					Errors:    0,
				}); err != nil {
					t.Errorf("Emit failed: %v", err)
				}
			}
		}(i)
	}
	wg.Wait()

	if err := w.Emit(RunFinishedEvent{
		Type:             EventRunFinished,
		RunID:            "run-concurrent",
		TotalRequests:    workers * perWorker,
		TotalErrors:      0,
		ErrorRatePct:     0,
		P95Ms:            12.3,
		PassedThresholds: true,
		Violations:       []string{},
	}); err != nil {
		t.Fatalf("Emit RunFinished failed: %v", err)
	}

	outLines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
	expectedLines := workers*perWorker + 1
	if len(outLines) != expectedLines {
		t.Fatalf("expected %d NDJSON lines, got %d", expectedLines, len(outLines))
	}

	for idx, line := range outLines {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(line), &parsed); err != nil {
			t.Fatalf("stdout line %d is not valid JSON (%q): %v", idx+1, line, err)
		}
		if strings.HasPrefix(line, "[") {
			t.Fatalf("pretty output leaked into stdout on line %d: %q", idx+1, line)
		}
	}

	lastLine := outLines[len(outLines)-1]
	if !strings.Contains(lastLine, `"violations":[]`) {
		t.Fatalf("expected empty violations array [], got %q", lastLine)
	}

	errLines := strings.Split(strings.TrimSpace(stderr.String()), "\n")
	if len(errLines) != expectedLines {
		t.Fatalf("expected %d pretty lines in stderr, got %d", expectedLines, len(errLines))
	}
	if !strings.Contains(errLines[len(errLines)-1], "[DONE]  status=PASS") {
		t.Fatalf("unexpected final pretty line: %q", errLines[len(errLines)-1])
	}
}
