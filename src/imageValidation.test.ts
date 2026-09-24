import { describe, it, expect } from "vitest";
import { inspectImage } from "./imageValidation";
import { imageFixtures } from "./imageFixtures.test-helper";
const decode = (url: string) =>
  new Uint8Array(Buffer.from(url.split(",")[1], "base64"));
describe("raster structure validation", () => {
  for (const [format, url] of Object.entries(imageFixtures)) {
    it(`accepts bounded ${format} and rejects truncated streams`, () => {
      const bytes = decode(url);
      expect(inspectImage(bytes, `image/${format}`)).toEqual({
        width: 1,
        height: 1,
      });
      expect(() =>
        inspectImage(bytes.slice(0, -2), `image/${format}`),
      ).toThrow();
    });
  }
  it("checks JPEG SOF dimensions before decode", () => {
    const bytes = decode(imageFixtures.jpeg);
    const at = bytes.findIndex(
      (value, i) => value === 0xff && bytes[i + 1] === 0xc0,
    );
    new DataView(bytes.buffer).setUint16(at + 7, 650);
    expect(() => inspectImage(bytes, "image/jpeg")).toThrow();
    expect(inspectImage(bytes, "image/jpeg", 10_000, 80_000_000).width).toBe(
      650,
    );
  });
  it("rejects inconsistent WebP canvas/frame dimensions", () => {
    const bytes = decode(imageFixtures.webp);
    bytes[24] = 10;
    expect(() => inspectImage(bytes, "image/webp")).toThrow();
  });
  it("checks WebP lossless dimensions and version bits", () => {
    // Minimal structural VP8L body; pixel decode remains the browser responsibility.
    const bytes = Uint8Array.from([
      82, 73, 70, 70, 18, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 76, 6, 0, 0, 0,
      47, 0, 0, 0, 0, 0,
    ]);
    expect(inspectImage(bytes, "image/webp")).toEqual({ width: 1, height: 1 });
    bytes[21] = 255;
    bytes[22] = 63;
    expect(() => inspectImage(bytes, "image/webp")).toThrow();
  });
});
