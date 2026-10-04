import { describe, expect, it } from "vitest";
import { PACKAGES, detectSystem, findAsset } from "./assets";

const assets = [
  "JayV_0.52.0_x64-setup.exe", "JayV_0.52.0_x64-setup.exe.sig", "JayV_0.52.0_x64_en-US.msi",
  "JayV_0.52.0_aarch64.dmg", "JayV_0.52.0_x64.dmg", "JayV_0.52.0_amd64.AppImage", "JayV_0.52.0_amd64.deb", "JayV-0.52.0-1.x86_64.rpm",
].map((name) => ({ name, url: `https://example.test/${name}`, size: 1 }));

describe("release assets", () => {
  it("finds one package per line and skips updater signatures", () => {
    for (const item of PACKAGES) expect(findAsset(assets, item.pattern)).not.toBeNull();
    expect(findAsset(assets, /-setup\.exe/)?.name).toBe("JayV_0.52.0_x64-setup.exe");
  });

  it("detects the visitor's system", () => {
    expect(detectSystem("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
    expect(detectSystem("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("mac");
    expect(detectSystem("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux");
    expect(detectSystem("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mac");
  });
});
