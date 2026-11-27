package stream

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"sync"
)

const (
	EventRunStarted  = "RUN_STARTED"
	EventMetricTick  = "METRIC_TICK"
	EventErrorSample = "ERROR_SAMPLE"
	EventRunFinished = "RUN_FINISHED"
)

// RunStartedEvent is emitted once at the beginning of a smoke or load run.
type RunStartedEvent struct {
	Type      string `json:"type"`
	RunID     string `json:"runId"`
	Scenario  string `json:"scenario"`
	Mode      string `json:"mode"`
	Timestamp string `json:"timestamp"`
}

// MetricTickEvent is emitted periodically during load runs and at completion of a run.
type MetricTickEvent struct {
	Type      string  `json:"type"`
	RunID     string  `json:"runId"`
	ElapsedMs int64   `json:"elapsedMs"`
	ActiveVUs int     `json:"activeVus"`
	RPS       float64 `json:"rps"`
	P50Ms     float64 `json:"p50Ms"`
	P95Ms     float64 `json:"p95Ms"`
	P99Ms     float64 `json:"p99Ms"`
	Successes int64   `json:"successes"`
	Errors    int64   `json:"errors"`
}

// ErrorSampleEvent captures a single failed request sample (capped at 25 per run).
type ErrorSampleEvent struct {
	Type           string  `json:"type"`
	RunID          string  `json:"runId"`
	Step           string  `json:"step"`
	StatusCode     int     `json:"statusCode"`
	DurationMs     float64 `json:"durationMs"`
	Error          string  `json:"error"`
	RequestSummary string  `json:"requestSummary"`
}

// RunFinishedEvent is emitted once when the run completes or is canceled.
type RunFinishedEvent struct {
	Type             string   `json:"type"`
	RunID            string   `json:"runId"`
	TotalRequests    int64    `json:"totalRequests"`
	TotalErrors      int64    `json:"totalErrors"`
	ErrorRatePct     float64  `json:"errorRatePct"`
	P95Ms            float64  `json:"p95Ms"`
	PassedThresholds bool     `json:"passedThresholds"`
	Violations       []string `json:"violations"`
}

// Writer emits strict single-line NDJSON events to out and optional pretty summaries to errOut.
type Writer struct {
	mu     sync.Mutex
	out    io.Writer
	errOut io.Writer
	pretty bool
}

// NewWriter creates a thread-safe NDJSON stream writer.
func NewWriter(out, errOut io.Writer, pretty bool) *Writer {
	return &Writer{
		out:    out,
		errOut: errOut,
		pretty: pretty,
	}
}

// Emit serializes event as one JSON line to stdout and optionally logs a readable line to stderr.
func (w *Writer) Emit(event any) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal stream event: %w", err)
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	if w.out != nil {
		if _, err := w.out.Write(append(payload, '\n')); err != nil {
			return fmt.Errorf("write NDJSON event: %w", err)
		}
	}

	if w.pretty && w.errOut != nil {
		if line := formatPretty(event); line != "" {
			_, _ = fmt.Fprintln(w.errOut, line)
		}
	}
	return nil
}

func formatPretty(event any) string {
	switch ev := event.(type) {
	case RunStartedEvent:
		return formatStarted(ev)
	case *RunStartedEvent:
		if ev != nil {
			return formatStarted(*ev)
		}
	case MetricTickEvent:
		return formatTick(ev)
	case *MetricTickEvent:
		if ev != nil {
			return formatTick(*ev)
		}
	case ErrorSampleEvent:
		return formatErrorSample(ev)
	case *ErrorSampleEvent:
		if ev != nil {
			return formatErrorSample(*ev)
		}
	case RunFinishedEvent:
		return formatFinished(ev)
	case *RunFinishedEvent:
		if ev != nil {
			return formatFinished(*ev)
		}
	}
	return ""
}

func formatStarted(ev RunStartedEvent) string {
	return fmt.Sprintf("[START] run=%s mode=%s scenario=%q at=%s", ev.RunID, ev.Mode, ev.Scenario, ev.Timestamp)
}

func formatTick(ev MetricTickEvent) string {
	return fmt.Sprintf(
		"[TICK]  t=%dms vus=%d rps=%.2f ok=%d err=%d p50=%.2fms p95=%.2fms p99=%.2fms",
		ev.ElapsedMs, ev.ActiveVUs, ev.RPS, ev.Successes, ev.Errors, ev.P50Ms, ev.P95Ms, ev.P99Ms,
	)
}

func formatErrorSample(ev ErrorSampleEvent) string {
	return fmt.Sprintf(
		"[ERROR] step=%s req=%q status=%d dur=%.2fms err=%s",
		ev.Step, ev.RequestSummary, ev.StatusCode, ev.DurationMs, ev.Error,
	)
}

func formatFinished(ev RunFinishedEvent) string {
	status := "PASS"
	if !ev.PassedThresholds {
		status = "FAIL"
	}
	summary := fmt.Sprintf(
		"[DONE]  status=%s total=%d errors=%d errRate=%.2f%% p95=%.2fms",
		status, ev.TotalRequests, ev.TotalErrors, ev.ErrorRatePct, ev.P95Ms,
	)
	if len(ev.Violations) > 0 {
		summary += " violations=[" + strings.Join(ev.Violations, "; ") + "]"
	}
	return summary
}
