package metrics

import (
	"fmt"
	"math"
	"sort"
	"sync"
	"time"

	"loadsmith/engine/internal/scenario"
	"loadsmith/engine/internal/stream"
)

const (
	// MaxErrorSamples caps ERROR_SAMPLE events emitted per run.
	MaxErrorSamples = 25
	// maxGlobalLatencies bounds memory usage during long high-RPS load runs.
	maxGlobalLatencies = 500_000
)

// Sample represents the outcome of a single HTTP step execution.
type Sample struct {
	StepID         string
	StatusCode     int
	DurationMs     float64
	Err            error
	RequestSummary string
}

// Aggregator collects thread-safe step metrics for time-window ticks and final SLA evaluation.
type Aggregator struct {
	mu sync.Mutex

	windowLatencies []float64
	windowSuccesses int64
	windowErrors    int64

	totalRequests       int64
	totalErrors         int64
	allLatencies        []float64
	errorSamplesEmitted int
	rngState            uint64
}

// NewAggregator constructs an initialized metrics Aggregator.
func NewAggregator() *Aggregator {
	return &Aggregator{
		windowLatencies: make([]float64, 0, 256),
		allLatencies:    make([]float64, 0, 1024),
		rngState:        0x9e3779b97f4a7c15,
	}
}

// Record stores a step execution sample and returns true if an ERROR_SAMPLE event should be emitted.
func (a *Aggregator) Record(s Sample) bool {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.totalRequests++
	a.windowLatencies = append(a.windowLatencies, s.DurationMs)
	a.recordGlobalLatency(s.DurationMs)

	if s.Err == nil {
		a.windowSuccesses++
		return false
	}

	a.totalErrors++
	a.windowErrors++
	if a.errorSamplesEmitted < MaxErrorSamples {
		a.errorSamplesEmitted++
		return true
	}
	return false
}

func (a *Aggregator) recordGlobalLatency(d float64) {
	if len(a.allLatencies) < maxGlobalLatencies {
		a.allLatencies = append(a.allLatencies, d)
		return
	}
	// Deterministic Vitter-style reservoir replacement when > 500k samples.
	idx := a.nextRand() % uint64(a.totalRequests)
	if idx < maxGlobalLatencies {
		a.allLatencies[idx] = d
	}
}

func (a *Aggregator) nextRand() uint64 {
	// xorshift64*
	x := a.rngState
	x ^= x >> 12
	x ^= x << 25
	x ^= x >> 27
	a.rngState = x
	return x * 0x2545F4914F6CDD1D
}

// HasPendingWindowSamples reports whether the current un-flushed window has recorded requests.
func (a *Aggregator) HasPendingWindowSamples() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.windowSuccesses > 0 || a.windowErrors > 0
}

// SnapshotWindow drains the current window counters and returns a MetricTickEvent.
func (a *Aggregator) SnapshotWindow(runID string, elapsedMs int64, activeVUs int, window time.Duration) stream.MetricTickEvent {
	a.mu.Lock()
	latencies := a.windowLatencies
	successes := a.windowSuccesses
	errorsCount := a.windowErrors

	a.windowLatencies = make([]float64, 0, cap(latencies))
	a.windowSuccesses = 0
	a.windowErrors = 0
	a.mu.Unlock()

	totalWindow := successes + errorsCount
	windowSeconds := window.Seconds()
	var rps float64
	if windowSeconds > 0 {
		rps = float64(totalWindow) / windowSeconds
	}

	sort.Float64s(latencies)
	return stream.MetricTickEvent{
		Type:      stream.EventMetricTick,
		RunID:     runID,
		ElapsedMs: elapsedMs,
		ActiveVUs: activeVUs,
		RPS:       round2(rps),
		P50Ms:     round2(percentileSorted(latencies, 50)),
		P95Ms:     round2(percentileSorted(latencies, 95)),
		P99Ms:     round2(percentileSorted(latencies, 99)),
		Successes: successes,
		Errors:    errorsCount,
	}
}

// Summary computes global run metrics and evaluates scenario thresholds.
func (a *Aggregator) Summary(runID string, t scenario.Thresholds) stream.RunFinishedEvent {
	a.mu.Lock()
	totalReq := a.totalRequests
	totalErr := a.totalErrors
	latencies := make([]float64, len(a.allLatencies))
	copy(latencies, a.allLatencies)
	a.mu.Unlock()

	var errorRatePct float64
	if totalReq > 0 {
		errorRatePct = (float64(totalErr) / float64(totalReq)) * 100.0
	}

	p95 := round2(Percentile(latencies, 95))
	errorRateRounded := round2(errorRatePct)
	passed, violations := EvaluateThresholds(t, p95, errorRateRounded)

	return stream.RunFinishedEvent{
		Type:             stream.EventRunFinished,
		RunID:            runID,
		TotalRequests:    totalReq,
		TotalErrors:      totalErr,
		ErrorRatePct:     errorRateRounded,
		P95Ms:            p95,
		PassedThresholds: passed,
		Violations:       violations,
	}
}

// Percentile computes the p-th percentile (0..100) using linear interpolation without mutating values.
func Percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)
	return percentileSorted(sorted, p)
}

func percentileSorted(sorted []float64, p float64) float64 {
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n == 1 || p <= 0 {
		return sorted[0]
	}
	if p >= 100 {
		return sorted[n-1]
	}

	rank := (p / 100.0) * float64(n-1)
	lower := int(math.Floor(rank))
	upper := int(math.Ceil(rank))
	if lower == upper {
		return sorted[lower]
	}
	weight := rank - float64(lower)
	return sorted[lower]*(1.0-weight) + sorted[upper]*weight
}

// EvaluateThresholds validates computed p95 latency and error rate against configured SLAs.
func EvaluateThresholds(t scenario.Thresholds, p95Ms, errorRatePct float64) (bool, []string) {
	violations := make([]string, 0)
	if t.P95Ms != nil && p95Ms > *t.P95Ms {
		violations = append(violations, fmt.Sprintf("p95Ms %.2fms exceeded threshold %.2fms", p95Ms, *t.P95Ms))
	}
	if t.MaxErrorRatePct != nil && errorRatePct > *t.MaxErrorRatePct {
		violations = append(violations, fmt.Sprintf("errorRatePct %.2f%% exceeded threshold %.2f%%", errorRatePct, *t.MaxErrorRatePct))
	}
	return len(violations) == 0, violations
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
