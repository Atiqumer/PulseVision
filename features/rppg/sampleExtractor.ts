import type { Point, SamplingRegion } from "../face/roiGeometry";

export type MeanRgb = { red: number; green: number; blue: number; pixelCount: number };

export type RgbSample = {
  timestamp: number;
  rgb: MeanRgb;
  regions: Partial<Record<SamplingRegion["name"], MeanRgb>>;
};

function pointIsInsidePolygon(x: number, y: number, polygon: Point[]) {
  let isInside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > y) !== (previousPoint.y > y);
    const atIntersection = ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
      (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses && x < atIntersection) isInside = !isInside;
  }
  return isInside;
}

function meanRgbForRegion(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  region: SamplingRegion,
): MeanRgb | null {
  const polygon = region.points.map((point) => ({ x: point.x * width, y: point.y * height }));
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...polygon.map((point) => point.x))));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map((point) => point.y))));

  let red = 0;
  let green = 0;
  let blue = 0;
  let pixelCount = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!pointIsInsidePolygon(x + 0.5, y + 0.5, polygon)) continue;
      const index = (y * width + x) * 4;
      red += pixels[index];
      green += pixels[index + 1];
      blue += pixels[index + 2];
      pixelCount += 1;
    }
  }

  if (pixelCount < 80) return null;
  return { red: red / pixelCount, green: green / pixelCount, blue: blue / pixelCount, pixelCount };
}

export function createSampleExtractor() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  return {
    sample(video: HTMLVideoElement, regions: SamplingRegion[]): RgbSample | null {
      if (!context || video.videoWidth === 0 || video.videoHeight === 0 || regions.length === 0) return null;

      const width = 320;
      const height = Math.round((video.videoHeight / video.videoWidth) * width);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.drawImage(video, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const extractedRegions = Object.fromEntries(
        regions.map((region) => [region.name, meanRgbForRegion(pixels, width, height, region)]),
      ) as Partial<Record<SamplingRegion["name"], MeanRgb | null>>;
      const validRegions = Object.values(extractedRegions).filter((region): region is MeanRgb => region != null);
      if (validRegions.length === 0) return null;

      const totalPixels = validRegions.reduce((sum, region) => sum + region.pixelCount, 0);
      const rgb = validRegions.reduce<MeanRgb>(
        (mean, region) => ({
          red: mean.red + region.red * region.pixelCount / totalPixels,
          green: mean.green + region.green * region.pixelCount / totalPixels,
          blue: mean.blue + region.blue * region.pixelCount / totalPixels,
          pixelCount: totalPixels,
        }),
        { red: 0, green: 0, blue: 0, pixelCount: totalPixels },
      );

      return { timestamp: performance.now(), rgb, regions: extractedRegions };
    },
  };
}
