import { describe, expect, it } from "vitest";
import { NO_VALIDATION, sameValidation, storedValidation, withHold, withRequired } from "./validationPolicy";

describe("validation policy", () => {
  it("reads a stored row, and nothing when there is none", () => {
    expect(storedValidation(null)).toEqual(NO_VALIDATION);
    expect(storedValidation({ required: true, hold_commits: true })).toEqual({ required: true, holdCommits: true });
    expect(storedValidation({ required: false, hold_commits: true })).toEqual(NO_VALIDATION);
  });

  it("never holds commits without requiring validation", () => {
    expect(withRequired({ required: true, holdCommits: true }, false)).toEqual(NO_VALIDATION);
    expect(withHold(NO_VALIDATION, true)).toEqual({ required: true, holdCommits: true });
    expect(withHold({ required: true, holdCommits: true }, false)).toEqual({ required: true, holdCommits: false });
  });

  it("compares two policies", () => {
    expect(sameValidation(NO_VALIDATION, { required: false, holdCommits: false })).toBe(true);
    expect(sameValidation(NO_VALIDATION, { required: true, holdCommits: false })).toBe(false);
  });
});
