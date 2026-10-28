import { describe, expect, it } from "vitest";
import { zoomAt, zoomOnImage } from "./zoom";

describe("zoomOnImage", () => {
  const view = { scale: 0.5, x: 0, y: 0 };

  it("keeps the point under the cursor fixed when the cursor is on the image", () => {
    expect(zoomOnImage(view, 1, 100, -50, 1000, 600)).toEqual(zoomAt(view, 1, 100, -50));
  });

  it("anchors on the nearest edge when the cursor is beside the image", () => {
    // The image spans -250..250 by -150..150 on screen; the cursor is far to the right.
    const next = zoomOnImage(view, 1, 900, 0, 1000, 600);
    expect(next).toEqual(zoomAt(view, 1, 250, 0));
    // The right edge stays put instead of the image sliding left.
    expect(next.x + (1000 * next.scale) / 2).toBe(250);
  });

  it("clamps both axes for a cursor past a corner", () => {
    expect(zoomOnImage(view, 2, -900, 700, 1000, 600)).toEqual(zoomAt(view, 2, -250, 150));
  });
});
