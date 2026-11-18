import { describe, expect, it } from "vitest";
import { provisionNext, provisionPath, ssoReturnPath } from "./ssoLogin";

describe("Login pelo SSO", () => {
  it("o IdP volta pelo callback do site, que segue para o provisionamento com o destino", () => {
    expect(ssoReturnPath("pt-BR", "/pt-BR/doctor/incidents")).toBe(
      `/pt-BR/auth/callback?next=${encodeURIComponent(`/pt-BR/doctor/sso/provision?next=${encodeURIComponent("/pt-BR/doctor/incidents")}`)}`,
    );
  });

  it("sem sessão na volta, o login devolve ao provisionamento com o mesmo destino", () => {
    expect(provisionPath("en", "/en/doctor")).toBe(`/en/doctor/sso/provision?next=${encodeURIComponent("/en/doctor")}`);
  });

  it("depois do provisionamento, vai para o destino pedido; fora do site ou do Doctor, para o painel do Doctor", () => {
    expect(provisionNext("pt-BR", "/pt-BR/doctor/incidents")).toBe("/pt-BR/doctor/incidents");
    expect(provisionNext("pt-BR", "/pt-BR/dashboard")).toBe("/pt-BR/dashboard");
    expect(provisionNext("pt-BR", "https://evil.example")).toBe("/pt-BR/doctor");
    expect(provisionNext("pt-BR", "//evil.example")).toBe("/pt-BR/doctor");
    expect(provisionNext("pt-BR", null)).toBe("/pt-BR/doctor");
  });
});
