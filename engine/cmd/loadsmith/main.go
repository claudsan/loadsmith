package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"loadsmith/engine/internal/client"
	"loadsmith/engine/internal/loadgen"
	"loadsmith/engine/internal/scenario"
	"loadsmith/engine/internal/stream"
)

func main() {
	os.Exit(run())
}

func run() int {
	var (
		scenarioPath = flag.String("scenario", "", "Path to the YAML or JSON scenario file")
		mode         = flag.String("mode", scenario.ModeSmoke, "Execution mode: smoke or load")
		window       = flag.Duration("window", loadgen.DefaultWindow, "Metric aggregation window for load mode")
		pretty       = flag.Bool("pretty", false, "Print human-readable summary lines to stderr while keeping stdout pure NDJSON")
		iterations   = flag.Int("iterations", 0, "Override smoke mode iteration count (0 uses scenario value or 1)")
	)
	flag.Parse()

	if strings.TrimSpace(*scenarioPath) == "" {
		fmt.Fprintln(os.Stderr, "error: --scenario flag is required")
		flag.Usage()
		return 2
	}
	if *window <= 0 {
		fmt.Fprintln(os.Stderr, "error: --window must be > 0")
		return 2
	}

	sc, err := scenario.Load(*scenarioPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error loading scenario: %v\n", err)
		return 1
	}

	if err := scenario.ValidateForMode(sc, *mode); err != nil {
		fmt.Fprintf(os.Stderr, "error validating scenario for mode %q: %v\n", *mode, err)
		return 1
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Allow graceful STOP commands via piped stdin (helpful for desktop sidecar control on Windows).
	watchStdinStop(ctx, stop)

	maxConns := sc.Load.VUs
	if maxConns < 10 {
		maxConns = 10
	}
	exec := client.NewExecutorWithOptions(maxConns, client.ExecutorOptions{
		InsecureSkipVerify: sc.InsecureSkipVerify,
	})
	defer exec.Close()

	writer := stream.NewWriter(os.Stdout, os.Stderr, *pretty)
	runner := loadgen.NewRunner(exec, writer)

	finished, runErr := runner.Run(ctx, sc, loadgen.Options{
		Mode:            *mode,
		Window:          *window,
		SmokeIterations: *iterations,
	})

	if ctx.Err() != nil {
		return 130
	}
	if runErr != nil {
		fmt.Fprintf(os.Stderr, "run failed: %v\n", runErr)
		return 1
	}
	if !finished.PassedThresholds {
		return 1
	}
	return 0
}

func watchStdinStop(ctx context.Context, cancel context.CancelFunc) {
	info, err := os.Stdin.Stat()
	if err != nil {
		return
	}
	// Only watch stdin when piped (not an interactive terminal). EOF does not cancel the run.
	if (info.Mode() & os.ModeCharDevice) != 0 {
		return
	}

	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			if ctx.Err() != nil {
				return
			}
			if strings.EqualFold(strings.TrimSpace(scanner.Text()), "STOP") {
				cancel()
				return
			}
		}
	}()
}
