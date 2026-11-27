package scenario

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestLoadDataFeedRoundRobinAndSemicolonBOM(t *testing.T) {
	dir := t.TempDir()
	csvPath := filepath.Join(dir, "users.csv")
	// Include UTF-8 BOM and semicolon delimiter (common in PT-BR Excel exports).
	content := "\uFEFFuserEmail;sku\nana@local;SKU-1\nbruno@local;SKU-2\n\ncarla@local;SKU-3\n"
	if err := os.WriteFile(csvPath, []byte(content), 0o600); err != nil {
		t.Fatalf("write csv: %v", err)
	}

	feed, err := LoadDataFeed(&DataFileConfig{
		Path:      "users.csv",
		Delimiter: ";",
		Mode:      DataModeRoundRobin,
	}, dir)
	if err != nil {
		t.Fatalf("LoadDataFeed failed: %v", err)
	}
	if feed.Len() != 3 {
		t.Fatalf("expected 3 rows, got %d", feed.Len())
	}
	if h := feed.Headers(); len(h) != 2 || h[0] != "userEmail" || h[1] != "sku" {
		t.Fatalf("unexpected headers (BOM should be stripped): %v", h)
	}

	var emails []string
	for i := 0; i < 4; i++ {
		emails = append(emails, feed.Next()["userEmail"])
	}
	expected := []string{"ana@local", "bruno@local", "carla@local", "ana@local"}
	for i := range expected {
		if emails[i] != expected[i] {
			t.Fatalf("row %d: expected %q, got %q", i, expected[i], emails[i])
		}
	}

	// Concurrent reads must never race or return empty maps.
	var wg sync.WaitGroup
	for g := 0; g < 8; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 20; i++ {
				row := feed.Next()
				if row["userEmail"] == "" || row["sku"] == "" {
					t.Errorf("unexpected empty row: %+v", row)
				}
			}
		}()
	}
	wg.Wait()
}

func TestLoadDataFeedRandomAndErrors(t *testing.T) {
	dir := t.TempDir()
	csvPath := filepath.Join(dir, "items.csv")
	if err := os.WriteFile(csvPath, []byte("code,qty\nA,1\nB,2\n"), 0o600); err != nil {
		t.Fatalf("write csv: %v", err)
	}

	feed, err := LoadDataFeed(&DataFileConfig{Path: csvPath, Mode: DataModeRandom}, "")
	if err != nil {
		t.Fatalf("LoadDataFeed random failed: %v", err)
	}
	for i := 0; i < 10; i++ {
		c := feed.Next()["code"]
		if c != "A" && c != "B" {
			t.Fatalf("unexpected random value %q", c)
		}
	}

	merged := MergeVariables(map[string]string{"base": "1", "code": "OLD"}, map[string]string{"code": "NEW"})
	if merged["base"] != "1" || merged["code"] != "NEW" {
		t.Fatalf("unexpected merged vars: %+v", merged)
	}

	badDup := filepath.Join(dir, "dup.csv")
	_ = os.WriteFile(badDup, []byte("id,id\n1,2\n"), 0o600)
	if _, err := LoadDataFeed(&DataFileConfig{Path: badDup}, ""); err == nil || !strings.Contains(err.Error(), "duplicate header") {
		t.Fatalf("expected duplicate header error, got %v", err)
	}

	headerOnly := filepath.Join(dir, "empty.csv")
	_ = os.WriteFile(headerOnly, []byte("id,name\n"), 0o600)
	if _, err := LoadDataFeed(&DataFileConfig{Path: headerOnly}, ""); err == nil || !strings.Contains(err.Error(), "at least one data row") {
		t.Fatalf("expected empty data rows error, got %v", err)
	}
}
