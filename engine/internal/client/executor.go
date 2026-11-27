package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"loadsmith/engine/internal/scenario"
)

const (
	// DefaultTimeout is applied per step when step.TimeoutMs is omitted or zero.
	DefaultTimeout = 10 * time.Second
	// MaxResponseBodyBytes bounds how much response payload is buffered for assertions and extraction.
	MaxResponseBodyBytes = 4 << 20 // 4 MiB
)

// ExecutorOptions customizes transport behavior for an Executor instance.
type ExecutorOptions struct {
	InsecureSkipVerify bool
}

// Executor performs HTTP requests over a shared, leak-free connection pool.
type Executor struct {
	httpClient *http.Client
	transport  *http.Transport
}

// NewExecutor creates an Executor tuned for concurrent load generation.
func NewExecutor(maxConns int) *Executor {
	return NewExecutorWithOptions(maxConns, ExecutorOptions{})
}

// NewExecutorWithOptions creates an Executor tuned for concurrent load generation with custom TLS options.
func NewExecutorWithOptions(maxConns int, opts ExecutorOptions) *Executor {
	idlePerHost := maxConns * 2
	if idlePerHost < 100 {
		idlePerHost = 100
	}

	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          idlePerHost * 2,
		MaxIdleConnsPerHost:   idlePerHost,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
	if opts.InsecureSkipVerify {
		transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}

	return &Executor{
		transport: transport,
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   0, // Enforced per step via context.WithTimeout
		},
	}
}

// Close releases idle pooled HTTP connections.
func (e *Executor) Close() {
	if e != nil && e.transport != nil {
		e.transport.CloseIdleConnections()
	}
}

// StepResult describes the outcome, timing, and extracted variables of a step execution.
type StepResult struct {
	StepID         string
	StepName       string
	Method         string
	Path           string
	RequestSummary string
	StatusCode     int
	DurationMs     float64
	Extracted      map[string]string
	Err            error
}

// ExecuteStep interpolates the step, sends the HTTP request, validates assertions, and extracts variables.
func (e *Executor) ExecuteStep(ctx context.Context, baseURL string, step scenario.Step, vars map[string]string) StepResult {
	res := StepResult{
		StepID:   step.ID,
		StepName: step.Name,
		Method:   step.Method,
	}

	interpolatedPath, err := scenario.Interpolate(step.Path, vars)
	if err != nil {
		res.Path = step.Path
		res.RequestSummary = step.Method + " " + step.Path
		res.Err = fmt.Errorf("interpolate path: %w", err)
		return res
	}
	res.Path = interpolatedPath
	res.RequestSummary = step.Method + " " + interpolatedPath

	fullURL := joinURL(baseURL, interpolatedPath)

	bodyBytes, contentTypeDefault, err := buildRequestBody(step.Body, vars)
	if err != nil {
		res.Err = fmt.Errorf("build request body: %w", err)
		return res
	}

	timeout := DefaultTimeout
	if step.TimeoutMs > 0 {
		timeout = time.Duration(step.TimeoutMs) * time.Millisecond
	}
	stepCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	var bodyReader io.Reader
	if bodyBytes != nil {
		bodyReader = bytes.NewReader(bodyBytes)
	}

	req, err := http.NewRequestWithContext(stepCtx, step.Method, fullURL, bodyReader)
	if err != nil {
		res.Err = fmt.Errorf("create HTTP request: %w", err)
		return res
	}

	hasContentType := false
	for k, v := range step.Headers {
		resolvedVal, err := scenario.Interpolate(v, vars)
		if err != nil {
			res.Err = fmt.Errorf("interpolate header %q: %w", k, err)
			return res
		}
		req.Header.Set(k, resolvedVal)
		if strings.EqualFold(k, "Content-Type") {
			hasContentType = true
		}
	}
	if bodyBytes != nil && !hasContentType && contentTypeDefault != "" {
		req.Header.Set("Content-Type", contentTypeDefault)
	}

	start := time.Now()
	resp, err := e.httpClient.Do(req)
	res.DurationMs = float64(time.Since(start).Microseconds()) / 1000.0
	if err != nil {
		res.Err = err
		return res
	}

	respBody, readErr := readAndDrainBody(resp.Body)
	res.StatusCode = resp.StatusCode
	if readErr != nil {
		res.Err = fmt.Errorf("read response body: %w", readErr)
		return res
	}

	if err := evaluateAssertions(step.Assert, resp.StatusCode, respBody, res.DurationMs, vars); err != nil {
		res.Err = err
		return res
	}

	if len(step.Extract) > 0 {
		extracted := make(map[string]string, len(step.Extract))
		for varName, expr := range step.Extract {
			val, err := ExtractJSONPath(respBody, expr)
			if err != nil {
				res.Err = fmt.Errorf("extract %q (%s): %w", varName, expr, err)
				return res
			}
			extracted[varName] = val
		}
		res.Extracted = extracted
	}

	return res
}

func joinURL(baseURL, path string) string {
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	base := strings.TrimRight(baseURL, "/")
	if path == "" || path == "/" {
		return base + "/"
	}
	if strings.HasPrefix(path, "?") {
		return base + path
	}
	return base + "/" + strings.TrimLeft(path, "/")
}

func buildRequestBody(raw any, vars map[string]string) ([]byte, string, error) {
	if raw == nil {
		return nil, "", nil
	}

	resolved, err := scenario.InterpolateAny(raw, vars)
	if err != nil {
		return nil, "", err
	}

	if str, ok := resolved.(string); ok {
		return []byte(str), "text/plain; charset=utf-8", nil
	}

	encoded, err := json.Marshal(resolved)
	if err != nil {
		return nil, "", err
	}
	return encoded, "application/json", nil
}

func readAndDrainBody(body io.ReadCloser) ([]byte, error) {
	if body == nil {
		return nil, nil
	}
	defer body.Close()

	limited := io.LimitReader(body, MaxResponseBodyBytes)
	data, readErr := io.ReadAll(limited)
	// Always drain remaining bytes so HTTP keep-alive connections can be reused cleanly.
	_, _ = io.Copy(io.Discard, body)
	if readErr != nil {
		return nil, readErr
	}
	return data, nil
}

func evaluateAssertions(assert *scenario.Assertion, statusCode int, body []byte, durationMs float64, vars map[string]string) error {
	if assert == nil || assert.Status == 0 {
		if statusCode >= 400 {
			return fmt.Errorf("unexpected HTTP status %d", statusCode)
		}
	}
	if assert == nil {
		return nil
	}

	if assert.Status > 0 && statusCode != assert.Status {
		return fmt.Errorf("expected HTTP status %d, got %d", assert.Status, statusCode)
	}
	if assert.BodyContains != "" {
		expected, err := scenario.Interpolate(assert.BodyContains, vars)
		if err != nil {
			return fmt.Errorf("interpolate assert.bodyContains: %w", err)
		}
		if !bytes.Contains(body, []byte(expected)) {
			return fmt.Errorf("response body does not contain %q", expected)
		}
	}
	if assert.MaxDurationMs > 0 && durationMs > assert.MaxDurationMs {
		return fmt.Errorf("duration %.2fms exceeded maxDurationMs %.2fms", durationMs, assert.MaxDurationMs)
	}
	return nil
}

type pathSegment struct {
	key     string
	index   int
	isIndex bool
}

// ExtractJSONPath extracts a scalar value from a JSON document using dot notation and optional [idx] syntax.
func ExtractJSONPath(body []byte, expr string) (string, error) {
	trimmed := strings.TrimSpace(expr)
	if trimmed == "" {
		return "", errors.New("empty extraction expression")
	}

	dec := json.NewDecoder(bytes.NewReader(body))
	dec.UseNumber()

	var current any
	if err := dec.Decode(&current); err != nil {
		return "", fmt.Errorf("invalid JSON response: %w", err)
	}

	segments, err := parsePath(trimmed)
	if err != nil {
		return "", err
	}

	for _, seg := range segments {
		if seg.isIndex {
			arr, ok := current.([]any)
			if !ok {
				return "", fmt.Errorf("expected JSON array for index [%d]", seg.index)
			}
			if seg.index < 0 || seg.index >= len(arr) {
				return "", fmt.Errorf("array index [%d] out of bounds (len=%d)", seg.index, len(arr))
			}
			current = arr[seg.index]
			continue
		}

		switch node := current.(type) {
		case map[string]any:
			val, exists := node[seg.key]
			if !exists {
				return "", fmt.Errorf("field %q not found", seg.key)
			}
			current = val
		case []any:
			idx, convErr := strconv.Atoi(seg.key)
			if convErr != nil {
				return "", fmt.Errorf("expected object for field %q, got array", seg.key)
			}
			if idx < 0 || idx >= len(node) {
				return "", fmt.Errorf("array index %d out of bounds (len=%d)", idx, len(node))
			}
			current = node[idx]
		default:
			return "", fmt.Errorf("cannot traverse field %q on %T", seg.key, current)
		}
	}

	switch val := current.(type) {
	case string:
		return val, nil
	case json.Number:
		return val.String(), nil
	case bool:
		return strconv.FormatBool(val), nil
	case nil:
		return "", errors.New("extracted value is null")
	default:
		return "", fmt.Errorf("extracted value must be scalar, got %T", current)
	}
}

func parsePath(expr string) ([]pathSegment, error) {
	p := strings.TrimPrefix(expr, "$.")
	p = strings.TrimPrefix(p, "$")
	if p == "" {
		return nil, errors.New("JSONPath must reference a field or index")
	}

	parts := strings.Split(p, ".")
	segments := make([]pathSegment, 0, len(parts))
	for _, part := range parts {
		if part == "" {
			return nil, fmt.Errorf("invalid JSONPath %q", expr)
		}
		for part != "" {
			openIdx := strings.IndexByte(part, '[')
			if openIdx == -1 {
				segments = append(segments, pathSegment{key: part})
				break
			}
			if openIdx > 0 {
				segments = append(segments, pathSegment{key: part[:openIdx]})
			}
			closeIdx := strings.IndexByte(part[openIdx:], ']')
			if closeIdx == -1 {
				return nil, fmt.Errorf("unclosed bracket in JSONPath %q", expr)
			}
			idxStr := part[openIdx+1 : openIdx+closeIdx]
			idx, err := strconv.Atoi(idxStr)
			if err != nil {
				return nil, fmt.Errorf("invalid array index %q in JSONPath %q", idxStr, expr)
			}
			segments = append(segments, pathSegment{index: idx, isIndex: true})
			part = part[openIdx+closeIdx+1:]
		}
	}
	return segments, nil
}
