"use client";

import { useEffect, useRef, useState } from "react";
import { faceBounds, type Point } from "../face/roiGeometry";
import type { TrackingState } from "../face/useFaceLandmarker";

export type QualityLevel = "waiting" | "poor" | "fair" | "good";

export type CaptureQuality = {
  level: QualityLevel;
  lighting: "unknown" | "low" | "balanced" | "bright";
  exposure: "unknown" | "clear" | "clipped";
  framing: "unknown" | "adjust" | "good";
  motion: "unknown" | "still" | "moving";
  guidance: string;
};

const initialQuality: CaptureQuality = {
  level: "waiting",
  lighting: "unknown",
  exposure: "unknown",
  framing: "unknown",
  motion: "unknown",
  guidance: "Enable the camera to begin quality checks.",
};

export function useCaptureQuality({
  video,
  landmarks,
  trackingState,
}: {
  video: HTMLVideoElement | null;
  landmarks: Point[];
  trackingState: TrackingState;
}) {
  const [quality, setQuality] = useState<CaptureQuality>(initialQuality);
  const previousNoseRef = useRef<Point | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSampleAtRef = useRef(0);

  useEffect(() => {
    if (trackingState !== "tracking" || !video || landmarks.length === 0) {
      previousNoseRef.current = null;
      setQuality({
        ...initialQuality,
        guidance: trackingState === "multiple-faces"
          ? "Keep only one face in the camera view."
          : "Centre one face in the camera view.",
      });
      return;
    }

    const bounds = faceBounds(landmarks);
    const nose = landmarks[1];
    if (!bounds || !nose) return;

    const now = performance.now();
    if (now - lastSampleAtRef.current < 250) return;
    lastSampleAtRef.current = now;

    const framingGood =
      bounds.width >= 0.22 &&
      bounds.width <= 0.68 &&
      bounds.height >= 0.28 &&
      bounds.height <= 0.78 &&
      Math.abs(bounds.centerX - 0.5) <= 0.2 &&
      Math.abs(bounds.centerY - 0.5) <= 0.2;

    const priorNose = previousNoseRef.current;
    const displacement = priorNose
      ? Math.hypot(nose.x - priorNose.x, nose.y - priorNose.y)
      : 0;
    previousNoseRef.current = nose;
    const motion = displacement > 0.012 ? "moving" : "still";

    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const canvas = canvasRef.current;
    canvas.width = 64;
    canvas.height = 36;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let luminanceSum = 0;
    let clippedPixels = 0;
    const total = pixels.length / 4;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      luminanceSum += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      if (red > 248 || green > 248 || blue > 248 || red < 7 || green < 7 || blue < 7) clippedPixels += 1;
    }

    const averageLuminance = luminanceSum / total;
    const clippedRatio = clippedPixels / total;
    const lighting = averageLuminance < 55 ? "low" : averageLuminance > 205 ? "bright" : "balanced";
    const exposure = clippedRatio > 0.12 ? "clipped" : "clear";
    const level: QualityLevel = !framingGood || motion === "moving" || lighting !== "balanced" || exposure === "clipped"
      ? "fair"
      : "good";

    const guidance = !framingGood
      ? "Centre your face and move a little closer."
      : motion === "moving"
        ? "Hold still for a clearer measurement."
        : lighting === "low"
          ? "Add soft light in front of your face."
          : lighting === "bright" || exposure === "clipped"
            ? "Avoid direct or harsh light on your face."
            : "Conditions look suitable. Stay still before measuring.";

    setQuality({
      level,
      lighting,
      exposure,
      framing: framingGood ? "good" : "adjust",
      motion,
      guidance,
    });
  }, [landmarks, trackingState, video]);

  return quality;
}
