"use client";

import { useEffect, useRef, useState } from "react";
import { samplingRegions, type Point } from "../face/roiGeometry";
import type { TrackingState } from "../face/useFaceLandmarker";
import { createSampleExtractor, type RgbSample } from "./sampleExtractor";

const MAX_SAMPLES = 900;
const TARGET_INTERVAL_MS = 1000 / 30;

export function useRgbSampling({
  video,
  landmarks,
  trackingState,
  qualityIsGood,
}: {
  video: HTMLVideoElement | null;
  landmarks: Point[];
  trackingState: TrackingState;
  qualityIsGood: boolean;
}) {
  const landmarksRef = useRef<Point[]>([]);
  const samplesRef = useRef<RgbSample[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [isSampling, setIsSampling] = useState(false);

  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);

  useEffect(() => {
    const canSample = Boolean(video) && trackingState === "tracking" && qualityIsGood;
    if (!canSample || !video) {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      samplesRef.current = [];
      setSampleCount(0);
      setIsSampling(false);
      return;
    }

    const extractor = createSampleExtractor();
    let lastSampleAt = 0;
    let lastUiUpdateAt = 0;
    setIsSampling(true);

    const collect = (now: number) => {
      if (now - lastSampleAt >= TARGET_INTERVAL_MS) {
        lastSampleAt = now;
        const sample = extractor.sample(video, samplingRegions(landmarksRef.current));
        if (sample) {
          samplesRef.current.push(sample);
          if (samplesRef.current.length > MAX_SAMPLES) samplesRef.current.shift();
        }
      }

      if (now - lastUiUpdateAt >= 250) {
        lastUiUpdateAt = now;
        setSampleCount(samplesRef.current.length);
      }
      animationFrameRef.current = requestAnimationFrame(collect);
    };

    animationFrameRef.current = requestAnimationFrame(collect);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [qualityIsGood, trackingState, video]);

  return { sampleCount, isSampling, samplesRef };
}
