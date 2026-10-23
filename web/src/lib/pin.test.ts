import { describe, expect, it } from "vitest";
import { pinDigits, pinReady } from "./pin";

describe("pinReady", () => {
  it("needs 4 to 12 digits, typed the same twice", () => {
    expect(pinReady("4829", "4829")).toBe(true);
    expect(pinReady("482", "482")).toBe(false);
    expect(pinReady("4829", "4828")).toBe(false);
    expect(pinReady("1234567890123", "1234567890123")).toBe(false);
  });
});

describe("pinDigits", () => {
  it("keeps digits only, up to twelve", () => {
    expect(pinDigits("48a2-9 1")).toBe("48291");
    expect(pinDigits("12345678901234")).toBe("123456789012");
  });
});
