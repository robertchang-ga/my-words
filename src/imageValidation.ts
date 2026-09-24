export interface ImageDimensions {
  width: number;
  height: number;
}
const invalid = (): never => {
  throw new Error(
    "Photo has invalid, truncated, unsupported or oversized image data.",
  );
};

/** Structural checks before decoding; deliberately not a complete pixel decoder. */
export function inspectImage(
  bytes: Uint8Array,
  mime: string,
  maxSide = 640,
  maxPixels = 640 * 640,
): ImageDimensions {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at: number, n: number) =>
    String.fromCharCode(...bytes.subarray(at, at + n));
  const u16 = (at: number) => view.getUint16(at);
  const u32 = (at: number, little = false) => view.getUint32(at, little);
  const u24 = (at: number) =>
    bytes[at] + bytes[at + 1] * 256 + bytes[at + 2] * 65536;
  const bounded = (width: number, height: number) => {
    if (
      !width ||
      !height ||
      width > maxSide ||
      height > maxSide ||
      width * height > maxPixels
    )
      invalid();
    return { width, height };
  };
  try {
    if (mime === "image/png") {
      if (text(0, 8) !== "\x89PNG\r\n\x1a\n" || bytes.length < 45)
        return invalid();
      let dimensions: ImageDimensions | undefined,
        imageData = false;
      for (let at = 8; at < bytes.length;) {
        if (at + 12 > bytes.length) return invalid();
        const size = u32(at),
          type = text(at + 4, 4),
          end = at + size + 12;
        if (end > bytes.length) return invalid();
        let crc = 0xffffffff;
        for (let i = at + 4; i < end - 4; i++) {
          crc ^= bytes[i];
          for (let bit = 0; bit < 8; bit++)
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
        if ((crc ^ 0xffffffff) >>> 0 !== u32(end - 4)) return invalid();
        if (at === 8 && type !== "IHDR") return invalid();
        if (type === "IHDR") {
          if (dimensions || size !== 13) return invalid();
          dimensions = bounded(u32(at + 8), u32(at + 12));
          const depths: Record<number, number[]> = {
            0: [1, 2, 4, 8, 16],
            2: [8, 16],
            3: [1, 2, 4, 8],
            4: [8, 16],
            6: [8, 16],
          };
          if (
            !depths[bytes[at + 17]]?.includes(bytes[at + 16]) ||
            bytes[at + 18] ||
            bytes[at + 19] ||
            bytes[at + 20] > 1
          )
            return invalid();
        }
        if (type === "acTL") return invalid();
        if (type === "IDAT" && size) imageData = true;
        if (type === "IEND")
          return dimensions && imageData && size === 0 && end === bytes.length
            ? dimensions
            : invalid();
        at = end;
      }
      return invalid();
    }
    if (mime === "image/jpeg") {
      if (u16(0) !== 0xffd8) return invalid();
      let dimensions: ImageDimensions | undefined,
        scan = false;
      for (let at = 2; at < bytes.length;) {
        if (bytes[at++] !== 0xff) return invalid();
        while (bytes[at] === 0xff) at++;
        const marker = bytes[at++];
        if (marker === 0xd9)
          return dimensions && scan && at === bytes.length
            ? dimensions
            : invalid();
        if (
          marker === 0 ||
          marker === 0xd8 ||
          (marker >= 0xd0 && marker <= 0xd7)
        )
          return invalid();
        const size = u16(at);
        if (size < 2 || at + size > bytes.length) return invalid();
        if (
          [
            0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf, 0xdc,
            0xde,
          ].includes(marker)
        )
          return invalid();
        if ([0xc0, 0xc1, 0xc2].includes(marker)) {
          if (
            dimensions ||
            size < 11 ||
            bytes[at + 2] !== 8 ||
            size !== 8 + 3 * bytes[at + 7]
          )
            return invalid();
          dimensions = bounded(u16(at + 5), u16(at + 3));
        }
        if (marker === 0xda) {
          if (!dimensions || size < 6 || size !== 6 + 2 * bytes[at + 2])
            return invalid();
          scan = true;
          at += size;
          let dataBytes = 0;
          while (at < bytes.length) {
            if (bytes[at] !== 0xff) {
              dataBytes++;
              at++;
              continue;
            }
            if (
              bytes[at + 1] === 0 ||
              (bytes[at + 1] >= 0xd0 && bytes[at + 1] <= 0xd7)
            ) {
              dataBytes++;
              at += 2;
              continue;
            }
            break;
          }
          if (!dataBytes) return invalid();
        } else at += size;
      }
      return invalid();
    }
    if (mime === "image/webp") {
      if (
        text(0, 4) !== "RIFF" ||
        text(8, 4) !== "WEBP" ||
        u32(4, true) + 8 !== bytes.length
      )
        return invalid();
      let canvas: ImageDimensions | undefined,
        frame: ImageDimensions | undefined;
      for (let at = 12; at < bytes.length;) {
        if (at + 8 > bytes.length) return invalid();
        const type = text(at, 4),
          size = u32(at + 4, true),
          start = at + 8,
          end = start + size;
        if (end + (size % 2) > bytes.length) return invalid();
        if (type === "VP8X") {
          if (
            canvas ||
            at !== 12 ||
            size !== 10 ||
            bytes[start] & 0xc3 ||
            bytes[start + 1] ||
            bytes[start + 2] ||
            bytes[start + 3]
          )
            return invalid();
          canvas = bounded(u24(start + 4) + 1, u24(start + 7) + 1);
        } else if (type === "VP8 ") {
          if (
            frame ||
            size < 11 ||
            bytes[start] & 1 ||
            text(start + 3, 3) !== "\x9d\x01\x2a"
          )
            return invalid();
          frame = bounded(
            view.getUint16(start + 6, true) & 0x3fff,
            view.getUint16(start + 8, true) & 0x3fff,
          );
        } else if (type === "VP8L") {
          if (
            frame ||
            size < 6 ||
            bytes[start] !== 0x2f ||
            bytes[start + 4] >> 5
          )
            return invalid();
          const bits = u32(start + 1, true);
          frame = bounded((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
        } else if (type === "ANIM" || type === "ANMF") return invalid();
        at = end + (size % 2);
      }
      if (
        !frame ||
        (canvas &&
          (canvas.width !== frame.width || canvas.height !== frame.height))
      )
        return invalid();
      return frame;
    }
  } catch {
    return invalid();
  }
  return invalid();
}
