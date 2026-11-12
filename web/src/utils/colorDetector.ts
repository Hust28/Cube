import { CubeColor } from '../types/cube';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number; // 0 to 360
  s: number; // 0 to 1
  v: number; // 0 to 1
}

// Convert RGB (0..255) to HSV
export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = max === 0 ? 0 : delta / max;
  const v = max;

  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return { h, s, v };
}

// Classify RGB/HSV into standard Rubik's Cube color
export function classifyColor(rgb: RgbColor): CubeColor {
  const { r, g, b } = rgb;
  const hsv = rgbToHsv(r, g, b);
  const { h, s, v } = hsv;

  // 1. White detection: low saturation, moderate-to-high brightness
  // Ambient indoor light can lower V or add slight warm cast
  if (s < 0.22 && v > 0.40) {
    return 'W';
  }
  if (s < 0.32 && v > 0.75 && Math.abs(r - g) < 30 && Math.abs(r - b) < 35) {
    return 'W';
  }

  // 2. Yellow detection: high Red & Green, low Blue, Hue in 42°-68°
  if (h >= 42 && h <= 68 && s > 0.30 && v > 0.40) {
    return 'Y';
  }

  // 3. Green detection: Hue in 75°-165°
  if (h >= 72 && h <= 165 && s > 0.25) {
    return 'G';
  }

  // 4. Blue detection: Hue in 170°-260°
  if (h >= 170 && h <= 260 && s > 0.28) {
    return 'B';
  }

  // 5. Orange vs Red disambiguation
  // Orange typically has Hue 12°-40° and substantial green component compared to blue
  if (h >= 12 && h < 42 && s > 0.45) {
    if (g > b * 1.35 && g > 60) {
      return 'O';
    }
  }

  // Red spans both top of wheel [345°-360°] and bottom [0°-12°]
  if ((h >= 342 || h < 14) && s > 0.35) {
    return 'R';
  }

  // Fallback: Euclidean distance against calibrated physical speedcube references
  const references: Record<CubeColor, RgbColor> = {
    W: { r: 235, g: 235, b: 235 },
    Y: { r: 235, g: 215, b: 25 },
    G: { r: 20, g: 175, b: 65 },
    B: { r: 15, g: 75, b: 210 },
    R: { r: 210, g: 25, b: 35 },
    O: { r: 235, g: 105, b: 20 }
  };

  let bestColor: CubeColor = 'W';
  let minDistance = Infinity;

  for (const [col, ref] of Object.entries(references)) {
    // Weighted Euclidean (human perception weighs green most, then red, then blue)
    const dist = Math.sqrt(
      0.30 * Math.pow(r - ref.r, 2) +
      0.50 * Math.pow(g - ref.g, 2) +
      0.20 * Math.pow(b - ref.b, 2)
    );

    if (dist < minDistance) {
      minDistance = dist;
      bestColor = col as CubeColor;
    }
  }

  return bestColor;
}

// Sample a Region of Interest (ROI) from a 2D canvas context using trimmed mean
export function sampleRoiColor(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  boxRadius: number
): RgbColor {
  const x = Math.max(0, Math.round(centerX - boxRadius));
  const y = Math.max(0, Math.round(centerY - boxRadius));
  const size = Math.max(2, Math.round(boxRadius * 2));

  const imgData = ctx.getImageData(x, y, size, size);
  const data = imgData.data;

  const samples: RgbColor[] = [];
  for (let i = 0; i < data.length; i += 4) {
    samples.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2]
    });
  }

  if (samples.length === 0) {
    return { r: 128, g: 128, b: 128 };
  }

  // Sort by luminance to discard specular glare (top 15%) and deep shadows (bottom 15%)
  samples.sort((a, b) => {
    const lumA = a.r * 0.299 + a.g * 0.587 + a.b * 0.114;
    const lumB = b.r * 0.299 + b.g * 0.587 + b.b * 0.114;
    return lumA - lumB;
  });

  const trim = Math.floor(samples.length * 0.15);
  const trimmed = samples.slice(trim, samples.length - trim);
  const count = trimmed.length > 0 ? trimmed.length : samples.length;
  const list = trimmed.length > 0 ? trimmed : samples;

  let sumR = 0, sumG = 0, sumB = 0;
  for (const s of list) {
    sumR += s.r;
    sumG += s.g;
    sumB += s.b;
  }

  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count)
  };
}
