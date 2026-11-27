import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createScenarioFile,
  deleteScenarioFile,
  duplicateScenarioFile,
  ensureStarterScenario,
  inspectEnvFile,
  isExistingDirectory,
  listScenarioTree,
  previewCsvFile,
  readCsvRecords,
  readScenarioFile,
  renameScenarioFile,
  saveScenarioFile,
} from "../workspaceFiles";

describe("workspaceFiles", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("lists YAML/JSON scenarios ignoring node_modules/.git and prevents path traversal", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-ws-"));
    tempDirs.push(root);

    fs.mkdirSync(path.join(root, ".loadsmith"), { recursive: true });
    fs.mkdirSync(path.join(root, "node_modules", "pkg"), { recursive: true });
    fs.writeFileSync(path.join(root, "node_modules", "pkg", "ignored.json"), "{}");
    fs.writeFileSync(path.join(root, "package.json"), "{}");
    fs.writeFileSync(path.join(root, "smoke.yaml"), "name: Smoke\n");

    const created = createScenarioFile(root, ".loadsmith/checkout", "name: Checkout\n");
    expect(created.endsWith(path.join(".loadsmith", "checkout.yaml"))).toBe(true);

    const tree = listScenarioTree(root);
    expect(tree.map((n) => n.name)).toEqual([".loadsmith", "smoke.yaml"]);
    expect(tree[1].scenarioName).toBe("Smoke");
    expect(tree[0].children?.map((n) => n.name)).toEqual(["checkout.yaml"]);
    expect(tree[0].children?.[0].scenarioName).toBe("Checkout");

    expect(readScenarioFile(root, created)).toBe("name: Checkout\n");
    saveScenarioFile(root, created, "name: Updated\n");
    expect(readScenarioFile(root, created)).toBe("name: Updated\n");

    expect(() => readScenarioFile(root, path.join(root, "..", "outside.yaml"))).toThrow();
  });

  it("previews CSV files with UTF-8 BOM and custom delimiter", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-csv-"));
    tempDirs.push(root);

    const scenarioPath = path.join(root, "flow.yaml");
    fs.writeFileSync(scenarioPath, "name: CSV\n", "utf8");
    fs.writeFileSync(
      path.join(root, "dados.csv"),
      "\uFEFFemail;sku\na@local;S1\nb@local;S2\nc@local;S3\nd@local;S4\n",
      "utf8"
    );

    const preview = previewCsvFile(scenarioPath, "./dados.csv", ";");
    expect(preview.exists).toBe(true);
    expect(preview.error).toBeNull();
    expect(preview.headers).toEqual(["email", "sku"]);
    expect(preview.rowCount).toBe(4);
    expect(preview.sampleRows).toHaveLength(3);
    expect(preview.sampleRows[0]).toEqual(["a@local", "S1"]);

    const page1 = readCsvRecords(scenarioPath, "./dados.csv", ";", 0, 2, "");
    expect(page1.totalRows).toBe(4);
    expect(page1.filteredRows).toBe(4);
    expect(page1.rows.map((r) => r.rowNumber)).toEqual([1, 2]);

    const filtered = readCsvRecords(scenarioPath, "./dados.csv", ";", 0, 10, "s3");
    expect(filtered.filteredRows).toBe(1);
    expect(filtered.rows[0].rowNumber).toBe(3);
    expect(filtered.rows[0].values).toEqual(["c@local", "S3"]);
  });

  it("supports starter scenario creation, rename, duplicate, delete and path traversal guard", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-crud-"));
    tempDirs.push(root);

    const starter = ensureStarterScenario(root);
    expect(starter).not.toBeNull();
    expect(fs.existsSync(starter!)).toBe(true);

    // Calling again should not overwrite or add duplicates when scenario already exists.
    expect(ensureStarterScenario(root)).toBeNull();

    const copy1 = duplicateScenarioFile(root, starter!);
    expect(path.basename(copy1)).toBe("exemplo-api-copia.yaml");
    expect(readScenarioFile(root, copy1)).toBe(readScenarioFile(root, starter!));

    const copy2 = duplicateScenarioFile(root, starter!);
    expect(path.basename(copy2)).toBe("exemplo-api-copia-2.yaml");

    const renamed = renameScenarioFile(root, copy1, "checkout-v2");
    expect(path.basename(renamed)).toBe("checkout-v2.yaml");
    expect(fs.existsSync(copy1)).toBe(false);

    // Duplicate target name must fail.
    expect(() => renameScenarioFile(root, copy2, "checkout-v2.yaml")).toThrow();
    // Path traversal must fail.
    expect(() => renameScenarioFile(root, copy2, "../evil.yaml")).toThrow();
    expect(() => deleteScenarioFile(root, path.join(root, "..", "outside.yaml"))).toThrow();

    // Non-scenario file deletion must fail.
    const txtFile = path.join(root, "notes.txt");
    fs.writeFileSync(txtFile, "keep", "utf8");
    expect(() => deleteScenarioFile(root, txtFile)).toThrow();

    deleteScenarioFile(root, renamed);
    expect(fs.existsSync(renamed)).toBe(false);
  });

  it("inspects auto-detected and explicit .env files returning only keys without leaking secrets", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-env-"));
    tempDirs.push(root);

    const scenarioPath = path.join(root, "flow.yaml");
    fs.writeFileSync(scenarioPath, "name: Env\n", "utf8");

    fs.writeFileSync(
      path.join(root, ".env"),
      "\uFEFF# comment\nexport API_TOKEN=super-secret-value-1\nDB_PASS=hidden-pass\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(root, "staging.env"),
      "STAGING_KEY=secret-staging-xyz\n",
      "utf8"
    );

    const autoRes = inspectEnvFile(scenarioPath, "");
    expect(autoRes.exists).toBe(true);
    expect(autoRes.isAutoDetected).toBe(true);
    expect(autoRes.error).toBeNull();
    expect(autoRes.keys).toEqual(["API_TOKEN", "DB_PASS"]);
    expect(JSON.stringify(autoRes)).not.toContain("super-secret-value-1");
    expect(JSON.stringify(autoRes)).not.toContain("hidden-pass");

    const explicitRes = inspectEnvFile(scenarioPath, "./staging.env");
    expect(explicitRes.exists).toBe(true);
    expect(explicitRes.isAutoDetected).toBe(false);
    expect(explicitRes.keys).toEqual(["STAGING_KEY"]);
    expect(JSON.stringify(explicitRes)).not.toContain("secret-staging-xyz");

    const missingRes = inspectEnvFile(scenarioPath, "./missing.env");
    expect(missingRes.exists).toBe(false);
    expect(missingRes.error).toBeTruthy();
  });

  it("checks existing directories cleanly via isExistingDirectory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-dircheck-"));
    tempDirs.push(root);
    const filePath = path.join(root, "sample.yaml");
    fs.writeFileSync(filePath, "name: test\n", "utf8");

    expect(isExistingDirectory(root)).toBe(true);
    expect(isExistingDirectory(filePath)).toBe(false);
    expect(isExistingDirectory(path.join(root, "nonexistent"))).toBe(false);
    expect(isExistingDirectory("   ")).toBe(false);
  });
});
