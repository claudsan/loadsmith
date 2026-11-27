package scenario

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ParseEnvContent parses dotenv-formatted text into key/value pairs without mutating process env.
func ParseEnvContent(content string) map[string]string {
	cleaned := strings.TrimPrefix(content, "\uFEFF")
	cleaned = strings.ReplaceAll(cleaned, "\r\n", "\n")
	lines := strings.Split(cleaned, "\n")

	parsed := make(map[string]string)
	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "export ") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "export "))
		}

		eqIdx := strings.IndexByte(line, '=')
		if eqIdx <= 0 {
			continue
		}

		key := strings.TrimSpace(line[:eqIdx])
		if key == "" {
			continue
		}

		val := parseEnvValue(strings.TrimSpace(line[eqIdx+1:]))
		parsed[key] = val
	}
	return parsed
}

func parseEnvValue(raw string) string {
	if len(raw) >= 2 {
		if raw[0] == '\'' && raw[len(raw)-1] == '\'' {
			return raw[1 : len(raw)-1]
		}
		if raw[0] == '"' && raw[len(raw)-1] == '"' {
			inner := raw[1 : len(raw)-1]
			var b strings.Builder
			b.Grow(len(inner))
			for i := 0; i < len(inner); i++ {
				if inner[i] == '\\' && i+1 < len(inner) {
					switch inner[i+1] {
					case 'n':
						b.WriteByte('\n')
						i++
						continue
					case 'r':
						b.WriteByte('\r')
						i++
						continue
					case 't':
						b.WriteByte('\t')
						i++
						continue
					case '"':
						b.WriteByte('"')
						i++
						continue
					case '\\':
						b.WriteByte('\\')
						i++
						continue
					}
				}
				b.WriteByte(inner[i])
			}
			return b.String()
		}
	}

	if hashIdx := strings.Index(raw, " #"); hashIdx >= 0 {
		raw = raw[:hashIdx]
	}
	return strings.TrimSpace(raw)
}

// LoadEnvVariables loads OS env vars and optional/auto-detected .env secrets under the "env." prefix.
func LoadEnvVariables(sc *Scenario) (map[string]string, error) {
	vars := make(map[string]string)
	for _, entry := range os.Environ() {
		if k, v, ok := strings.Cut(entry, "="); ok && strings.TrimSpace(k) != "" {
			vars["env."+k] = v
		}
	}

	if sc == nil {
		return vars, nil
	}

	explicit := strings.TrimSpace(sc.EnvFile)
	if explicit != "" {
		target := explicit
		if !filepath.IsAbs(target) && sc.SourceDir != "" {
			target = filepath.Join(sc.SourceDir, target)
		}
		raw, err := os.ReadFile(target)
		if err != nil {
			return nil, fmt.Errorf("envFile not found %q: %w", target, err)
		}
		for k, v := range ParseEnvContent(string(raw)) {
			vars["env."+k] = v
		}
		return vars, nil
	}

	if sc.SourceDir != "" {
		autoEnv := filepath.Join(sc.SourceDir, ".env")
		if raw, err := os.ReadFile(autoEnv); err == nil {
			for k, v := range ParseEnvContent(string(raw)) {
				vars["env."+k] = v
			}
		}
	}

	return vars, nil
}
