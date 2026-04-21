// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { TextEditMode } from "../../src/text-edit-mode.js";

describe("TextEditMode.isTextBearing", () => {
  it("treats non-empty text elements as text-bearing", () => {
    const h = document.createElement("h1");
    h.textContent = "Hello";
    document.body.appendChild(h);
    expect(TextEditMode.isTextBearing(h)).toBe(true);
    h.remove();
  });

  it("excludes whitespace-only text", () => {
    const p = document.createElement("p");
    p.textContent = "    ";
    document.body.appendChild(p);
    expect(TextEditMode.isTextBearing(p)).toBe(false);
    p.remove();
  });

  it("skips <script> + <style> + <noscript> tags", () => {
    const script = document.createElement("script");
    script.textContent = "console.log(1)";
    expect(TextEditMode.isTextBearing(script)).toBe(false);
    const style = document.createElement("style");
    style.textContent = "body { color: red }";
    expect(TextEditMode.isTextBearing(style)).toBe(false);
    const noscript = document.createElement("noscript");
    noscript.textContent = "n";
    expect(TextEditMode.isTextBearing(noscript)).toBe(false);
  });
});
