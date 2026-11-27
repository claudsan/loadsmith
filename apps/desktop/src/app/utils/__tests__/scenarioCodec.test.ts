import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseScenarioText, serializeScenarioText } from "../scenarioCodec";

describe("scenarioCodec", () => {
  it("performs clean round-trip on examples/api-flow.yaml", () => {
    const examplePath = path.resolve(__dirname, "../../../../../../examples/api-flow.yaml");
    const rawYaml = fs.readFileSync(examplePath, "utf8");

    const parsed = parseScenarioText(rawYaml, false);
    expect(parsed.error).toBeNull();
    expect(parsed.scenario).not.toBeNull();

    const sc = parsed.scenario!;
    expect(sc.name).toBe("E-Commerce Orders Flow");
    expect(sc.baseUrl).toBe("http://127.0.0.1:8080");
    expect(sc.steps).toHaveLength(4);
    expect(sc.steps[1].bodyMode).toBe("json");
    expect(sc.steps[1].extract).toEqual([{ key: "token", value: "data.accessToken" }]);
    expect(sc.loadVus).toBe("20");
    expect(sc.thresholdP95Ms).toBe("250");

    const reserialized = serializeScenarioText(sc, false);
    const reparsed = parseScenarioText(reserialized, false);
    expect(reparsed.error).toBeNull();
    expect(reparsed.scenario).toEqual(sc);
  });

  it("round-trips dataFile CSV configuration in YAML", () => {
    const csvFlowPath = path.resolve(__dirname, "../../../../../../examples/api-flow-csv.yaml");
    const raw = fs.readFileSync(csvFlowPath, "utf8");
    const parsed = parseScenarioText(raw, false);

    expect(parsed.error).toBeNull();
    expect(parsed.scenario?.dataFilePath).toBe("./users.csv");
    expect(parsed.scenario?.dataFileDelimiter).toBe(",");
    expect(parsed.scenario?.dataFileMode).toBe("round-robin");

    const updated = {
      ...parsed.scenario!,
      dataFileDelimiter: ";",
      dataFileMode: "random" as const,
    };
    const reserialized = serializeScenarioText(updated, false);
    const reparsed = parseScenarioText(reserialized, false);
    expect(reparsed.scenario?.dataFileDelimiter).toBe(";");
    expect(reparsed.scenario?.dataFileMode).toBe("random");
  });

  it("supports JSON scenarios and surfaces invalid syntax cleanly", () => {
    const jsonInput = JSON.stringify({
      name: "JSON API",
      baseUrl: "https://api.local",
      steps: [
        {
          id: "ping",
          method: "post",
          path: "/ping",
          body: { hello: "world" },
          assert: { status: 201, maxDurationMs: 120 },
        },
      ],
      thresholds: { p95Ms: 150, maxErrorRatePct: 0.5 },
    });

    const parsed = parseScenarioText(jsonInput, true);
    expect(parsed.error).toBeNull();
    expect(parsed.scenario?.steps[0].method).toBe("POST");
    expect(parsed.scenario?.steps[0].bodyMode).toBe("json");

    const serialized = serializeScenarioText(parsed.scenario!, true);
    expect(parseScenarioText(serialized, true).scenario).toEqual(parsed.scenario);

    const invalid = parseScenarioText("name: [unclosed", false);
    expect(invalid.scenario).toBeNull();
    expect(invalid.error).toBeTruthy();
  });

  it("round-trips insecureSkipVerify and envFile in YAML and JSON", () => {
    const yamlInput = `name: Local TLS\nbaseUrl: https://127.0.0.1:8443\ninsecureSkipVerify: true\nenvFile: ./staging.env\nsteps:\n  - id: ping\n    method: GET\n    path: /ping\n`;
    const parsed = parseScenarioText(yamlInput, false);
    expect(parsed.error).toBeNull();
    expect(parsed.scenario?.insecureSkipVerify).toBe(true);
    expect(parsed.scenario?.envFile).toBe("./staging.env");

    const serializedYaml = serializeScenarioText(parsed.scenario!, false);
    expect(parseScenarioText(serializedYaml, false).scenario).toEqual(parsed.scenario);

    const serializedJson = serializeScenarioText(parsed.scenario!, true);
    expect(parseScenarioText(serializedJson, true).scenario).toEqual(parsed.scenario);
  });
});
