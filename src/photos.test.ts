import { afterEach, describe, expect, it, vi } from "vitest";
import { resizePhoto } from "./photos";
import { imageFixtures } from "./imageFixtures.test-helper";
const validFile = () =>
  new File(
    [Buffer.from(imageFixtures.jpeg.split(",")[1], "base64")],
    "photo.jpg",
    { type: "image/jpeg" },
  );

describe("photo upload", () => {
  it("rejects invalid headers before allocating a decoder", async () => {
    const create = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create });
    await expect(
      resizePhoto(new File(["broken"], "photo.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow(/invalid/);
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects excessive declared dimensions before allocating a decoder", async () => {
    const create = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create });
    const bytes = new Uint8Array(
      Buffer.from(imageFixtures.jpeg.split(",")[1], "base64"),
    );
    const at = bytes.findIndex(
      (value, i) => value === 0xff && bytes[i + 1] === 0xc0,
    );
    new DataView(bytes.buffer).setUint16(at + 7, 30_000);
    await expect(
      resizePhoto(new File([bytes], "photo.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow(/oversized/);
    expect(create).not.toHaveBeenCalled();
  });
  afterEach(() => vi.unstubAllGlobals());
  it("rejects unsupported and oversized uploads before decoding", async () => {
    await expect(
      resizePhoto(new File(["svg"], "unsafe.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow(/JPEG|PNG|WebP/);
    await expect(
      resizePhoto(
        new File([new Uint8Array(12 * 1024 * 1024 + 1)], "big.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).rejects.toThrow(/12/);
  });
  it("reports a decode failure and revokes the object URL", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:photo",
      revokeObjectURL: revoke,
    });
    vi.stubGlobal(
      "Image",
      class {
        onerror?: () => void;
        set src(_value: string) {
          this.onerror?.();
        }
      },
    );
    await expect(resizePhoto(validFile())).rejects.toThrow(/read/);
    expect(revoke).toHaveBeenCalledWith("blob:photo");
  });
  it("bounds the image to 640px and rasterizes it as JPEG", async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ fillStyle: "", fillRect: vi.fn(), drawImage }),
      toDataURL: vi.fn(() => "data:image/jpeg;base64,/9j/2Q=="),
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:photo",
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 1600;
        naturalHeight = 800;
        onload?: () => void;
        set src(_value: string) {
          this.onload?.();
        }
      },
    );
    expect(await resizePhoto(validFile())).toContain("data:image/jpeg");
    expect([canvas.width, canvas.height]).toEqual([640, 320]);
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.8);
    expect(drawImage).toHaveBeenCalled();
  });
});
