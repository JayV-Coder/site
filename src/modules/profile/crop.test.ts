import { describe, expect, it } from "vitest";
import { clampOffset, coverScale, pickable, rezoom, sourceRect, uploadable } from "./crop";

const landscape = { width: 2000, height: 1000 };
const VIEW = 250;

describe("profile photo crop", () => {
  it("the shorter side fills the window", () => {
    expect(coverScale(landscape, VIEW)).toBe(0.25);
  });

  it("centred, the crop takes the middle square", () => {
    expect(sourceRect(landscape, VIEW, 1, { x: 0, y: 0 })).toEqual({ sx: 500, sy: 0, size: 1000 });
  });

  it("dragging never leaves an empty corner", () => {
    expect(clampOffset({ x: 999, y: 50 }, landscape, VIEW, 1)).toEqual({ x: 125, y: 0 });
    expect(sourceRect(landscape, VIEW, 1, { x: 999, y: 0 })).toEqual({ sx: 0, sy: 0, size: 1000 });
    expect(sourceRect(landscape, VIEW, 1, { x: -999, y: 0 })).toEqual({ sx: 1000, sy: 0, size: 1000 });
  });

  it("zooming keeps the same point in the middle and shrinks the crop", () => {
    const offset = rezoom({ x: 50, y: 0 }, landscape, VIEW, 1, 2);
    expect(offset).toEqual({ x: 100, y: 0 });
    const rect = sourceRect(landscape, VIEW, 2, offset);
    expect(rect.size).toBe(500);
    expect(rect.sx + rect.size / 2).toBe(1000 - 100 / 0.5);
  });

  it("zoom outside the range is held at the limits", () => {
    expect(sourceRect(landscape, VIEW, 0.2, { x: 0, y: 0 }).size).toBe(1000);
    expect(sourceRect(landscape, VIEW, 40, { x: 0, y: 0 }).size).toBe(250);
  });

  it("only images go in, and only the bucket's types go up", () => {
    expect(pickable({ type: "image/heic", size: 10 })).toBe(true);
    expect(pickable({ type: "application/pdf", size: 10 })).toBe(false);
    expect(pickable({ type: "image/png", size: 11 * 1024 * 1024 })).toBe(false);
    expect(uploadable({ type: "image/webp", size: 80_000 })).toBe(true);
    expect(uploadable({ type: "image/gif", size: 80_000 })).toBe(false);
    expect(uploadable({ type: "image/png", size: 2 * 1024 * 1024 })).toBe(false);
  });
});
