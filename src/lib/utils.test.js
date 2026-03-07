import { describe, it, expect } from "vitest";

describe("Środowisko testowe Vitest", () => {
  it("powinno poprawnie uruchomić prosty test matematyczny", () => {
    expect(2 + 2).toBe(4);
  });
});
