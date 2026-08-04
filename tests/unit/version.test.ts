import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { APPLICATION_VERSION } from "@/shared/constants";

describe("APPLICATION_VERSION", () => {
  it("matches the version in package.json", () => {
    // Every backup and export records this version, and a restore
    // refuses a file stamped with a different one. If the two ever
    // disagreed, PHOS would reject its own backups — so the copy in
    // `shared/constants/version.ts` is checked rather than trusted.
    expect(APPLICATION_VERSION).toBe(packageJson.version);
  });
});
