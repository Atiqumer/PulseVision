export type Point = { x: number; y: number };

export function faceBounds(landmarks: Point[]) {
  if (landmarks.length === 0) return null;
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export type SamplingRegion = {
  name: "Forehead" | "Left cheek" | "Right cheek";
  points: Point[];
};

/**
 * Conservative regions expressed relative to the current landmark-derived face
 * bounds. These deliberately avoid the eyebrow/eye/lip areas and are only
 * used after one face has passed the framing gate.
 */
export function samplingRegions(landmarks: Point[]): SamplingRegion[] {
  const bounds = faceBounds(landmarks);
  if (!bounds) return [];

  const region = (
    name: SamplingRegion["name"],
    startX: number,
    endX: number,
    startY: number,
    endY: number,
  ): SamplingRegion => ({
    name,
    points: [
      { x: bounds.minX + bounds.width * startX, y: bounds.minY + bounds.height * startY },
      { x: bounds.minX + bounds.width * endX, y: bounds.minY + bounds.height * startY },
      { x: bounds.minX + bounds.width * endX, y: bounds.minY + bounds.height * endY },
      { x: bounds.minX + bounds.width * startX, y: bounds.minY + bounds.height * endY },
    ],
  });

  return [
    region("Forehead", 0.29, 0.71, 0.10, 0.30),
    region("Left cheek", 0.14, 0.37, 0.46, 0.66),
    region("Right cheek", 0.63, 0.86, 0.46, 0.66),
  ];
}
