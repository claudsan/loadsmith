package loadgen

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"loadsmith/engine/internal/client"
	"loadsmith/engine/internal/metrics"
	"loadsmith/engine/internal/scenario"
	"loadsmith/engine/internal/stream"
)

// DefaultWindow is the default interval between METRIC_TICK emissions during load runs.
const DefaultWindow = 500 * time.Millisecond

// Options configures a smoke or load run execution.
type Options struct {
	Mode            string
	Window          time.Duration
	SmokeIterations int
	RunID           string
}

// Runner orchestrates smoke and concurrent load executions and emits NDJSON telemetry.
type Runner struct {
	exec   *client.Executor
	writer *stream.Writer
}

// NewRunner builds a Runner wired to an HTTP Executor and NDJSON Writer.
func NewRunner(exec *client.Executor, writer *stream.Writer) *Runner {
	return &Runner{
		exec:   exec,
		writer: writer,
	}
}

// Run validates the scenario for opts.Mode, runs the workload, and emits RUN_STARTED..RUN_FINISHED events.
func (r *Runner) Run(ctx context.Context, sc *scenario.Scenario, opts Options) (stream.RunFinishedEvent, error) {
	if r.exec == nil {
		return stream.RunFinishedEvent{}, errors.New("runner executor must not be nil")
	}
	if r.writer == nil {
		return stream.RunFinishedEvent{}, errors.New("runner writer must not be nil")
	}
	if err := scenario.ValidateForMode(sc, opts.Mode); err != nil {
		return stream.RunFinishedEvent{}, err
	}

	var dataFeed *scenario.DataFeed
	if sc.DataFile != nil && sc.DataFile.Path != "" {
		var err error
		dataFeed, err = scenario.LoadDataFeed(sc.DataFile, sc.SourceDir)
		if err != nil {
			return stream.RunFinishedEvent{}, err
		}
	}

	envVars, err := scenario.LoadEnvVariables(sc)
	if err != nil {
		return stream.RunFinishedEvent{}, err
	}
	baseVars := scenario.MergeVariables(envVars, sc.Variables)

	resolvedBaseURL := sc.BaseURL
	if strings.Contains(sc.BaseURL, "{{") {
		resolvedBaseURL, err = scenario.Interpolate(sc.BaseURL, baseVars)
		if err != nil {
			return stream.RunFinishedEvent{}, fmt.Errorf("interpolate baseUrl: %w", err)
		}
	}

	window := opts.Window
	if window <= 0 {
		window = DefaultWindow
	}

	runID := opts.RunID
	if runID == "" {
		runID = newRunID()
	}

	startedAt := time.Now()
	if err := r.writer.Emit(stream.RunStartedEvent{
		Type:      stream.EventRunStarted,
		RunID:     runID,
		Scenario:  sc.Name,
		Mode:      opts.Mode,
		Timestamp: startedAt.UTC().Format(time.RFC3339Nano),
	}); err != nil {
		return stream.RunFinishedEvent{}, err
	}

	agg := metrics.NewAggregator()

	switch opts.Mode {
	case scenario.ModeSmoke:
		return r.runSmoke(ctx, sc, resolvedBaseURL, baseVars, opts, dataFeed, runID, startedAt, agg)
	case scenario.ModeLoad:
		return r.runLoad(ctx, sc, resolvedBaseURL, baseVars, dataFeed, window, runID, startedAt, agg)
	default:
		return stream.RunFinishedEvent{}, fmt.Errorf("unsupported mode %q", opts.Mode)
	}
}

func (r *Runner) runSmoke(
	ctx context.Context,
	sc *scenario.Scenario,
	baseURL string,
	baseVars map[string]string,
	opts Options,
	dataFeed *scenario.DataFeed,
	runID string,
	startedAt time.Time,
	agg *metrics.Aggregator,
) (stream.RunFinishedEvent, error) {
	iterations := 1
	if opts.SmokeIterations > 0 {
		iterations = opts.SmokeIterations
	} else if sc.Smoke.Iterations > 0 {
		iterations = sc.Smoke.Iterations
	}

	for iter := 0; iter < iterations; iter++ {
		if ctx.Err() != nil {
			finished := agg.Summary(runID, sc.Thresholds)
			finished.PassedThresholds = false
			finished.Violations = append(finished.Violations, fmt.Sprintf("run canceled: %v", ctx.Err()))
			_ = r.writer.Emit(finished)
			return finished, ctx.Err()
		}

		vars := scenario.CloneVariables(baseVars)
		if dataFeed != nil {
			vars = scenario.MergeVariables(vars, dataFeed.Next())
		}
		for _, step := range sc.Steps {
			res := r.exec.ExecuteStep(ctx, baseURL, step, vars)
			emitErr := agg.Record(metrics.Sample{
				StepID:         res.StepID,
				StatusCode:     res.StatusCode,
				DurationMs:     res.DurationMs,
				Err:            res.Err,
				RequestSummary: res.RequestSummary,
			})

			if res.Err != nil {
				if emitErr {
					_ = r.writer.Emit(stream.ErrorSampleEvent{
						Type:           stream.EventErrorSample,
						RunID:          runID,
						Step:           res.StepID,
						StatusCode:     res.StatusCode,
						DurationMs:     round2(res.DurationMs),
						Error:          res.Err.Error(),
						RequestSummary: res.RequestSummary,
					})
				}

				finished := agg.Summary(runID, sc.Thresholds)
				finished.PassedThresholds = false
				finished.Violations = append(
					finished.Violations,
					fmt.Sprintf("smoke failed at step %q (iteration %d): %v", res.StepID, iter+1, res.Err),
				)
				if err := r.writer.Emit(finished); err != nil {
					return finished, err
				}
				return finished, fmt.Errorf("smoke step %q failed: %w", res.StepID, res.Err)
			}

			for k, v := range res.Extracted {
				vars[k] = v
			}
		}
	}

	elapsed := time.Since(startedAt)
	if elapsed <= 0 {
		elapsed = time.Millisecond
	}
	if err := r.writer.Emit(agg.SnapshotWindow(runID, elapsed.Milliseconds(), 1, elapsed)); err != nil {
		return stream.RunFinishedEvent{}, err
	}

	finished := agg.Summary(runID, sc.Thresholds)
	if err := r.writer.Emit(finished); err != nil {
		return finished, err
	}
	return finished, nil
}

func (r *Runner) runLoad(
	ctx context.Context,
	sc *scenario.Scenario,
	baseURL string,
	baseVars map[string]string,
	dataFeed *scenario.DataFeed,
	window time.Duration,
	runID string,
	startedAt time.Time,
	agg *metrics.Aggregator,
) (stream.RunFinishedEvent, error) {
	totalDuration, err := sc.Load.TotalDuration()
	if err != nil {
		return stream.RunFinishedEvent{}, err
	}
	rampUp, err := sc.Load.RampUpDuration()
	if err != nil {
		return stream.RunFinishedEvent{}, err
	}
	thinkTime := sc.Load.ThinkTime()

	runCtx, cancelRun := context.WithTimeout(ctx, totalDuration)
	defer cancelRun()

	var activeVUs atomic.Int64

	stopTicks := make(chan struct{})
	ticksDone := make(chan struct{})
	go func() {
		defer close(ticksDone)
		ticker := time.NewTicker(window)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				tick := agg.SnapshotWindow(runID, time.Since(startedAt).Milliseconds(), int(activeVUs.Load()), window)
				_ = r.writer.Emit(tick)
			case <-stopTicks:
				return
			}
		}
	}()

	var wg sync.WaitGroup
	vus := sc.Load.VUs
	for i := 0; i < vus; i++ {
		var delay time.Duration
		if rampUp > 0 && vus > 1 {
			delay = time.Duration(i) * rampUp / time.Duration(vus)
		}

		wg.Add(1)
		go func(startDelay time.Duration) {
			defer wg.Done()

			if startDelay > 0 {
				if !sleepWithContext(runCtx, startDelay) {
					return
				}
			}

			activeVUs.Add(1)
			defer activeVUs.Add(-1)

			for runCtx.Err() == nil {
				vars := scenario.CloneVariables(baseVars)
				if dataFeed != nil {
					vars = scenario.MergeVariables(vars, dataFeed.Next())
				}
				for _, step := range sc.Steps {
					if runCtx.Err() != nil {
						break
					}
					res := r.exec.ExecuteStep(runCtx, baseURL, step, vars)
					// Ignore cancellation/deadline errors caused by the load test duration ending or user interrupt.
					if res.Err != nil && runCtx.Err() != nil && (errors.Is(res.Err, context.Canceled) || errors.Is(res.Err, context.DeadlineExceeded)) {
						break
					}

					emitErr := agg.Record(metrics.Sample{
						StepID:         res.StepID,
						StatusCode:     res.StatusCode,
						DurationMs:     res.DurationMs,
						Err:            res.Err,
						RequestSummary: res.RequestSummary,
					})
					if res.Err != nil {
						if emitErr {
							_ = r.writer.Emit(stream.ErrorSampleEvent{
								Type:           stream.EventErrorSample,
								RunID:          runID,
								Step:           res.StepID,
								StatusCode:     res.StatusCode,
								DurationMs:     round2(res.DurationMs),
								Error:          res.Err.Error(),
								RequestSummary: res.RequestSummary,
							})
						}
						break
					}

					for k, v := range res.Extracted {
						vars[k] = v
					}
				}

				if thinkTime > 0 && !sleepWithContext(runCtx, thinkTime) {
					return
				}
			}
		}(delay)
	}

	wg.Wait()
	close(stopTicks)
	<-ticksDone

	if agg.HasPendingWindowSamples() {
		rem := time.Since(startedAt) % window
		if rem <= 0 {
			rem = window
		}
		_ = r.writer.Emit(agg.SnapshotWindow(runID, time.Since(startedAt).Milliseconds(), 0, rem))
	}

	finished := agg.Summary(runID, sc.Thresholds)
	if ctx.Err() != nil {
		finished.PassedThresholds = false
		finished.Violations = append(finished.Violations, fmt.Sprintf("run interrupted: %v", ctx.Err()))
	}

	if err := r.writer.Emit(finished); err != nil {
		return finished, err
	}
	return finished, nil
}

func sleepWithContext(ctx context.Context, d time.Duration) bool {
	if d <= 0 {
		return ctx.Err() == nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		return false
	}
}

func newRunID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("run-%d", time.Now().UnixNano())
	}
	return "run-" + hex.EncodeToString(b[:])
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
