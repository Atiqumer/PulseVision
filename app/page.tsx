"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, CircleAlert, HeartPulse, LockKeyhole, RotateCcw, ShieldCheck, Video } from "lucide-react";
import { useFaceLandmarker } from "../features/face/useFaceLandmarker";
import { samplingRegions } from "../features/face/roiGeometry";
import { useCaptureQuality } from "../features/rppg/useCaptureQuality";
import { useRgbSampling } from "../features/rppg/useRgbSampling";

type CameraState = "idle" | "requesting" | "ready" | "error";

const waveform = "M0 75 C 12 75, 18 74, 24 69 S 38 41, 46 73 S 59 76, 67 75 S 78 73, 84 68 S 98 42, 106 74 S 121 78, 130 75 S 142 73, 149 68 S 162 39, 170 74 S 185 79, 194 75 S 207 72, 214 67 S 227 42, 235 74 S 250 78, 260 75 S 274 72, 280 68 S 294 40, 302 74 S 317 78, 330 75 S 345 72, 352 67 S 366 41, 374 74 S 390 79, 400 75";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [message, setMessage] = useState("Camera is off");
  const { trackingState, landmarks, errorMessage } = useFaceLandmarker({
    video: videoNode,
    enabled: cameraState === "ready",
  });
  const quality = useCaptureQuality({ video: videoNode, landmarks, trackingState });
  const { sampleCount, isSampling } = useRgbSampling({
    video: videoNode,
    landmarks,
    trackingState,
    qualityIsGood: quality.level === "good",
  });
  const setVideoRefs = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoNode(node);
  }, []);

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setMessage("This browser does not support camera access.");
      return;
    }

    setCameraState("requesting");
    setMessage("Requesting camera access…");
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
      setMessage("Camera ready — checking face position.");
    } catch {
      setCameraState("error");
      setMessage("Camera access was not granted. Check browser permissions and try again.");
    }
  }

  const cameraIsLive = cameraState === "ready";
  const trackingLabel = trackingState === "loading"
    ? "Loading face tracker"
    : trackingState === "searching"
      ? "Position one face in frame"
      : trackingState === "tracking"
        ? "Face found"
        : trackingState === "multiple-faces"
          ? "Only one face at a time"
          : trackingState === "error"
            ? "Tracker unavailable"
            : "Waiting for camera";

  return (
    <main className="min-h-screen bg-[#07111e] text-slate-100 selection:bg-cyan-300/30">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-cyan-300 text-[#07111e] shadow-[0_0_28px_rgba(103,232,249,.2)]"><HeartPulse className="size-5" strokeWidth={2.4} /></div>
            <div><p className="text-base font-semibold tracking-tight">PulseVision</p><p className="text-xs text-slate-400">Experimental camera-based pulse estimation</p></div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex"><LockKeyhole className="size-4 text-cyan-300" />Processing stays on this device</div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)] lg:py-12">
          <div className="rounded-[1.75rem] border border-white/10 bg-[#0b192a] p-3 shadow-2xl shadow-black/20 sm:p-4">
            <div className="relative aspect-video overflow-hidden rounded-[1.2rem] bg-[#040b14]">
              <video ref={setVideoRefs} className={`h-full w-full object-cover transition-opacity duration-500 ${cameraIsLive ? "opacity-100" : "opacity-0"}`} aria-label="Camera preview" muted playsInline />
              {!cameraIsLive && <div className="absolute inset-0 grid place-items-center px-6 text-center"><div><div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-200"><Camera className="size-7" /></div><p className="text-lg font-medium">Set up your camera</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">Sit facing soft, even light. Keep your face centred and still while measuring.</p></div></div>}
              {cameraIsLive && <><FaceOverlay landmarks={landmarks} /><div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-[#07111e]/80 px-3 py-2 text-xs backdrop-blur"><span className={`size-2 rounded-full ${quality.level === "good" ? "animate-pulse bg-cyan-300" : "bg-slate-400"}`} />{trackingState === "tracking" ? quality.guidance : trackingLabel}</div></>}
            </div>
            <div className="mt-4 flex flex-col gap-3 px-1 pb-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-300" aria-live="polite">{cameraState === "error" || trackingState === "error" ? <CircleAlert className="size-4 text-amber-300" /> : <ShieldCheck className="size-4 text-cyan-300" />}{errorMessage ?? (trackingState === "tracking" ? quality.guidance : message)}</div>
              <button type="button" onClick={cameraIsLive ? stopCamera : startCamera} disabled={cameraState === "requesting"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-[#07111e] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{cameraIsLive ? <RotateCcw className="size-4" /> : <Video className="size-4" />}{cameraIsLive ? "Restart camera" : cameraState === "requesting" ? "Opening camera…" : "Enable camera"}</button>
            </div>
          </div>

          <aside className="space-y-4">
            <div><p className="text-sm font-medium text-cyan-200">Measurement workspace</p><h1 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your pulse, measured with care.</h1><p className="mt-3 max-w-lg text-base leading-7 text-slate-400">Enable the camera to begin the face-position and lighting checks. A pulse estimate will appear only after the signal is stable enough.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><StatusCard label="Camera" value={cameraIsLive ? "Ready" : "Waiting"} good={cameraIsLive} /><StatusCard label="Face tracking" value={trackingLabel} good={trackingState === "tracking"} /><StatusCard label="Capture quality" value={quality.level === "good" ? "Ready to sample" : quality.guidance} good={quality.level === "good"} /><StatusCard label="RGB sampling" value={isSampling ? `Collecting locally (${sampleCount} samples)` : "Waiting for stable conditions"} good={isSampling} /><StatusCard label="Pulse estimate" value="Not measuring" good={false} /></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-200">Signal preview</p><span className="text-xs text-slate-500">Preview only</span></div><svg className="mt-4 h-24 w-full" viewBox="0 0 400 100" role="img" aria-label="Illustrative pulse waveform"><path d="M0 75 H400" stroke="rgba(148,163,184,.18)" strokeWidth="1" /><path d={waveform} fill="none" stroke="#67e8f9" strokeWidth="2.5" strokeLinecap="round" /></svg><p className="mt-2 text-xs leading-5 text-slate-500">This is a placeholder visual; live waveform processing is the next milestone.</p></div>
          </aside>
        </section>

        <footer className="border-t border-white/10 py-5 text-xs leading-5 text-slate-500 sm:flex sm:items-center sm:justify-between"><p>Wellness and educational use only — not a medical device or diagnostic tool.</p><p className="mt-2 flex items-center gap-1.5 sm:mt-0"><CheckCircle2 className="size-3.5 text-cyan-300" />No frames leave this browser.</p></footer>
      </div>
    </main>
  );
}

function StatusCard({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3.5"><p className="text-xs font-medium uppercase tracking-[.14em] text-slate-500">{label}</p><div className="mt-2 flex items-center gap-2"><span className={`size-2 rounded-full ${good ? "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.9)]" : "bg-slate-600"}`} /><p className="text-sm font-medium text-slate-200">{value}</p></div></div>;
}

function FaceOverlay({ landmarks }: { landmarks: Array<{ x: number; y: number }> }) {
  if (landmarks.length === 0) return <div className="absolute inset-[13%_26%_9%] rounded-[45%] border border-white/25" aria-hidden="true" />;

  return <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Detected face landmarks and pulse sampling regions">
    {landmarks.map((landmark, index) => <circle key={index} cx={landmark.x} cy={landmark.y} r="0.004" fill="#67e8f9" opacity="0.85" />)}
    {samplingRegions(landmarks).map((region) => {
      const points = region.points.map((point) => `${point.x},${point.y}`).join(" ");
      const labelPoint = region.points[0];
      return <g key={region.name}>
        <polygon points={points} fill="rgba(34,211,238,.18)" stroke="#facc15" strokeWidth="0.004" strokeLinejoin="round" />
        <text x={labelPoint.x} y={labelPoint.y - 0.012} fill="#fef08a" fontSize="0.027" fontWeight="600">{region.name}</text>
      </g>;
    })}
  </svg>;
}
