# PulseVision

## What is PulseVision?

PulseVision is an experimental browser application that explores estimating a person's resting pulse from a standard webcam. It uses **remote photoplethysmography (rPPG)**: tiny changes in reflected facial colour can contain a pulse signal.

The application is designed to process the camera feed locally in the browser. Webcam frames and the collected RGB signal are not uploaded by the app.

> PulseVision is for wellness and educational experimentation only. It is not a medical device and must not be used for diagnosis, monitoring, treatment, or medical decisions.

## What problem does it solve?

Traditional pulse measurement usually needs contact with the body, such as a smartwatch, fingertip sensor, or medical monitor. PulseVision investigates a contactless alternative that can work with a webcam.

Before estimating pulse, the application checks whether the capture conditions are acceptable:

- Exactly one face is visible.
- The face is centred and large enough in the frame.
- The person is sufficiently still.
- Lighting and exposure are suitable.
- Forehead and upper-cheek sampling regions are available.

When these checks pass, PulseVision collects mean red, green, and blue values from those regions. The upcoming signal-processing stage will turn this local RGB time series into a cautiously gated BPM estimate.

## Current functionality

- Webcam permission and local camera preview.
- Browser-based MediaPipe face tracking.
- One-face, no-face, and multiple-face feedback.
- Forehead and upper-cheek sampling overlays.
- Local quality checks for framing, movement, lighting, and exposure.
- In-memory RGB sampling that resets if capture quality drops.

Pulse estimation is not implemented yet, so the interface intentionally does not display BPM.

## How to run locally

### Prerequisites

- Node.js 22 or newer
- Chrome or Edge recommended for webcam testing

### Install and start

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal, click **Enable camera**, and allow browser camera access. Sit facing soft, even light and keep one face in frame.

### Verify a production build

```bash
npm run build
```

## Project status

See [active_context.md](./active_context.md) for the current work, completed milestones, test checklist, and remaining roadmap.
