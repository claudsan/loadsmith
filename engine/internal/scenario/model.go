package scenario

import (
	"fmt"
	"time"
)

// Scenario defines the complete smoke and load test specification loaded from YAML or JSON.
type Scenario struct {
	Name               string            `yaml:"name" json:"name"`
	BaseURL            string            `yaml:"baseUrl" json:"baseUrl"`
	InsecureSkipVerify bool              `yaml:"insecureSkipVerify,omitempty" json:"insecureSkipVerify,omitempty"`
	EnvFile            string            `yaml:"envFile,omitempty" json:"envFile,omitempty"`
	Variables          map[string]string `yaml:"variables,omitempty" json:"variables,omitempty"`
	DataFile           *DataFileConfig   `yaml:"dataFile,omitempty" json:"dataFile,omitempty"`
	Steps              []Step            `yaml:"steps" json:"steps"`
	Smoke              SmokeConfig       `yaml:"smoke,omitempty" json:"smoke,omitempty"`
	Load               LoadConfig        `yaml:"load,omitempty" json:"load,omitempty"`
	Thresholds         Thresholds        `yaml:"thresholds,omitempty" json:"thresholds,omitempty"`
	SourceDir          string            `yaml:"-" json:"-"`
}

// DataFileConfig configures an external CSV file whose header row defines variable names.
type DataFileConfig struct {
	Path      string `yaml:"path" json:"path"`
	Delimiter string `yaml:"delimiter,omitempty" json:"delimiter,omitempty"`
	Mode      string `yaml:"mode,omitempty" json:"mode,omitempty"`
}

// Step describes a single HTTP request, optional assertions, and response variable extractions.
type Step struct {
	ID        string            `yaml:"id" json:"id"`
	Name      string            `yaml:"name,omitempty" json:"name,omitempty"`
	Method    string            `yaml:"method" json:"method"`
	Path      string            `yaml:"path" json:"path"`
	Headers   map[string]string `yaml:"headers,omitempty" json:"headers,omitempty"`
	Body      any               `yaml:"body,omitempty" json:"body,omitempty"`
	TimeoutMs int               `yaml:"timeoutMs,omitempty" json:"timeoutMs,omitempty"`
	Extract   map[string]string `yaml:"extract,omitempty" json:"extract,omitempty"`
	Assert    *Assertion        `yaml:"assert,omitempty" json:"assert,omitempty"`
}

// Assertion specifies expected response constraints for a step.
type Assertion struct {
	Status        int     `yaml:"status,omitempty" json:"status,omitempty"`
	BodyContains  string  `yaml:"bodyContains,omitempty" json:"bodyContains,omitempty"`
	MaxDurationMs float64 `yaml:"maxDurationMs,omitempty" json:"maxDurationMs,omitempty"`
}

// SmokeConfig configures sequential smoke execution behavior.
type SmokeConfig struct {
	Iterations int `yaml:"iterations,omitempty" json:"iterations,omitempty"`
}

// LoadConfig configures concurrent Virtual Users, ramp-up, test duration, and think time.
type LoadConfig struct {
	VUs         int    `yaml:"vus" json:"vus"`
	RampUp      string `yaml:"rampUp,omitempty" json:"rampUp,omitempty"`
	Duration    string `yaml:"duration" json:"duration"`
	ThinkTimeMs int    `yaml:"thinkTimeMs,omitempty" json:"thinkTimeMs,omitempty"`
}

// RampUpDuration parses the configured ramp-up duration (defaulting to 0 when empty).
func (l LoadConfig) RampUpDuration() (time.Duration, error) {
	if l.RampUp == "" {
		return 0, nil
	}
	d, err := time.ParseDuration(l.RampUp)
	if err != nil {
		return 0, fmt.Errorf("invalid load.rampUp %q: %w", l.RampUp, err)
	}
	return d, nil
}

// TotalDuration parses the configured total load test duration.
func (l LoadConfig) TotalDuration() (time.Duration, error) {
	if l.Duration == "" {
		return 0, nil
	}
	d, err := time.ParseDuration(l.Duration)
	if err != nil {
		return 0, fmt.Errorf("invalid load.duration %q: %w", l.Duration, err)
	}
	return d, nil
}

// ThinkTime returns the inter-iteration pause duration for each VU.
func (l LoadConfig) ThinkTime() time.Duration {
	if l.ThinkTimeMs <= 0 {
		return 0
	}
	return time.Duration(l.ThinkTimeMs) * time.Millisecond
}

// Thresholds defines pass/fail SLA criteria evaluated at the end of a run.
type Thresholds struct {
	P95Ms           *float64 `yaml:"p95Ms,omitempty" json:"p95Ms,omitempty"`
	MaxErrorRatePct *float64 `yaml:"maxErrorRatePct,omitempty" json:"maxErrorRatePct,omitempty"`
}
