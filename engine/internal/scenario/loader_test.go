package scenario

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadYAMLAndJSON(t *testing.T) {
	tmpDir := t.TempDir()

	yamlPath := filepath.Join(tmpDir, "flow.yaml")
	yamlContent := `
name: "YAML Flow"
baseUrl: "http://localhost:8080"
variables:
  token: "abc"
steps:
  - id: ping
    method: get
    path: "/health"
load:
  vus: 5
  rampUp: "1s"
  duration: "3s"
`
	if err := os.WriteFile(yamlPath, []byte(yamlContent), 0o600); err != nil {
		t.Fatalf("write yaml: %v", err)
	}

	scYAML, err := Load(yamlPath)
	if err != nil {
		t.Fatalf("Load YAML failed: %v", err)
	}
	if scYAML.Steps[0].Method != "GET" {
		t.Fatalf("expected normalized method GET, got %q", scYAML.Steps[0].Method)
	}
	if scYAML.Steps[0].Name != "ping" {
		t.Fatalf("expected default step name 'ping', got %q", scYAML.Steps[0].Name)
	}
	if err := ValidateForMode(scYAML, ModeLoad); err != nil {
		t.Fatalf("ValidateForMode(load) failed: %v", err)
	}

	jsonPath := filepath.Join(tmpDir, "flow.json")
	jsonContent := `{
  "name": "JSON Flow",
  "baseUrl": "https://api.example.com",
  "steps": [
    { "id": "s1", "method": "post", "path": "/items" }
  ]
}`
	if err := os.WriteFile(jsonPath, []byte(jsonContent), 0o600); err != nil {
		t.Fatalf("write json: %v", err)
	}

	scJSON, err := Load(jsonPath)
	if err != nil {
		t.Fatalf("Load JSON failed: %v", err)
	}
	if scJSON.Steps[0].Method != "POST" {
		t.Fatalf("expected normalized method POST, got %q", scJSON.Steps[0].Method)
	}
}

func TestValidationErrors(t *testing.T) {
	baseValid := func() *Scenario {
		return &Scenario{
			Name:    "Valid",
			BaseURL: "http://127.0.0.1:8080",
			Steps: []Step{
				{ID: "s1", Method: "GET", Path: "/ok"},
			},
		}
	}

	cases := []struct {
		name   string
		mutate func(*Scenario)
		mode   string
		substr string
	}{
		{
			name:   "empty name",
			mutate: func(s *Scenario) { s.Name = "" },
			mode:   ModeSmoke,
			substr: "scenario.name",
		},
		{
			name:   "invalid baseUrl",
			mutate: func(s *Scenario) { s.BaseURL = "ftp://bad" },
			mode:   ModeSmoke,
			substr: "baseUrl",
		},
		{
			name: "duplicate step id",
			mutate: func(s *Scenario) {
				s.Steps = append(s.Steps, Step{ID: "s1", Method: "GET", Path: "/dup"})
			},
			mode:   ModeSmoke,
			substr: "duplicate step id",
		},
		{
			name:   "invalid method",
			mutate: func(s *Scenario) { s.Steps[0].Method = "TRACE" },
			mode:   ModeSmoke,
			substr: "unsupported HTTP method",
		},
		{
			name:   "missing load vus",
			mutate: func(s *Scenario) { s.Load = LoadConfig{Duration: "5s"} },
			mode:   ModeLoad,
			substr: "load.vus",
		},
		{
			name:   "invalid rampUp duration",
			mutate: func(s *Scenario) { s.Load = LoadConfig{VUs: 2, Duration: "5s", RampUp: "nope"} },
			mode:   ModeLoad,
			substr: "load.rampUp",
		},
		{
			name:   "invalid mode",
			mutate: func(s *Scenario) {},
			mode:   "stress",
			substr: "unsupported mode",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sc := baseValid()
			tc.mutate(sc)
			err := ValidateForMode(sc, tc.mode)
			if err == nil || !strings.Contains(err.Error(), tc.substr) {
				t.Fatalf("expected error containing %q, got %v", tc.substr, err)
			}
		})
	}
}

func TestInterpolateAndClone(t *testing.T) {
	vars := map[string]string{
		"userEmail": "dev@loadsmith.local",
		"orderId":   "ord-42",
	}

	out, err := Interpolate("/orders/{{ orderId }}?email={{userEmail}}", vars)
	if err != nil {
		t.Fatalf("Interpolate failed: %v", err)
	}
	if out != "/orders/ord-42?email=dev@loadsmith.local" {
		t.Fatalf("unexpected interpolated string: %q", out)
	}

	if _, err := Interpolate("/orders/{{missing}}", vars); err == nil {
		t.Fatal("expected error for missing variable")
	}

	nested := map[string]any{
		"email": "{{userEmail}}",
		"items": []any{"{{orderId}}", map[string]any{"ref": "ref-{{orderId}}"}},
		"count": 3,
	}
	resolvedAny, err := InterpolateAny(nested, vars)
	if err != nil {
		t.Fatalf("InterpolateAny failed: %v", err)
	}
	resolvedMap := resolvedAny.(map[string]any)
	if resolvedMap["email"] != "dev@loadsmith.local" {
		t.Fatalf("unexpected email: %v", resolvedMap["email"])
	}
	items := resolvedMap["items"].([]any)
	if items[0] != "ord-42" || items[1].(map[string]any)["ref"] != "ref-ord-42" {
		t.Fatalf("unexpected nested items: %v", items)
	}

	cloned := CloneVariables(vars)
	cloned["orderId"] = "mutated"
	if vars["orderId"] != "ord-42" {
		t.Fatal("CloneVariables mutated original map")
	}
}
