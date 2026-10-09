# Active Project Context

## Project

**Pulse Lens** — an experimental, privacy-first browser application for estimating resting pulse from webcam video. It is for wellness and educational use only; it is not a medical device.

## Current status

**Phase 1 is in progress.** Camera setup and the first face-tracking integration are implemented in source; local dependency installation and runtime verification remain with the project owner.

**Manual verification:** Passed on the local development server. A single face was detected and the cyan landmark overlay aligned correctly with the camera preview.

**Manual RGB-sampling verification:** Passed. Under good capture conditions, the sampler began collecting local samples and displayed an increasing count while the face regions remained correctly placed.

## Completed in this update

- Created the standalone application in `rppg-vital-monitor/`.
- Set up the React/TypeScript site foundation and installed project dependencies.
- Replaced the starter screen with the Pulse Lens measurement workspace.
- Added a responsive camera preview with start, stop, retry, permission-denied, and unsupported-browser states.
- Added local-processing and non-medical-use disclosures.
- Added measurement status panels and a clearly labelled illustrative waveform placeholder.
- Added the project-specific favicon and page metadata.
- Verified that the production build completes successfully.
- Created a private deployment target; publishing is pending environment permission to contact the deployment source repository.
- Added the MediaPipe Face Landmarker integration, configured for one accepted face and a development-facing landmark overlay.
- Added visible forehead and upper-cheek sampling-region overlays plus local framing, lighting, exposure, and motion checks.
- Replaced the original narrow landmark-index overlay with larger, conservative forehead and cheek sampling regions derived from the face bounds.
- Added an in-memory offscreen RGB sampler that averages valid pixels inside the three approved regions at up to 30 samples per second.

## Current behaviour

- Camera frames are displayed locally after the user explicitly grants permission.
- Stopping/restarting the camera releases the active stream.
- No camera frame, RGB sample, face landmark, BPM value, or session history is sent to a server.
- ROI extraction, signal quality assessment, and BPM estimation are not implemented yet. The user interface indicates this honestly.
- With the MediaPipe dependency installed, the app loads the Face Landmarker model, distinguishes no face/single face/multiple faces, and draws a landmark overlay for a single face. Lighting, motion, ROI, and pulse quality checks are still outstanding.
- With the MediaPipe dependency installed, the app loads the Face Landmarker model, distinguishes no face/single face/multiple faces, displays the sampling regions, and produces an early capture-readiness result. These are quality gates only; the app does not yet extract pulse data from the regions.
- When capture quality is good, the app now samples mean RGB values from the approved regions on an offscreen canvas. It keeps a bounded in-memory buffer and clears it whenever quality drops. Pulse processing has not started.

## Local verification requested from project owner

Run these commands from `rppg-vital-monitor/` after reviewing the changes:

```powershell
npm install
npm run dev
```

Then open the displayed local address, enable the camera, and check these states:

- One centred face shows the cyan landmark overlay and “Face found”.
- A centred, still face under even lighting shows three yellow ROI polygons (forehead and upper cheeks) and “Ready to sample”.
- Under those same conditions, “RGB sampling” changes to “Collecting locally” and its sample count increases steadily.
- Moving, leaving the frame, adding another face, or making conditions unsuitable stops sampling and resets the count to zero.
- Moving noticeably, sitting too far away/off-centre, using dim light, or using harsh direct light changes the capture-quality guidance instead of showing “Ready to sample”.
- No face shows “Position one face in frame”.
- A second face shows “Only one face at a time”.
- Denying camera permission displays a recovery message.

Finally run `npm run build` before committing.

## Remaining work

### Phase 1 — camera and face-quality prototype

- Validate the ROI boundaries and capture-quality guidance locally on target devices.
- Validate the larger sampling regions across face angles and distances; rotate/warp them with face pose if later testing shows a material benefit.

### Phase 2 — signal processing

- Derive conservative forehead/cheek polygon masks from landmarks.
- Extract timestamped mean RGB samples from an offscreen canvas.
- Implement and test windowed POS, filtering, FFT/peak selection, and confidence scoring.

### Phase 3 — live capture

- Connect accepted samples to the live pipeline.
- Add guided warm-up and 20-second capture state.
- Replace placeholder waveform with live data and only show BPM above confidence threshold.

### Phase 4 — local history and release

- Implement opt-in IndexedDB session summaries, review, and delete-all controls.
- Add accessibility, device/browser QA, production security headers, and deployment.

### Phase 5 — validation

- Compare estimates with an appropriate reference device under a documented resting-condition protocol before expanding any claims.

## Important rules for future updates

- Keep this file current after each material project update.
- Do not add medical, diagnostic, stress, HRV, blood pressure, SpO2, rhythm, or treatment claims without a separate validated scope.
- Do not display a numerical BPM when quality and confidence gates fail.
- Preserve local-first processing and seek explicit approval before adding telemetry or cloud storage.
