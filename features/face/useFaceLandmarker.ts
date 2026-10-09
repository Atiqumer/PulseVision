"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const MEDIAPIPE_VERSION = "0.10.22-rc.20250304";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

export type TrackingState =
  | "idle"
  | "loading"
  | "searching"
  | "tracking"
  | "multiple-faces"
  | "error";

type UseFaceLandmarkerOptions = {
  video: HTMLVideoElement | null;
  enabled: boolean;
};

export function useFaceLandmarker({ video, enabled }: UseFaceLandmarkerOptions) {
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [faceCount, setFaceCount] = useState(0);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      lastVideoTimeRef.current = -1;
    };

    if (!enabled || !video) {
      stop();
      setTrackingState("idle");
      setFaceCount(0);
      setLandmarks([]);
      setErrorMessage(null);
      return stop;
    }

    const start = async () => {
      setTrackingState("loading");
      setErrorMessage(null);

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 2,
          minFaceDetectionConfidence: 0.6,
          minFacePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setTrackingState("searching");

        const processFrame = () => {
          if (cancelled || !landmarkerRef.current) return;

          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            const result = landmarkerRef.current.detectForVideo(video, performance.now());
            const nextFaceCount = result.faceLandmarks.length;
            setFaceCount(nextFaceCount);
            setLandmarks(nextFaceCount === 1 ? result.faceLandmarks[0] : []);
            setTrackingState(nextFaceCount === 0 ? "searching" : nextFaceCount === 1 ? "tracking" : "multiple-faces");
          }

          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch {
        if (!cancelled) {
          setTrackingState("error");
          setErrorMessage("Face tracking could not start. Check your network connection and refresh the page.");
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, video]);

  return { trackingState, faceCount, landmarks, errorMessage };
}
