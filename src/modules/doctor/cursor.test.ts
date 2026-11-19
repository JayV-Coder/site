import { describe, expect, it } from "vitest";
import { readCursor, writeCursor } from "./cursor";

// Gerado pelo `encode_cursor` da API do Doctor (apps/api/src/aid_api/core/pagination.py).
const FROM_API = "WyIyMDI2LTExLTE5VDEwOjAwOjAwLjEyMzQ1NiswMDowMCIsICIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiXQ==";
const CURSOR = { at: "2026-11-19T10:00:00.123456+00:00", id: "00000000-0000-4000-8000-000000000001" };

describe("cursor da lista (o mesmo da API)", () => {
  it("lê o cursor que a API escreve", () => {
    expect(readCursor(FROM_API)).toEqual(CURSOR);
  });

  it("escreve um cursor que vai e volta e que a API também lê (base64 com preenchimento)", () => {
    const text = writeCursor(CURSOR);
    expect(readCursor(text)).toEqual(CURSOR);
    expect(text).toMatch(/^[A-Za-z0-9_-]+={0,2}$/);
    expect(text.length % 4).toBe(0);
  });

  it("recusa lixo", () => {
    expect(readCursor("nao-e-base64")).toBeNull();
    expect(readCursor(writeCursor({ at: "ontem", id: "1" }))).toBeNull();
    expect(readCursor(null)).toBeNull();
  });
});
