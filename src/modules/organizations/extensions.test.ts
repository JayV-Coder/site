import { describe, expect, it } from "vitest";
import { blankServer, mcpPayload, mcpProblems, parseMcpJson, parsePairs, parseSkillFile, skillFile, skillProblems } from "./extensions";

describe("servidores MCP", () => {
  it("lê a configuração mcpServers e o servidor sozinho", () => {
    const servers = parseMcpJson('{"mcpServers":{"github":{"command":"npx","args":["-y","srv"],"env":{"TOKEN":"x"}},"docs":{"url":"https://a.example/mcp","headers":{"Authorization":"Bearer y"}}}}');
    expect(servers.map((server) => [server.name, server.transport])).toEqual([["github", "stdio"], ["docs", "http"]]);
    expect(servers[0].env).toEqual({ TOKEN: "x" });
    expect(parseMcpJson('{"name":"one","command":"run"}')[0].name).toBe("one");
    expect(parseMcpJson("not json")).toEqual([]);
  });

  it("confere o nome, o comando e a URL", () => {
    expect(mcpProblems({ ...blankServer(), name: "jayv", command: "x" })).toEqual(["name"]);
    expect(mcpProblems({ ...blankServer(), name: "ok name", command: "x" })).toEqual(["name"]);
    expect(mcpProblems({ ...blankServer(), name: "ok" })).toEqual(["command"]);
    expect(mcpProblems({ ...blankServer(), name: "ok", transport: "http", url: "ftp://x" })).toEqual(["url"]);
    expect(mcpProblems({ ...blankServer(), name: "ok", command: "run", env: { "BAD KEY": "1" } })).toEqual(["env"]);
  });

  it("grava só o que o transporte usa", () => {
    const payload = mcpPayload({ ...blankServer(), name: " a ", transport: "http", url: " https://x.example ", command: "stale", env: { A: "1" }, agents: ["claude", "unknown"] });
    expect(payload).toMatchObject({ name: "a", url: "https://x.example", command: "", env: {}, agents: ["claude"] });
  });

  it("lê pares CHAVE=valor e Nome: valor", () => {
    expect(parsePairs("A=1\n B = two=2 \nsem igual", "=")).toEqual({ A: "1", B: "two=2" });
    expect(parsePairs("X-Key: v", ":")).toEqual({ "X-Key": "v" });
  });
});

describe("skills", () => {
  const sample = "---\nname: release-notes\ndescription: Writes release notes.\n---\n# Steps\nList each change.\n";

  it("lê o cabeçalho e as instruções", () => {
    expect(parseSkillFile(sample)).toEqual({ name: "release-notes", description: "Writes release notes.", body: "# Steps\nList each change." });
  });

  it("lê descrição em bloco e entre aspas", () => {
    expect(parseSkillFile("---\r\nname: pdf\r\ndescription: >\r\n  Reads and fills\r\n  PDF forms.\r\n---\r\nBody")?.description).toBe("Reads and fills PDF forms.");
    expect(parseSkillFile("---\nname: \"pdf\"\ndescription: 'Use: forms'\n---\nBody")).toMatchObject({ name: "pdf", description: "Use: forms" });
    expect(parseSkillFile("no header")).toBeNull();
  });

  it("recusa nome, descrição ou corpo inválidos", () => {
    expect(skillProblems({ name: "bad name", description: "", body: " " })).toEqual(["name", "description", "body"]);
    expect(skillProblems({ name: "ok", description: "d", body: "b" })).toEqual([]);
  });

  it("o arquivo gravado volta igual ao ser lido", () => {
    const skill = parseSkillFile(sample)!;
    expect(parseSkillFile(skillFile(skill))).toEqual(skill);
  });
});
