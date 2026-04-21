// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ImageSwapMode } from "../../src/image-swap-mode.js";

describe("ImageSwapMode.resolveImageTarget", () => {
  it("returns the <img> and its current src", () => {
    const img = document.createElement("img");
    img.src = "https://example.com/a.jpg";
    document.body.appendChild(img);
    const info = ImageSwapMode.resolveImageTarget(img);
    expect(info?.element).toBe(img);
    expect(info?.originalAssetUrl).toBe("https://example.com/a.jpg");
    img.remove();
  });

  it("drills into <picture> to find the inner <img>", () => {
    const picture = document.createElement("picture");
    const img = document.createElement("img");
    img.src = "https://example.com/p.jpg";
    picture.appendChild(img);
    document.body.appendChild(picture);
    const info = ImageSwapMode.resolveImageTarget(picture);
    expect(info?.element).toBe(img);
    expect(info?.originalAssetUrl).toBe("https://example.com/p.jpg");
    picture.remove();
  });

  it("returns the CSS background-image URL when present", () => {
    const div = document.createElement("div");
    div.style.backgroundImage = 'url("https://example.com/bg.jpg")';
    document.body.appendChild(div);
    const info = ImageSwapMode.resolveImageTarget(div);
    expect(info?.originalAssetUrl).toBe("https://example.com/bg.jpg");
    div.remove();
  });

  it("returns null for non-image elements", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    expect(ImageSwapMode.resolveImageTarget(div)).toBeNull();
    div.remove();
  });
});
