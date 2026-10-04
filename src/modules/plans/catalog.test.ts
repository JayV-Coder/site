import { describe, expect, it } from "vitest";
import { adminFailure, isFeature } from "./catalog";

describe("plans catalog", () => {
  it("knows the features of the app", () => {
    expect(isFeature("organizations")).toBe(true);
    expect(isFeature("somethingNew")).toBe(false);
  });

  it("turns an admin RPC error into an i18n key", () => {
    expect(adminFailure({ message: "admin.error.inUse" })).toEqual({ key: "admin.error.inUse" });
    expect(adminFailure({ message: "permission denied for table plans" })).toBe("permission denied for table plans");
  });
});
