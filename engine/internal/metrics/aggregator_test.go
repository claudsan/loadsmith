package metrics

import (
	"errors"
	"math"
	"sync"
	"testing"
	"time"

	"loadsmith/engine/internal/scenario"
)

func TestPercentileAccuracyAndImmutability(t *testing.T) {
	raw := []float64{50, 10, 40, 20, 30}
	p50 := Percentile(raw, 50)
	p95 := Percentile(raw, 95)
	p99 := Percentile(raw, 99)

	if math.Abs(p50-30.0) > 1e-6 {
		t.Fatalf("expected p50=30, got %.4f", p50)
	}
	if math.Abs(p95-48.0) > 1e-6 {
		t.Fatalf("expected p95=48, got %.4f", p95)
	}
	if math.Abs(p99-49.6) > 1e-6 {
		t.Fatalf("expected p99=49.6, got %.4f", p99)
	}
	if raw[0] != 50 || raw[1] != 10 {
		t.Fatal("Percentile mutated caller slice")
	}
	if Percentile(nil, 95) != 0 {
		t.Fatal("expected 0 for empty slice")
	}
}

func TestWindowSnapshotAndErrorSampleCap(t *testing.T) {
	agg := NewAggregator()

	emitted := 0
	for i := 0; i < 40; i++ {
		if agg.Record(Sample{
			StepID:         "failStep",
			StatusCode:     500,
			DurationMs:     float64(i + 1),
			Err:            errors.New("boom"),
			RequestSummary: "GET /fail",
		}) {
			emitted++
		}
	}
	if emitted != MaxErrorSamples {
		t.Fatalf("expected exactly %d emitted error samples, got %d", MaxErrorSamples, emitted)
	}

	for i := 0; i < 10; i++ {
		if agg.Record(Sample{
			StepID:         "okStep",
			StatusCode:     200,
			DurationMs:     10,
			RequestSummary: "GET /ok",
		}) {
			t.Fatal("success sample must not trigger ERROR_SAMPLE")
		}
	}

	tick := agg.SnapshotWindow("run-1", 500, 4, 500*time.Millisecond)
	if tick.Successes != 10 || tick.Errors != 40 {
		t.Fatalf("unexpected counts ok=%d err=%d", tick.Successes, tick.Errors)
	}
	if math.Abs(tick.RPS-100.0) > 0.01 {
		t.Fatalf("expected RPS=100, got %.2f", tick.RPS)
	}
	if agg.HasPendingWindowSamples() {
		t.Fatal("expected window counters to be reset after snapshot")
	}

	tick2 := agg.SnapshotWindow("run-1", 1000, 4, 500*time.Millisecond)
	if tick2.Successes != 0 || tick2.Errors != 0 || tick2.RPS != 0 {
		t.Fatalf("expected zeroed second window, got %+v", tick2)
	}
}

func TestEvaluateThresholdsAndConcurrentRecord(t *testing.T) {
	p95Limit := 100.0
	zeroErr := 0.0

	passed, violations := EvaluateThresholds(scenario.Thresholds{
		P95Ms:           &p95Limit,
		MaxErrorRatePct: &zeroErr,
	}, 90.0, 0.0)
	if !passed || len(violations) != 0 || violations == nil {
		t.Fatalf("expected pass with non-nil empty violations, got passed=%v violations=%#v", passed, violations)
	}

	passedFail, violationsFail := EvaluateThresholds(scenario.Thresholds{
		P95Ms:           &p95Limit,
		MaxErrorRatePct: &zeroErr,
	}, 120.5, 0.5)
	if passedFail || len(violationsFail) != 2 {
		t.Fatalf("expected 2 threshold violations, got passed=%v violations=%v", passedFail, violationsFail)
	}

	agg := NewAggregator()
	var wg sync.WaitGroup
	for g := 0; g < 8; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				agg.Record(Sample{StepID: "s", StatusCode: 200, DurationMs: 12.5})
			}
		}()
	}
	wg.Wait()

	summary := agg.Summary("run-concurrent", scenario.Thresholds{P95Ms: &p95Limit})
	if summary.TotalRequests != 800 || summary.TotalErrors != 0 || !summary.PassedThresholds {
		t.Fatalf("unexpected concurrent summary: %+v", summary)
	}
}
