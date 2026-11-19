import { describe, expect, it } from "vitest";
import { readCursor, writeCursor } from "./cursor";

describe("cursor das leituras diretas", () => {
  it("vai e volta pelo endereço sem perder o momento nem o id", () => {
    const cursor = { at: "2026-11-19T10:00:00.123456+00:00", id: "00000000-0000-4000-8000-000000000001" };
    expect(readCursor(writeCursor(cursor))).toEqual(cursor);
  });

  it("não confunde com o cursor da API nem aceita lixo", () => {
    expect(readCursor("eyJhdCI6IjIwMjYifQ")).toBeNull();
    expect(readCursor("r.nao-e-base64")).toBeNull();
    expect(readCursor(writeCursor({ at: "ontem", id: "1" }))).toBeNull();
    expect(readCursor(null)).toBeNull();
  });
});
