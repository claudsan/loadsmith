package scenario

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

const (
	ModeSmoke = "smoke"
	ModeLoad  = "load"
)

var (
	varPattern     = regexp.MustCompile(`\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}`)
	allowedMethods = map[string]struct{}{
		"GET":     {},
		"POST":    {},
		"PUT":     {},
		"PATCH":   {},
		"DELETE":  {},
		"HEAD":    {},
		"OPTIONS": {},
	}
)

// Load reads a YAML or JSON scenario file, normalizes step metadata, and validates its structure.
func Load(path string) (*Scenario, error) {
	if strings.TrimSpace(path) == "" {
		return nil, errors.New("scenario path must not be empty")
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read scenario %q: %w", path, err)
	}

	var sc Scenario
	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".json" {
		if err := json.Unmarshal(raw, &sc); err != nil {
			return nil, fmt.Errorf("parse JSON scenario %q: %w", path, err)
		}
	} else {
		if err := yaml.Unmarshal(raw, &sc); err != nil {
			return nil, fmt.Errorf("parse YAML scenario %q: %w", path, err)
		}
	}

	normalize(&sc)
	if absPath, absErr := filepath.Abs(path); absErr == nil {
		sc.SourceDir = filepath.Dir(absPath)
	}
	if err := ValidateStructure(&sc); err != nil {
		return nil, err
	}
	return &sc, nil
}

func normalize(sc *Scenario) {
	sc.Name = strings.TrimSpace(sc.Name)
	sc.BaseURL = strings.TrimSpace(sc.BaseURL)
	if sc.Variables == nil {
		sc.Variables = make(map[string]string)
	}
	for i := range sc.Steps {
		sc.Steps[i].ID = strings.TrimSpace(sc.Steps[i].ID)
		sc.Steps[i].Name = strings.TrimSpace(sc.Steps[i].Name)
		if sc.Steps[i].Name == "" {
			sc.Steps[i].Name = sc.Steps[i].ID
		}
		sc.Steps[i].Method = strings.ToUpper(strings.TrimSpace(sc.Steps[i].Method))
		sc.Steps[i].Path = strings.TrimSpace(sc.Steps[i].Path)
	}
}

// ValidateStructure checks mode-independent scenario fields and constraints.
func ValidateStructure(sc *Scenario) error {
	if sc == nil {
		return errors.New("scenario must not be nil")
	}
	if sc.Name == "" {
		return errors.New("scenario.name must not be empty")
	}
	if sc.BaseURL == "" {
		return errors.New("scenario.baseUrl must not be empty")
	}
	parsedURL, err := url.Parse(sc.BaseURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") || parsedURL.Host == "" {
		return fmt.Errorf("scenario.baseUrl %q must be a valid http or https URL", sc.BaseURL)
	}
	if len(sc.Steps) == 0 {
		return errors.New("scenario.steps must contain at least one step")
	}

	seenIDs := make(map[string]struct{}, len(sc.Steps))
	for i, step := range sc.Steps {
		if step.ID == "" {
			return fmt.Errorf("steps[%d].id must not be empty", i)
		}
		if _, exists := seenIDs[step.ID]; exists {
			return fmt.Errorf("duplicate step id %q", step.ID)
		}
		seenIDs[step.ID] = struct{}{}

		if _, ok := allowedMethods[step.Method]; !ok {
			return fmt.Errorf("step %q has unsupported HTTP method %q", step.ID, step.Method)
		}
		if step.Path == "" {
			return fmt.Errorf("step %q path must not be empty", step.ID)
		}
		if step.TimeoutMs < 0 {
			return fmt.Errorf("step %q timeoutMs must be >= 0", step.ID)
		}
		if step.Assert != nil {
			if step.Assert.Status != 0 && (step.Assert.Status < 100 || step.Assert.Status > 599) {
				return fmt.Errorf("step %q assert.status %d must be between 100 and 599", step.ID, step.Assert.Status)
			}
			if step.Assert.MaxDurationMs < 0 {
				return fmt.Errorf("step %q assert.maxDurationMs must be >= 0", step.ID)
			}
		}
	}

	if sc.Smoke.Iterations < 0 {
		return errors.New("smoke.iterations must be >= 0")
	}
	if sc.DataFile != nil {
		if strings.TrimSpace(sc.DataFile.Path) == "" {
			return errors.New("dataFile.path must not be empty when dataFile is configured")
		}
		if _, err := ParseCSVDelimiter(sc.DataFile.Delimiter); err != nil {
			return err
		}
		if m := strings.TrimSpace(sc.DataFile.Mode); m != "" && m != DataModeRoundRobin && m != DataModeRandom {
			return fmt.Errorf("unsupported dataFile.mode %q (expected %q or %q)", m, DataModeRoundRobin, DataModeRandom)
		}
	}
	if sc.Thresholds.P95Ms != nil && *sc.Thresholds.P95Ms <= 0 {
		return errors.New("thresholds.p95Ms must be > 0")
	}
	if sc.Thresholds.MaxErrorRatePct != nil && (*sc.Thresholds.MaxErrorRatePct < 0 || *sc.Thresholds.MaxErrorRatePct > 100) {
		return errors.New("thresholds.maxErrorRatePct must be between 0 and 100")
	}
	return nil
}

// ValidateForMode validates structural rules plus mode-specific requirements ("smoke" or "load").
func ValidateForMode(sc *Scenario, mode string) error {
	if err := ValidateStructure(sc); err != nil {
		return err
	}

	switch mode {
	case ModeSmoke:
		return nil
	case ModeLoad:
		if sc.Load.VUs <= 0 {
			return errors.New("load.vus must be > 0 in load mode")
		}
		dur, err := sc.Load.TotalDuration()
		if err != nil {
			return err
		}
		if dur <= 0 {
			return errors.New("load.duration must be > 0 in load mode")
		}
		ramp, err := sc.Load.RampUpDuration()
		if err != nil {
			return err
		}
		if ramp < 0 {
			return errors.New("load.rampUp must be >= 0")
		}
		if sc.Load.ThinkTimeMs < 0 {
			return errors.New("load.thinkTimeMs must be >= 0")
		}
		return nil
	default:
		return fmt.Errorf("unsupported mode %q (expected %q or %q)", mode, ModeSmoke, ModeLoad)
	}
}

// Interpolate replaces all {{var}} placeholders using vars, returning an error if any variable is missing.
func Interpolate(input string, vars map[string]string) (string, error) {
	if !strings.Contains(input, "{{") {
		return input, nil
	}

	var missingErr error
	out := varPattern.ReplaceAllStringFunc(input, func(match string) string {
		if missingErr != nil {
			return match
		}
		sub := varPattern.FindStringSubmatch(match)
		if len(sub) < 2 {
			return match
		}
		key := sub[1]
		val, ok := vars[key]
		if !ok {
			missingErr = fmt.Errorf("undefined variable %q", key)
			return match
		}
		return val
	})
	if missingErr != nil {
		return "", missingErr
	}
	return out, nil
}

// InterpolateAny recursively resolves {{var}} placeholders in strings, maps, and slices.
func InterpolateAny(v any, vars map[string]string) (any, error) {
	switch typed := v.(type) {
	case nil:
		return nil, nil
	case string:
		return Interpolate(typed, vars)
	case map[string]any:
		out := make(map[string]any, len(typed))
		for k, val := range typed {
			resolved, err := InterpolateAny(val, vars)
			if err != nil {
				return nil, fmt.Errorf("field %q: %w", k, err)
			}
			out[k] = resolved
		}
		return out, nil
	case map[any]any:
		out := make(map[string]any, len(typed))
		for k, val := range typed {
			ks := fmt.Sprint(k)
			resolved, err := InterpolateAny(val, vars)
			if err != nil {
				return nil, fmt.Errorf("field %q: %w", ks, err)
			}
			out[ks] = resolved
		}
		return out, nil
	case []any:
		out := make([]any, len(typed))
		for i, item := range typed {
			resolved, err := InterpolateAny(item, vars)
			if err != nil {
				return nil, fmt.Errorf("index [%d]: %w", i, err)
			}
			out[i] = resolved
		}
		return out, nil
	default:
		return v, nil
	}
}

// CloneVariables returns an isolated copy of a variable map so VUs never share mutable state.
func CloneVariables(vars map[string]string) map[string]string {
	out := make(map[string]string, len(vars))
	for k, v := range vars {
		out[k] = v
	}
	return out
}
