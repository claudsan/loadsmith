package scenario

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"unicode/utf8"
)

const (
	// DataModeRoundRobin distributes CSV rows sequentially across iterations and VUs.
	DataModeRoundRobin = "round-robin"
	// DataModeRandom selects a random CSV row on each iteration.
	DataModeRandom = "random"
)

// DataFeed serves rows from a CSV file as variable maps for each scenario iteration.
type DataFeed struct {
	headers []string
	rows    []map[string]string
	mode    string
	cursor  atomic.Uint64
}

// ParseCSVDelimiter normalizes a configured CSV delimiter string into a rune.
func ParseCSVDelimiter(raw string) (rune, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ',', nil
	}
	if trimmed == `\t` || raw == "\t" {
		return '\t', nil
	}
	if utf8.RuneCountInString(trimmed) != 1 {
		return 0, fmt.Errorf("dataFile.delimiter %q must be a single character (or \\t)", raw)
	}
	r, _ := utf8.DecodeRuneInString(trimmed)
	return r, nil
}

// LoadDataFeed reads a CSV file where the first row defines variable names and subsequent rows hold values.
func LoadDataFeed(cfg *DataFileConfig, baseDir string) (*DataFeed, error) {
	if cfg == nil || strings.TrimSpace(cfg.Path) == "" {
		return nil, errors.New("dataFile.path must not be empty")
	}

	mode := strings.TrimSpace(cfg.Mode)
	if mode == "" {
		mode = DataModeRoundRobin
	}
	if mode != DataModeRoundRobin && mode != DataModeRandom {
		return nil, fmt.Errorf("unsupported dataFile.mode %q (expected %q or %q)", mode, DataModeRoundRobin, DataModeRandom)
	}

	delim, err := ParseCSVDelimiter(cfg.Delimiter)
	if err != nil {
		return nil, err
	}

	targetPath := strings.TrimSpace(cfg.Path)
	if !filepath.IsAbs(targetPath) && strings.TrimSpace(baseDir) != "" {
		targetPath = filepath.Join(baseDir, targetPath)
	}

	f, err := os.Open(targetPath)
	if err != nil {
		return nil, fmt.Errorf("open dataFile %q: %w", targetPath, err)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.Comma = delim
	reader.FieldsPerRecord = -1

	headerRecord, err := reader.Read()
	if err != nil {
		if errors.Is(err, io.EOF) {
			return nil, fmt.Errorf("dataFile %q is empty", targetPath)
		}
		return nil, fmt.Errorf("read dataFile header %q: %w", targetPath, err)
	}

	if len(headerRecord) > 0 {
		headerRecord[0] = strings.TrimPrefix(headerRecord[0], "\uFEFF")
	}

	headers := make([]string, len(headerRecord))
	seenHeaders := make(map[string]struct{}, len(headerRecord))
	for i, h := range headerRecord {
		name := strings.TrimSpace(h)
		if name == "" {
			return nil, fmt.Errorf("dataFile %q header column %d must not be empty", targetPath, i+1)
		}
		if _, dup := seenHeaders[name]; dup {
			return nil, fmt.Errorf("dataFile %q has duplicate header %q", targetPath, name)
		}
		seenHeaders[name] = struct{}{}
		headers[i] = name
	}

	var rows []map[string]string
	rowNum := 1
	for {
		rec, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read dataFile %q row %d: %w", targetPath, rowNum+1, err)
		}
		rowNum++
		if isBlankRecord(rec) {
			continue
		}
		if len(rec) != len(headers) {
			return nil, fmt.Errorf(
				"dataFile %q row %d has %d columns, expected %d",
				targetPath, rowNum, len(rec), len(headers),
			)
		}
		rowMap := make(map[string]string, len(headers))
		for i, key := range headers {
			rowMap[key] = rec[i]
		}
		rows = append(rows, rowMap)
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("dataFile %q must contain at least one data row", targetPath)
	}

	return &DataFeed{
		headers: headers,
		rows:    rows,
		mode:    mode,
	}, nil
}

func isBlankRecord(rec []string) bool {
	for _, cell := range rec {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

// Headers returns a copy of the CSV header names.
func (d *DataFeed) Headers() []string {
	out := make([]string, len(d.headers))
	copy(out, d.headers)
	return out
}

// Len returns the number of data rows loaded from the CSV.
func (d *DataFeed) Len() int {
	return len(d.rows)
}

// Next selects the next row's variable map according to the configured distribution mode.
func (d *DataFeed) Next() map[string]string {
	if d == nil || len(d.rows) == 0 {
		return nil
	}
	if d.mode == DataModeRandom {
		return d.rows[rand.IntN(len(d.rows))]
	}
	idx := (d.cursor.Add(1) - 1) % uint64(len(d.rows))
	return d.rows[idx]
}

// MergeVariables clones base and overlays key-value pairs from overlay without mutating either input.
func MergeVariables(base, overlay map[string]string) map[string]string {
	out := CloneVariables(base)
	for k, v := range overlay {
		out[k] = v
	}
	return out
}
