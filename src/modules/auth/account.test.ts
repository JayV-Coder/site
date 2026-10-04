import { describe, expect, it } from "vitest";
import { codeOk } from "./code";
import { canUnlink, isProvider } from "./identities";

describe("linked accounts", () => {
  it("unlinks only while another way in remains", () => {
    expect(canUnlink(["github"], false, "github")).toBe(false);
    expect(canUnlink(["github"], true, "github")).toBe(true);
    expect(canUnlink(["github", "email"], false, "github")).toBe(true);
    expect(canUnlink(["email"], true, "gitlab")).toBe(false);
  });

  it("knows the providers", () => {
    expect(isProvider("bitbucket")).toBe(true);
    expect(isProvider("google")).toBe(false);
  });
});

describe("email code", () => {
  it("accepts 6 to 10 digits", () => {
    expect(codeOk("123456")).toBe(true);
    expect(codeOk("1234567890")).toBe(true);
    expect(codeOk("12345")).toBe(false);
    expect(codeOk("12345a")).toBe(false);
  });
});
