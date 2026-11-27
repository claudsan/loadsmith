package scenario

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseEnvContent(t *testing.T) {
	raw := "\uFEFF# comment\n" +
		"export API_KEY=plain-secret # inline comment\n" +
		"QUOTED_SINGLE='literal\\n#not-comment'\n" +
		"QUOTED_DOUBLE=\"line1\\nline2\\t\\\"ok\\\"\"\n" +
		"EMPTY=\n" +
		"MALFORMED_LINE\n"

	parsed := ParseEnvContent(raw)
	if parsed["API_KEY"] != "plain-secret" {
		t.Fatalf("expected plain-secret, got %q", parsed["API_KEY"])
	}
	if parsed["QUOTED_SINGLE"] != `literal\n#not-comment` {
		t.Fatalf("unexpected single quoted val: %q", parsed["QUOTED_SINGLE"])
	}
	if parsed["QUOTED_DOUBLE"] != "line1\nline2\t\"ok\"" {
		t.Fatalf("unexpected double quoted val: %q", parsed["QUOTED_DOUBLE"])
	}
	if v, ok := parsed["EMPTY"]; !ok || v != "" {
		t.Fatalf("expected empty value present, got ok=%v val=%q", ok, v)
	}
	if _, exists := parsed["MALFORMED_LINE"]; exists {
		t.Fatal("malformed line should be ignored")
	}
}

func TestLoadEnvVariablesAutoAndExplicit(t *testing.T) {
	dir := t.TempDir()
	autoPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(autoPath, []byte("SECRET=from-auto\n"), 0o600); err != nil {
		t.Fatalf("write auto .env: %v", err)
	}
	stagingPath := filepath.Join(dir, "staging.env")
	if err := os.WriteFile(stagingPath, []byte("SECRET=from-staging\n"), 0o600); err != nil {
		t.Fatalf("write staging.env: %v", err)
	}

	scAuto := &Scenario{SourceDir: dir}
	varsAuto, err := LoadEnvVariables(scAuto)
	if err != nil {
		t.Fatalf("auto load failed: %v", err)
	}
	if varsAuto["env.SECRET"] != "from-auto" {
		t.Fatalf("expected from-auto, got %q", varsAuto["env.SECRET"])
	}

	scExplicit := &Scenario{SourceDir: dir, EnvFile: "./staging.env"}
	varsExplicit, err := LoadEnvVariables(scExplicit)
	if err != nil {
		t.Fatalf("explicit load failed: %v", err)
	}
	if varsExplicit["env.SECRET"] != "from-staging" {
		t.Fatalf("expected from-staging, got %q", varsExplicit["env.SECRET"])
	}

	scMissing := &Scenario{SourceDir: dir, EnvFile: "./missing.env"}
	if _, err := LoadEnvVariables(scMissing); err == nil {
		t.Fatal("expected error when explicit envFile does not exist")
	}
}
