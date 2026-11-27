import { describe, expect, it } from "vitest";
import { parseCurlCommand } from "../curlParser";

describe("curlParser", () => {
  it("parses simple GET curl with query params", () => {
    const { result, error } = parseCurlCommand(
      "curl https://api.loja.com/v1/orders?status=paid"
    );

    expect(error).toBeNull();
    expect(result).not.toBeNull();
    expect(result?.baseUrl).toBe("https://api.loja.com");
    expect(result?.insecureSkipVerify).toBe(false);
    expect(result?.step.method).toBe("GET");
    expect(result?.step.path).toBe("/v1/orders?status=paid");
    expect(result?.step.assertStatus).toBe("200");
  });

  it("parses multiline Chrome/bash POST curl with JSON body, headers and -k", () => {
    const raw = `curl -k 'https://localhost:8443/auth/login' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer {{env.TOKEN}}' \\\n  --data-raw '{"email":"dev@local","password":"123"}'`;
    const { result, error } = parseCurlCommand(raw, 2);

    expect(error).toBeNull();
    expect(result?.baseUrl).toBe("https://localhost:8443");
    expect(result?.insecureSkipVerify).toBe(true);
    expect(result?.step.method).toBe("POST");
    expect(result?.step.path).toBe("/auth/login");
    expect(result?.step.bodyMode).toBe("json");
    expect(JSON.parse(result!.step.bodyText)).toEqual({
      email: "dev@local",
      password: "123",
    });
    expect(result?.step.headers).toEqual([
      { key: "Content-Type", value: "application/json" },
      { key: "Authorization", value: "Bearer {{env.TOKEN}}" },
    ]);
    expect(result?.step.assertStatus).toBe("201");
  });

  it("supports Windows CMD caret continuation, --json flag and Basic Auth (-u)", () => {
    const raw = `curl.exe -u alice:s3cret --json "{\\"sku\\":\\"A1\\"}" ^\n  https://staging.example.com/items`;
    const { result, error } = parseCurlCommand(raw);

    expect(error).toBeNull();
    expect(result?.step.method).toBe("POST");
    expect(result?.step.bodyMode).toBe("json");
    expect(result?.step.headers).toContainEqual({
      key: "Authorization",
      value: `Basic ${btoa("alice:s3cret")}`,
    });
    expect(result?.step.headers).toContainEqual({
      key: "Content-Type",
      value: "application/json",
    });
  });

  it("returns friendly error on empty or URL-less input", () => {
    expect(parseCurlCommand("").error).toBeTruthy();
    expect(parseCurlCommand("curl -X GET").error).toBeTruthy();
  });
});
