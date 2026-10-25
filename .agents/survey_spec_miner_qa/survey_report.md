# QA & Verification Specification Report: Mic & Cam Testing Utility & Collateral Suite

**Project:** Modern Web-Based Microphone & Camera Diagnostic Utility with Marketing Collateral  
**Working Directory Target:** `/home/gourab/coding/sampleAgy/mic_cam_tester`  
**Quality & Testing Strategy:** 4-Tier Verification Architecture with Zero-Dependency Automated Test Harness  
**Author:** QA & Verification Spec Miner  
**Date:** 2026-08-23  

---

## 1. Executive Summary & Verification Strategy

The objective of this project is to build an industry-leading, privacy-first, zero-build-dependency web utility for diagnosing microphones, cameras, and audio output devices, complemented by comprehensive competitive research (`research/gap_analysis.md`) and a full marketing collateral suite (`marketing/`).

To guarantee exceptional software quality, resilience across diverse operating systems and browsers, and strict adherence to zero-telemetry and zero-dependency constraints, this document defines:
1. **Exhaustive Feature Inventory**: 36 fine-grained features across 7 functional categories extracted directly from `ORIGINAL_REQUEST.md`.
2. **4-Tier Testing Methodology**:
   - **Tier 1 (Feature Coverage)**: >=5 discrete positive verification test cases per feature (180+ test cases).
   - **Tier 2 (Boundary & Corner Cases)**: >=5 boundary, edge-case, and fault-injection test cases per feature (180+ test cases).
   - **Tier 3 (Cross-Feature Combinations)**: Pairwise matrix and concurrent feature interaction scenarios (35+ test cases).
   - **Tier 4 (Real-World Application Scenarios)**: 10 exhaustive end-to-end user workflows.
3. **Automated Test Infrastructure Blueprint (`TEST_INFRA.md`)**: A lightweight, robust test execution framework utilizing native Node.js 22 (`node:test`, `node:assert`, native `WebSocket`/`fetch`), comprehensive WebRTC/WebAudio DOM mocks, and automated headless Google Chrome E2E test scripts utilizing `--use-fake-device-for-media-stream` and Chrome DevTools Protocol (CDP) with zero third-party build/runtime dependencies.

---

## 2. Exhaustive Feature Inventory

| Feature ID | Category | Feature Name | Description & Functional Scope | Primary Inputs | Expected Outputs / Observable Behavior | Error Handling & Failure States | Discovered Via |
|---|---|---|---|---|---|---|---|
| **F-CAM-01** | Camera Diagnostics | Live Video Stream Preview | Render real-time video stream from selected camera in `<video>` element with autoplay, muted, playsinline, and optional mirror/flip toggle. | `MediaStreamTrack` from `getUserMedia({video: true})`, mirror button click | Video element active, playing live feed without freeze, mirror CSS transform (`scaleX(-1)`) applied. | `NotAllowedError` triggers troubleshooting banner; blank stream shows placeholder. | ORIGINAL_REQUEST R2.1 |
| **F-CAM-02** | Camera Diagnostics | Active Resolution & Aspect Ratio Detection | Detect and display native video stream resolution (`videoWidth` x `videoHeight`) and compute aspect ratio (16:9, 4:3, 1:1, 21:9, custom). | `HTMLVideoElement` `loadedmetadata` and `resize` events | Dynamic resolution badge (e.g. `1920x1080 (16:9 Full HD)`), color-coded quality badge. | Fallback to `0x0 (Unknown)` if stream metadata fails; gracefully handles dynamic track resize. | ORIGINAL_REQUEST R2.1 |
| **F-CAM-03** | Camera Diagnostics | Supported Resolution Capability Picker | Probe and switch between standard video resolutions (4K 3840x2160, 1080p 1920x1080, 720p 1280x720, 480p 640x480, 360p 640x360). | Resolution dropdown selection, `getUserMedia` with exact/ideal constraints | Video stream re-negotiated to target resolution, live resolution badge updated. | `OverconstrainedError` falls back gracefully to closest supported resolution with user toast. | ORIGINAL_REQUEST R2.1 |
| **F-CAM-04** | Camera Diagnostics | Real-time FPS Counter & Dropped Frame Monitor | Measure instantaneous and rolling-average frame rate using `requestVideoFrameCallback` (or `requestAnimationFrame` timestamp delta fallback). | Video frame rendering timestamps, frame counter delta | Live FPS display (e.g. `29.8 FPS`, `59.9 FPS`), rolling 60-frame moving average, dropped frame count. | Low FPS (<15 FPS) triggers low-framerate warning badge; zero FPS triggers frozen stream alert. | ORIGINAL_REQUEST R2.1 |
| **F-CAM-05** | Camera Diagnostics | Camera Device Enumeration & Switching | List all connected `videoinput` devices in a dropdown and switch active camera track without page reload. | `navigator.mediaDevices.enumerateDevices()`, device select event, `devicechange` event | Dropdown populated with device names, active stream swaps seamlessly to new `deviceId`. | Handle unlabeled devices (when permission pending); handle device disconnection mid-stream. | ORIGINAL_REQUEST R2.1 |
| **F-CAM-06** | Camera Diagnostics | Advanced Video Capabilities & Controls | Query and adjust hardware capabilities if supported (Zoom, Exposure, White Balance, Torch/Flash, Facing Mode: user/environment). | `MediaStreamTrack.getCapabilities()`, `getSettings()`, `applyConstraints()` | Capability sliders/toggles visible only when supported by hardware track. | Unsupported capabilities safely omitted or disabled without throwing exceptions. | ORIGINAL_REQUEST R2.1 |
| **F-CAM-07** | Camera Diagnostics | Snapshot & Frame Capture Engine | Capture high-resolution still image from video stream to HTML5 Canvas and allow user download/preview. | "Take Snapshot" button click, canvas `drawImage` | Modal/tray displaying captured photo, resolution info, "Download PNG/JPEG" button. | Canvas security taint handled; capture during inactive stream disabled. | ORIGINAL_REQUEST R2.1 |
| **F-MIC-01** | Microphone Diagnostics | Real-time Waveform Oscilloscope | Render dynamic time-domain audio waveform on HTML5 Canvas using Web Audio API `AnalyserNode`. | `MediaStreamAudioSourceNode` -> `AnalyserNode` -> `getByteTimeDomainData()` | Smooth 60 FPS oscilloscope visualizer displaying sound wave fluctuations in real-time. | Inactive mic renders flat baseline center line; handles audio context auto-suspend. | ORIGINAL_REQUEST R2.2 |
| **F-MIC-02** | Microphone Diagnostics | Frequency Spectrum Visualizer | Render FFT frequency spectrum analyzer on HTML5 Canvas with sub-band splitting (Bass, Mid, Treble) and peak frequency marker. | `AnalyserNode.getByteFrequencyData()`, FFT size 512/1024/2048 | Dynamic bar or area visualizer showing frequency distribution (20Hz - 20kHz), dominant Hz badge. | Silent input renders zero bars; handles sample rate differences (44.1kHz vs 48kHz). | ORIGINAL_REQUEST R2.2 |
| **F-MIC-03** | Microphone Diagnostics | Dynamic Volume & Peak dBFS Meter | Calculate RMS volume and peak decibels relative to full scale (dBFS: -60dB to 0dB) with multi-color gradient bar (Green/Yellow/Red). | Audio buffer Float32Array PCM samples, logarithmic conversion `20 * log10(RMS)` | Real-time decibel readout (e.g. `-18.4 dBFS`), smooth animated progress bar, peak hold marker. | Handles pure silence (-infinity dB clamped to -60 dBFS); high responsiveness (<50ms). | ORIGINAL_REQUEST R2.2 |
| **F-MIC-04** | Microphone Diagnostics | Audio Clipping & Distortion Detector | Detect audio input saturation (samples reaching >= 0.99 / 0 dBFS for consecutive samples) and display persistent/decaying clipping warning. | PCM audio sample threshold check (`Math.abs(sample) >= 0.99`) | "CLIPPING DETECTED" warning badge / red flash, clipping occurrence counter. | Auto-clears or offers "Reset Clipping Counter" button after clipping event. | ORIGINAL_REQUEST R2.2 |
| **F-MIC-05** | Microphone Diagnostics | Audio Input Latency Measurement | Calculate and report estimated audio hardware latency (`AudioContext.baseLatency` + `outputLatency`) and buffer round-trip estimate. | `AudioContext` latency properties, sample buffer size / sampleRate | Latency metric card (e.g. `Base Latency: 5.3 ms`, `Total Estimated: ~12.8 ms`, Rating: Excellent/Fair/High). | Graceful fallback to buffer calculation when `baseLatency` is unsupported in browser. | ORIGINAL_REQUEST R2.2 |
| **F-MIC-06** | Microphone Diagnostics | Ambient Background Noise Floor Indicator | Measure baseline noise floor during silent intervals to calculate ambient acoustic noise level and Signal-to-Noise Ratio (SNR). | Rolling minimum RMS calculation over 3-5 seconds of continuous monitoring | Noise floor level readout (e.g. `Noise Floor: -52 dBFS (Low/Quiet)`), estimated SNR calculation. | Handles constant loud environments with "High Background Noise Detected" advisory. | ORIGINAL_REQUEST R2.2 |
| **F-MIC-07** | Microphone Diagnostics | Interactive Record & Replay Loopback | Record user voice snippet (up to 30s) using `MediaRecorder` and provide instant interactive replay with waveform scrub bar and download. | Record/Stop button click, `MediaRecorder` chunks, `Blob` generation | Playback audio player, waveform scrubber, duration counter, "Play Snippet" & "Download Audio (WAV/WebM)". | `MediaRecorder` unsupported codec fallback (audio/webm, audio/mp4, audio/ogg); memory leak prevention. | ORIGINAL_REQUEST R2.2 |
| **F-MIC-08** | Microphone Diagnostics | Microphone Enumeration & Selection | Enumerate `audioinput` devices in dropdown, switch active microphone, and provide manual software gain slider (0% to 200%). | `enumerateDevices()`, device select, `GainNode.gain.value` slider | Audio stream seamlessly switches to selected mic; gain adjusts real-time volume. | Handle hot-unplugging of microphone gracefully without crashing AudioContext. | ORIGINAL_REQUEST R2.2 |
| **F-SPK-01** | Speaker / Output Test | Stereo Channel Balance Verification | Play discrete test tones (440Hz / 1kHz) independently in Left-only, Right-only, or Both channels using `StereoPannerNode` / `ChannelSplitterNode`. | "Test Left (L)", "Test Right (R)", "Test Both" button clicks | Clear tone played strictly in specified ear/speaker; animated directional sound waves in UI. | Autoplay restriction handled with interactive "Click to enable audio" prompt. | ORIGINAL_REQUEST R2.3 |
| **F-SPK-02** | Speaker / Output Test | Frequency Sweep Audio Generator | Generate a smooth logarithmic frequency sweep from 20Hz (sub-bass) to 20,000Hz (treble) with real-time Hz counter and pause/stop controls. | Sweep Start button, duration slider (5s, 10s, 20s), `OscillatorNode.frequency.exponentialRampToValueAtTime` | Continuous tone sweeping upward in pitch, real-time frequency gauge animating 20Hz -> 20kHz. | Stop button immediately silences oscillator; volume clamped to prevent hearing fatigue. | ORIGINAL_REQUEST R2.3 |
| **F-SPK-03** | Speaker / Output Test | Audio Output Device Selection | Enumerate `audiooutput` devices and route playback to chosen speaker/headphones using `HTMLMediaElement.setSinkId()`. | `enumerateDevices()` for `audiooutput`, dropdown selection | Audio output routed to selected headphones/speakers. | In browsers without `setSinkId` support (e.g. Safari), display informational compatibility badge. | ORIGINAL_REQUEST R2.3 |
| **F-SPK-04** | Speaker / Output Test | High-Fidelity Audio Sample & Noise Generator | Synthesize or playback calibrated audio test signals: White Noise, Pink Noise, Speech Sample, and Stereo Music Snippet. | Sound preset selector (White Noise, Pink Noise, Voice Clarity Sample, Stereo Music) | Calibrated synthetic noise or audio buffer playback with loop toggle. | Safe volume normalization to prevent sudden loud bursts. | ORIGINAL_REQUEST R2.3 |
| **F-TRB-01** | Permissions & Troubleshoot | WebRTC Error Classification & State Engine | Catch, classify, and explain all MediaDevices WebRTC DOMExceptions (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`, `SecurityError`). | `navigator.mediaDevices.getUserMedia()` Promise rejection | User-friendly error card with error title, reason explanation, and direct remediation steps. | Unknown error falls back to generic diagnostic guidance without silent failures. | ORIGINAL_REQUEST R2.4 |
| **F-TRB-02** | Permissions & Troubleshoot | Interactive Browser Permission Guides | Provide illustrated, step-by-step instructions for resetting camera/mic permissions across Chrome, Firefox, Safari, Edge, Brave, and Mobile browsers. | Browser selector tabs (Chrome, Firefox, Safari, Edge, Mobile), OS selector | Visual step-by-step instructions (e.g., Click lock icon in address bar -> Reset permissions -> Reload). | Automatically detects user's current browser (`navigator.userAgent`) and highlights relevant guide. | ORIGINAL_REQUEST R2.4 |
| **F-TRB-03** | Permissions & Troubleshoot | OS-Level Privacy & Security Guides | Step-by-step guides for enabling camera/microphone permissions in macOS (System Settings > Privacy), Windows (Settings > Privacy), and Linux (PipeWire/Pulse/V4L2). | Operating system selector (macOS, Windows 11/10, Linux, ChromeOS) | Clear path navigation and screenshot/text walkthrough of system permission toggles. | Detects client OS via User-Agent / Client Hints and defaults to active OS guide. | ORIGINAL_REQUEST R2.4 |
| **F-TRB-04** | Permissions & Troubleshoot | Real-time Permission State Monitor | Query and display real-time permission status for Camera and Microphone using the Permissions API (`navigator.permissions.query`). | `navigator.permissions.query({name: 'camera'/'microphone'})` status change | Status badges: "Granted" (Green), "Prompt / Ask" (Yellow), "Blocked / Denied" (Red). | In browsers not supporting camera/mic permission query, status shows "Ready to Test". | ORIGINAL_REQUEST R2.4 |
| **F-TRB-05** | Permissions & Troubleshoot | Diagnostic System Health Report Generator | Aggregate all hardware info, browser capabilities, WebRTC features, and active test metrics into a one-click copyable/downloadable report. | "Export Diagnostic Report" button click | Formatted JSON and Plaintext summary (OS, Browser, Device list, Resolution, FPS, Latency, Errors) for IT support. | Sanitizes any sensitive local network data; zero telemetry transmitted externally. | ORIGINAL_REQUEST R2.4 |
| **F-UI-01** | UI/UX & Architecture | Dark / Light Theme Engine | Support high-contrast Dark and Light color schemes with automatic OS preference detection (`prefers-color-scheme`) and persistent manual toggle. | Theme toggle button click, OS system theme change event | Instant CSS variable swap (`--bg-primary`, `--text-primary`, `--accent-color`), smooth transition, stored in `localStorage`. | Falls back to Dark mode if `localStorage` or `prefers-color-scheme` unavailable. | ORIGINAL_REQUEST R2.5 |
| **F-UI-02** | UI/UX & Architecture | Responsive Multi-Device Layout | Deliver a fluid, responsive layout across mobile (320px), tablet (768px), laptop (1024px), and 4K desktop (2560px+) without horizontal scrolling. | Viewport resize, orientation change (portrait/landscape) | Grid/Flexbox UI adapts: single-column stack on mobile, multi-column dashboard on desktop. | Controls remain accessible and touch-friendly (>=44px touch targets) on small screens. | ORIGINAL_REQUEST R2.5 |
| **F-UI-03** | UI/UX & Architecture | Privacy-First Zero-Telemetry Guarantee | Guarantee 100% client-side execution with zero external network requests, zero cookies, zero analytics, and zero external trackers. | Network inspection, page lifecycle | 0 outgoing HTTP/WebSocket requests after initial page load; explicit privacy banner and badge. | Automated test asserts 0 network requests triggered during any diagnostic test. | ORIGINAL_REQUEST R2.5 |
| **F-UI-04** | UI/UX & Architecture | Modular Tabbed Navigation System | Clean tabbed interface to switch between "Camera Test", "Microphone Test", "Speaker Test", "All-in-One Dashboard", and "Troubleshooting Hub". | Tab bar button clicks, URL hash navigation (`#camera`, `#microphone`, `#speaker`, `#troubleshoot`) | Active tab pane displayed; inactive tab media streams can be paused/muted to save CPU resources. | Direct deep linking via URL hash works on initial page load. | ORIGINAL_REQUEST R2.5 |
| **F-UI-05** | UI/UX & Architecture | Web Accessibility (WCAG 2.1 AA) & Keyboard Nav | Provide full keyboard navigation (Tab, Enter, Space, Esc), ARIA landmarks, roles, live regions for screen readers, and high contrast ratios. | Keyboard events (Tab, Space, Enter), Screen reader focus | Visible focus rings, screen reader announcements for test results/errors, ARIA tags on buttons. | Passes WCAG 2.1 AA contrast ratio requirements (>4.5:1 for normal text). | ORIGINAL_REQUEST R2.5 |
| **F-RES-01** | Competitive Research | Competitor Benchmark & UX Gap Matrix | Research report (`research/gap_analysis.md`) evaluating WebCamMicTest, MicTests, DeviceTests, OnlineMicTest, BrowserLeaks. | Web research on competitor websites, UX analysis, diagnostic audits | Detailed matrix comparing competitors on ads, diagnostic depth, mobile UX, privacy, and error flows. | Gaps categorized by severity and technical impact. | ORIGINAL_REQUEST R1, AC-1 |
| **F-RES-02** | Competitive Research | Technical Shortcoming & Architecture Analysis | Identify exact technical gaps (clipping detection, true latency measurement, channel balance, OS troubleshooting depth). | Technical analysis of WebRTC/WebAudio APIs and competitor scripts | Clear architectural requirements addressing competitor flaws. | Actionable specifications documented in markdown. | ORIGINAL_REQUEST R1, AC-1 |
| **F-RES-03** | Competitive Research | Actionable Feature Blueprint Specification | Blueprint mapping research findings directly to developer implementation contracts and UI wireframe flows. | Synthesis of research findings | Structured feature blueprint with implementation milestones. | Handed off cleanly for development phase. | ORIGINAL_REQUEST R1, AC-1 |
| **F-MKT-01** | Marketing Collateral | Promotional Email Sequences | Complete package of cold outreach, newsletter announcements, and launch sequence email templates (`marketing/email_campaigns.md`). | Target audience personas, value propositions (privacy, zero ads, pro diagnostics) | Full email copy with subject lines, preview text, body, CTAs, and sender profiles. | Verified for tone, structure, and marketing best practices. | ORIGINAL_REQUEST R3.1, AC-3 |
| **F-MKT-02** | Marketing Collateral | Viral Ad Scripts & Copy Package | Short-form video scripts (TikTok/Reels/Shorts), audio podcast ad copy, and search/social PPC ad copy (`marketing/ad_scripts.md`). | Format constraints (15s/30s/60s hooks, audio cues, visual cues) | Complete scripts with timing, visual descriptions, voiceover lines, and PPC headlines. | Structured with high-converting hooks and clear CTAs. | ORIGINAL_REQUEST R3.2, AC-3 |
| **F-MKT-03** | Marketing Collateral | Poster Concepts & AI Image Prompts | High-impact visual poster concepts, typography/layout copy, and exact AI generation prompts (`marketing/poster_concepts_and_prompts.md`). | Visual branding guidelines, Midjourney/DALL-E prompt engineering | Poster concept descriptions, text layouts, and ready-to-run AI image generation prompts with aspect ratios. | Prompts tested for syntax correctness and evocative visual framing. | ORIGINAL_REQUEST R3.3, AC-3 |
| **F-MKT-04** | Marketing Collateral | Go-To-Market Strategy & Personas | Comprehensive GTM plan (`marketing/gtm_strategy.md`) with launch timeline, 4 detailed personas, SEO keyword matrices, and channels. | Market analysis, audience segmentation (streamers, remote workers, educators, interviewees) | Complete GTM roadmap, persona profiles, primary/secondary SEO keywords, and distribution channels. | Actionable timeline with phased launch milestones. | ORIGINAL_REQUEST R3.4, AC-3 |

---

## 3. Four-Tier Testing Methodology

### Tier 1: Feature Coverage Suite (>=5 Test Cases per Feature)

Every feature in the inventory is tested with at least 5 distinct test cases covering its core functional path, UI interactions, API contracts, state transitions, and expected outputs (180+ explicit test cases).

#### Category A: Camera Diagnostics (35 Test Cases)
- **F-CAM-01: Live Video Stream Preview**
  - `TC-CAM01-01`: Start Camera initializes `getUserMedia({video: true})` and assigns stream to video element `srcObject`.
  - `TC-CAM01-02`: Video element autoplay attribute triggers stream playback without user needing secondary play click.
  - `TC-CAM01-03`: Video element maintains `muted` and `playsinline` attributes to prevent audio feedback and iOS fullscreen takeover.
  - `TC-CAM01-04`: Mirror Video toggle applies `transform: scaleX(-1)` to video element and updates toggle button visual state.
  - `TC-CAM01-05`: Stop Camera releases all active video tracks via `track.stop()`, clears `srcObject`, and shows idle placeholder.

- **F-CAM-02: Active Resolution & Aspect Ratio Detection**
  - `TC-CAM02-01`: Reads `video.videoWidth` and `video.videoHeight` upon `loadedmetadata` event and updates DOM resolution text.
  - `TC-CAM02-02`: Computes exact aspect ratio 16:9 for 1920x1080 and 1280x720 resolutions and displays standard ratio label.
  - `TC-CAM02-03`: Computes exact aspect ratio 4:3 for 640x480 and 1024x768 resolutions and displays standard ratio label.
  - `TC-CAM02-04`: Computes custom / unusual aspect ratios (e.g. 1:1 square webcam, 21:9 ultrawide) and displays fractional format.
  - `TC-CAM02-05`: Re-calculates and updates resolution display immediately when video track resolution changes dynamically.

- **F-CAM-03: Supported Resolution Capability Picker**
  - `TC-CAM03-01`: Dropdown lists standard test resolutions: 4K (3840x2160), 1080p (1920x1080), 720p (1280x720), 480p (640x480).
  - `TC-CAM03-02`: Selecting 720p requests stream with `{width: {ideal: 1280}, height: {ideal: 720}}` and reloads stream.
  - `TC-CAM03-03`: Selecting 1080p requests stream with `{width: {ideal: 1920}, height: {ideal: 1080}}` and updates stream.
  - `TC-CAM03-04`: "Test All Resolutions" probe sequentially queries resolutions and flags which ones the connected camera supports.
  - `TC-CAM03-05`: Active resolution picker item highlights current resolution matched to detected stream dimensions.

- **F-CAM-04: Real-time FPS Counter & Dropped Frame Monitor**
  - `TC-CAM04-01`: `requestVideoFrameCallback` or `requestAnimationFrame` loop calculates instantaneous FPS from timestamp delta.
  - `TC-CAM04-02`: Calculates rolling 60-frame moving average FPS and displays formatted decimal string (e.g. "29.9 FPS").
  - `TC-CAM04-03`: Detects 60 FPS cameras and displays smooth green 60 FPS indicator.
  - `TC-CAM04-04`: Compares rendered frames with expected frames to compute and display dropped frame count.
  - `TC-CAM04-05`: Stops FPS calculation loop when camera is stopped to prevent CPU / memory leak.

- **F-CAM-05: Camera Device Enumeration & Switching**
  - `TC-CAM05-01`: `enumerateDevices()` filters `kind === 'videoinput'` and populates select dropdown with device labels.
  - `TC-CAM05-02`: Selecting second camera in dropdown stops current track and calls `getUserMedia({video: {deviceId: {exact: id}}})`.
  - `TC-CAM05-03`: Device change event (`navigator.mediaDevices.ondevicechange`) triggers automated device list refresh.
  - `TC-CAM05-04`: Disconnecting active camera triggers camera lost banner and prompts user to select available device.
  - `TC-CAM05-05`: Persists last selected camera `deviceId` in session storage for seamless return visits.

- **F-CAM-06: Advanced Video Capabilities & Controls**
  - `TC-CAM06-01`: `getCapabilities()` queries video track for zoom, exposure, torch, and white balance support.
  - `TC-CAM06-02`: Renders zoom slider if `capabilities.zoom` exists and executes `track.applyConstraints({advanced: [{zoom: val}]})`.
  - `TC-CAM06-03`: Renders torch toggle button if `capabilities.torch` exists and toggles flashlight state.
  - `TC-CAM06-04`: Facing mode switcher toggles between `user` (front) and `environment` (back) on mobile devices.
  - `TC-CAM06-05`: Safely hides advanced controls pane if connected camera returns empty capabilities object.

- **F-CAM-07: Snapshot & Frame Capture Engine**
  - `TC-CAM07-01`: "Take Snapshot" creates hidden canvas with `videoWidth` x `videoHeight` dimensions and executes `drawImage()`.
  - `TC-CAM07-02`: Snapshot preview modal opens displaying captured still frame with timestamp and resolution metadata.
  - `TC-CAM07-03`: "Download Image" button triggers browser download of `webcam-snapshot-[timestamp].png`.
  - `TC-CAM07-04`: "Copy to Clipboard" button writes canvas blob to system clipboard using `navigator.clipboard.write()`.
  - `TC-CAM07-05`: "Close Snapshot" button closes modal, disposes canvas memory, and resumes live preview focus.

#### Category B: Microphone Diagnostics (40 Test Cases)
- **F-MIC-01: Real-time Waveform Oscilloscope**
  - `TC-MIC01-01`: `AudioContext` connects `MediaStreamSource` -> `AnalyserNode` with `fftSize = 2048`.
  - `TC-MIC01-02`: Canvas animation loop calls `analyser.getByteTimeDomainData()` and draws continuous polyline.
  - `TC-MIC01-03`: Sine wave audio input renders clear periodic oscillatory wave on canvas.
  - `TC-MIC01-04`: Dynamic Canvas resizing automatically adjusts drawing buffer width/height to match CSS layout dimensions.
  - `TC-MIC01-05`: Canvas rendering cleans up and halts `requestAnimationFrame` loop when microphone test is stopped.

- **F-MIC-02: Real-time Frequency Spectrum Visualizer**
  - `TC-MIC02-01`: `analyser.getByteFrequencyData()` retrieves frequency bin magnitudes from 0 to Nyquist frequency.
  - `TC-MIC02-02`: Visualizer renders vertical frequency bars with gradient fill (cyan to magenta) across 20Hz-20kHz.
  - `TC-MIC02-03`: Calculates and displays peak frequency (dominant pitch) badge in Hz (e.g. "Peak: 440 Hz").
  - `TC-MIC02-04`: Aggregates energy into Bass (20-250Hz), Mid (250-4000Hz), and Treble (4000-20000Hz) status meters.
  - `TC-MIC02-05`: Switching visualizer mode between Bars, Line, and Filled Area smoothly re-renders spectrum style.

- **F-MIC-03: Dynamic Volume & Peak dBFS Meter**
  - `TC-MIC03-01`: Calculates Root Mean Square (RMS) of audio sample buffer and converts to decibels `20 * log10(RMS)`.
  - `TC-MIC03-02`: Maps dBFS range (-60 dBFS to 0 dBFS) to 0% - 100% meter bar with Green (-60 to -18), Yellow (-18 to -3), Red (-3 to 0).
  - `TC-MIC03-03`: Displays numeric dBFS readout updated at 30-60 Hz (e.g. "-14.2 dBFS").
  - `TC-MIC03-04`: Peak hold indicator retains maximum volume tick mark for 1.5 seconds before smoothly decaying.
  - `TC-MIC03-05`: Clamps minimum value at -60 dBFS (or -inf) during absolute silence without NaN/Infinity display errors.

- **F-MIC-04: Audio Clipping & Distortion Detector**
  - `TC-MIC04-01`: Inspects PCM float samples for absolute values exceeding 0.99 (or byte data >= 254).
  - `TC-MIC04-02`: Triggers bright red "CLIPPING DETECTED" visual banner and audio clipping alert badge upon detection.
  - `TC-MIC04-03`: Increments and displays total clipping event counter (e.g. "Clipping Events: 3").
  - `TC-MIC04-04`: Clipping warning banner remains visible for 2 seconds after clipping ceases, then resets to normal state.
  - `TC-MIC04-05`: "Reset Clipping" button clears clipping counter and warning state manually.

- **F-MIC-05: Audio Input Latency Measurement**
  - `TC-MIC05-01`: Queries `AudioContext.baseLatency` and displays reported hardware buffer latency in milliseconds.
  - `TC-MIC05-02`: Queries `AudioContext.outputLatency` where supported and computes combined audio subsystem latency.
  - `TC-MIC05-03`: Displays latency quality rating: "Ultra Low (<10ms)", "Low (10-25ms)", "Moderate (25-50ms)", "High (>50ms)".
  - `TC-MIC05-04`: Displays audio hardware sample rate (e.g. "48,000 Hz / 48 kHz") and channel count.
  - `TC-MIC05-05`: Handles browsers lacking `baseLatency` property by estimating latency from audio buffer size and sample rate.

- **F-MIC-06: Ambient Background Noise Floor Indicator**
  - `TC-MIC06-01`: Tracks minimum RMS volume level over rolling 3-second window during quiet intervals.
  - `TC-MIC06-02`: Displays ambient noise floor level in dBFS (e.g. "Noise Floor: -54 dBFS").
  - `TC-MIC06-03`: Evaluates environment noise quality: "Studio Quiet (<-50dB)", "Normal Room (-50 to -40dB)", "Noisy Room (>-40dB)".
  - `TC-MIC06-04`: Computes live Signal-to-Noise Ratio (SNR) delta between active speech volume and background noise floor.
  - `TC-MIC06-05`: Provides "Calibrate Noise Floor" button allowing user to capture 3 seconds of ambient room silence.

- **F-MIC-07: Interactive Record & Replay Loopback**
  - `TC-MIC07-01`: "Start Recording" initializes `MediaRecorder` with mic audio stream and starts visual recording timer.
  - `TC-MIC07-02`: "Stop Recording" (or 30s auto-stop) stops recorder, creates `Blob` with MIME type `audio/webm` or `audio/wav`.
  - `TC-MIC07-03`: Loopback audio player appears with Play/Pause button, time slider, and mini audio waveform.
  - `TC-MIC07-04`: Clicking Play plays recorded audio through default speakers/headphones with synchronized playback cursor.
  - `TC-MIC07-05`: "Download Recording" button allows saving audio file (`mic-test-recording.webm` / `.wav`).

- **F-MIC-08: Microphone Enumeration & Selection**
  - `TC-MIC08-01`: `enumerateDevices()` populates microphone dropdown with all connected `audioinput` devices.
  - `TC-MIC08-02`: Selecting a different microphone switches audio stream to target `deviceId` without page reload.
  - `TC-MIC08-03`: Software Gain slider adjusts `GainNode.gain.value` between 0.0 (muted) and 2.0 (200% boost).
  - `TC-MIC08-04`: Mute toggle button instantly sets gain to 0 and shows muted indicator badge.
  - `TC-MIC08-05`: Disconnecting microphone mid-test updates device dropdown and displays mic disconnected alert.

#### Category C: Speaker / Output Test (20 Test Cases)
- **F-SPK-01: Stereo Channel Balance Verification**
  - `TC-SPK01-01`: "Test Left Channel" plays 440Hz sine wave tone through `StereoPannerNode` with `pan.value = -1.0` (Left only).
  - `TC-SPK01-02`: "Test Right Channel" plays 440Hz sine wave tone through `StereoPannerNode` with `pan.value = +1.0` (Right only).
  - `TC-SPK01-03`: "Test Both Channels" plays centered tone with `pan.value = 0.0` (Stereo center).
  - `TC-SPK01-04`: Interactive UI animates left or right virtual ear/speaker graphic synchronously with active audio playback.
  - `TC-SPK01-05`: "Stop Test Tone" button immediately silences active oscillator and resets visual animation.

- **F-SPK-02: Frequency Sweep Audio Generator**
  - `TC-SPK02-01`: "Start Sweep" initializes `OscillatorNode` ramping logarithmically from 20 Hz to 20,000 Hz over selected duration (5s/10s).
  - `TC-SPK02-02`: Real-time frequency display animates current Hz value with audible spectrum classification (Sub-bass, Bass, Mid, Treble).
  - `TC-SPK02-03`: Frequency sweep progress bar moves smoothly from 0% to 100% in sync with pitch progression.
  - `TC-SPK02-04`: Master volume control slider scales sweep output gain smoothly from 0% to 100% to prevent ear fatigue.
  - `TC-SPK02-05`: "Pause / Resume" and "Stop" buttons immediately control oscillator state and ramp envelope down to prevent audio clicks.

- **F-SPK-03: Audio Output Device Selection**
  - `TC-SPK03-01`: Checks for `HTMLMediaElement.prototype.setSinkId` support and populates `audiooutput` devices.
  - `TC-SPK03-02`: Selecting output device invokes `setSinkId(deviceId)` on test audio elements.
  - `TC-SPK03-03`: Shows output device selection dropdown on supported browsers (Chrome, Edge).
  - `TC-SPK03-04`: Displays polite fallback notification on unsupported browsers (Firefox, Safari) explaining OS default speaker routing.
  - `TC-SPK03-05`: Handles `setSinkId` promise rejection gracefully if chosen output device is busy or disconnected.

- **F-SPK-04: High-Fidelity Audio Sample & Noise Generator**
  - `TC-SPK04-01`: "White Noise" generator produces randomized uniform noise buffer across all audible frequencies.
  - `TC-SPK04-02`: "Pink Noise" generator applies -3dB/octave filter to produce equal energy per octave test noise.
  - `TC-SPK04-03`: "Voice Clarity Sample" plays synthesized vocal frequency benchmark for testing speech intelligibility.
  - `TC-SPK04-04`: "Stereo Music Sample" plays high-fidelity stereo audio track testing bass response and stereo separation.
  - `TC-SPK04-05`: Loop toggle allows continuous playback or single-shot playback of chosen audio sample.

#### Category D: Permissions & Troubleshooting Hub (25 Test Cases)
- **F-TRB-01: WebRTC Error Classification & State Engine**
  - `TC-TRB01-01`: Traps `NotAllowedError` / `PermissionDeniedError` and renders clear "Permission Denied by User" banner.
  - `TC-TRB01-02`: Traps `NotFoundError` / `DevicesNotFoundError` and renders "No Camera / Microphone Hardware Found" banner.
  - `TC-TRB01-03`: Traps `NotReadableError` / `TrackStartError` and renders "Hardware In Use By Another Application" warning.
  - `TC-TRB01-04`: Traps `OverconstrainedError` and displays "Selected Resolution Not Supported by Camera" advisory.
  - `TC-TRB01-05`: Traps `SecurityError` (e.g. non-HTTPS context) and displays "Insecure Origin / HTTPS Required" alert.

- **F-TRB-02: Interactive Browser Permission Guides**
  - `TC-TRB02-01`: User Agent detection automatically selects active browser tab (Chrome, Firefox, Safari, Edge, Mobile).
  - `TC-TRB02-02`: Chrome guide displays step-by-step instructions: URL bar lock icon -> Site settings -> Camera/Mic -> Allow -> Reload.
  - `TC-TRB02-03`: Safari guide displays instructions: Safari menu -> Settings for this website -> Camera & Microphone -> Allow.
  - `TC-TRB02-04`: Firefox guide displays instructions: URL bar permission icon -> Clear blocked permission -> Reload.
  - `TC-TRB02-05`: "Copy Reset Steps" button copies text instructions to clipboard for easy reference while following steps.

- **F-TRB-03: OS-Level Privacy & Security Guides**
  - `TC-TRB03-01`: Detects client OS (macOS, Windows, Linux, iOS, Android) and displays relevant OS permission section.
  - `TC-TRB03-02`: macOS guide provides exact path: Apple Menu -> System Settings -> Privacy & Security -> Camera / Microphone -> Enable Browser.
  - `TC-TRB03-03`: Windows guide provides exact path: Start -> Settings -> Privacy & Security -> Camera/Microphone -> Allow apps to access.
  - `TC-TRB03-04`: Linux guide provides instructions for PipeWire, PulseAudio, and V4L2 device group permissions (`video`, `audio`).
  - `TC-TRB03-05`: Interactive checklist allows user to tick off troubleshooting steps as they complete them.

- **F-TRB-04: Real-time Permission State Monitor**
  - `TC-TRB04-01`: Calls `navigator.permissions.query({name: 'camera'})` and renders current status badge (Granted/Prompt/Denied).
  - `TC-TRB04-02`: Calls `navigator.permissions.query({name: 'microphone'})` and renders current status badge.
  - `TC-TRB04-03`: Listens to `permissionStatus.onchange` and updates UI status badges instantly when user changes permission in browser settings.
  - `TC-TRB04-04`: Displays "Permission Granted" green shield badge when both camera and microphone are authorized.
  - `TC-TRB04-05`: Gracefully handles browsers where Permissions API does not support camera/mic name descriptors.

- **F-TRB-05: Diagnostic System Health Report Generator**
  - `TC-TRB05-01`: "Generate Diagnostic Report" collates OS, Browser version, Screen res, WebRTC support, Device list, Max Camera res, Mic latency into JSON.
  - `TC-TRB05-02`: Displays formatted plaintext diagnostic report in a code block with syntax styling.
  - `TC-TRB05-03`: "Copy Report to Clipboard" copies clean formatted diagnostic text.
  - `TC-TRB05-04`: "Download JSON Report" downloads `system-diagnostic-report-[timestamp].json`.
  - `TC-TRB05-05`: Report includes cryptographic timestamp and passes zero-telemetry check (no data sent over network).

#### Category E: UI/UX, Privacy & Accessibility (25 Test Cases)
- **F-UI-01: Dark / Light Theme Engine**
  - `TC-UI01-01`: Detects `window.matchMedia('(prefers-color-scheme: dark)')` on startup and sets matching theme.
  - `TC-UI01-02`: Theme toggle button toggles `data-theme="dark"` / `data-theme="light"` on document root.
  - `TC-UI01-03`: Stores user preference in `localStorage.getItem('app-theme')` and restores it on page reload.
  - `TC-UI01-04`: Canvas visualizers (waveform, spectrum) dynamically adjust background and grid line colors to match active theme.
  - `TC-UI01-05`: Theme switch causes zero layout shifts (CLS = 0) and maintains active video/audio stream playback.

- **F-UI-02: Responsive Multi-Device Layout**
  - `TC-UI02-01`: Renders cleanly at 320px mobile viewport width with stacked controls and full-width video/visualizers.
  - `TC-UI02-02`: Renders tablet layout (768px - 1024px) with balanced 2-column diagnostic cards.
  - `TC-UI02-03`: Renders desktop layout (1024px - 2560px) with comprehensive side-by-side diagnostic dashboard.
  - `TC-UI02-04`: Touch targets for all buttons and sliders are >= 44px by 44px on mobile devices for touch ergonomics.
  - `TC-UI02-05`: Handles device orientation changes (portrait to landscape) without interrupting media stream.

- **F-UI-03: Privacy-First Zero-Telemetry Guarantee**
  - `TC-UI03-01`: Inspects page source to verify 0 external `<script src="...">` tags from analytics, CDNs, or tracking domains.
  - `TC-UI03-02`: Network request interceptor verifies 0 outgoing fetch/xhr/beacon requests during full app operation.
  - `TC-UI03-03`: Privacy badge in footer displays "100% Client-Side / Zero Telemetry" with modal explaining local-only data processing.
  - `TC-UI03-04`: Audio recordings and camera snapshots reside purely in browser memory/Blob URLs and are never uploaded.
  - `TC-UI03-05`: Application operates with 100% feature parity when device is in Airplane Mode / completely offline.

- **F-UI-04: Modular Tabbed Navigation System**
  - `TC-UI04-01`: Tab buttons switch between "Camera", "Microphone", "Speaker", "Troubleshooter", and "Full Dashboard".
  - `TC-UI04-02`: Switching tabs updates URL hash (e.g. `#camera`, `#microphone`, `#speaker`) without triggering page reload.
  - `TC-UI04-03`: Loading page with `#microphone` in URL automatically opens Microphone tab directly.
  - `TC-UI04-04`: Inactive tabs mute audio visualizer render loops to preserve battery and CPU when not visible.
  - `TC-UI04-05`: Returning to a tab restores previous diagnostic state (active camera feed, current settings).

- **F-UI-05: Web Accessibility (WCAG 2.1 AA) & Keyboard Nav**
  - `TC-UI05-01`: All interactive elements (buttons, selectors, sliders, tabs) are reachable and operable via keyboard Tab/Enter/Space.
  - `TC-UI05-02`: High-contrast visible focus outline (`:focus-visible`) highlights currently focused element.
  - `TC-UI05-03`: Video player, canvas visualizers, and meters have appropriate `aria-label`, `role="meter"`, and `role="region"` attributes.
  - `TC-UI05-04`: Screen reader live region (`aria-live="polite"`) announces test completion and permission error states.
  - `TC-UI05-05`: Color contrast ratio of all text against background exceeds WCAG 2.1 AA standard (>= 4.5:1).

#### Category F: Competitive Research Deliverables (15 Test Cases)
- **F-RES-01: Competitor Benchmark & UX Gap Matrix**
  - `TC-RES01-01`: `research/gap_analysis.md` exists and evaluates at least 4 major competitors (WebCamMicTest, MicTests, DeviceTests, etc.).
  - `TC-RES01-02`: Document contains comparative matrix covering Ads/Monetization, Mobile Responsiveness, Diagnostic Depth, Privacy, and UX.
  - `TC-RES01-03`: Documents specific technical shortcomings: lack of clipping detection, no true latency calculation, poor stereo balance tests.
  - `TC-RES01-04`: Analyzes competitor permission error dead-ends where users are stranded without guidance.
  - `TC-RES01-05`: Formats analysis with executive summary, competitor profiles, gap tables, and strategic opportunity map.

- **F-RES-02: Technical Shortcoming & Architecture Analysis**
  - `TC-RES02-01`: Technical analysis details WebRTC `MediaStreamTrack` constraint negotiation differences across browsers.
  - `TC-RES02-02`: Details Web Audio API `AnalyserNode` FFT configuration and time-domain vs frequency-domain data processing.
  - `TC-RES02-03`: Formulates formulas for RMS calculation, dBFS scale mapping, and noise floor estimation.
  - `TC-RES02-04`: Details `StereoPannerNode` and `ChannelSplitterNode` architecture for discrete channel audio testing.
  - `TC-RES02-05`: Provides clear architecture diagrams/flows for zero-dependency client-side execution.

- **F-RES-03: Actionable Feature Blueprint Specification**
  - `TC-RES03-01`: Blueprint provides concrete feature list mapped to user pain points identified in gap analysis.
  - `TC-RES03-02`: Defines modular file structure and UI wireframe structure for implementation.
  - `TC-RES03-03`: Specifies browser compatibility matrix (Chrome, Firefox, Safari, Edge, iOS, Android).
  - `TC-RES03-04`: Outlines performance benchmarks (60 FPS rendering, <10% CPU usage, <50ms audio latency).
  - `TC-RES03-05`: Includes review sign-off section verifying completeness before coding handoff.

#### Category G: Marketing & Promotional Collateral (20 Test Cases)
- **F-MKT-01: Promotional Email Sequences**
  - `TC-MKT01-01`: `marketing/email_campaigns.md` exists and contains Cold Outreach sequence (3-stage email drip).
  - `TC-MKT01-02`: Contains Product Launch / Newsletter Announcement email for tech/productivity communities.
  - `TC-MKT01-03`: Contains Remote Worker / Enterprise IT Onboarding email sequence.
  - `TC-MKT01-04`: Every email template includes Subject Line variations, Preview Text, Body Copy, and Call-to-Action (CTA) buttons.
  - `TC-MKT01-05`: Copy highlights privacy guarantee, zero ads, clipping detection, and fast diagnostic capabilities.

- **F-MKT-02: Viral Ad Scripts & Copy Package**
  - `TC-MKT02-01`: `marketing/ad_scripts.md` exists and contains 3 short-form video scripts (TikTok/Reels/Shorts: 15s, 30s, 60s).
  - `TC-MKT02-02`: Short-form scripts include Visual Scene directions, On-Screen Text cues, Audio/Voiceover script, and Hook.
  - `TC-MKT02-03`: Contains 60-second Audio Podcast Ad script formatted for host-read sponsorship.
  - `TC-MKT02-04`: Contains Pay-Per-Click (PPC) and Social Ad copy package (Google Search ads, Facebook/LinkedIn headlines & descriptions).
  - `TC-MKT02-05`: Scripts target relatable pain points (mic muffled on Zoom interview, webcam washed out, distorted audio).

- **F-MKT-03: Poster Concepts & AI Image Generation Prompts**
  - `TC-MKT03-01`: `marketing/poster_concepts_and_prompts.md` exists and contains at least 3 distinct visual poster concepts.
  - `TC-MKT03-02`: Visual concepts detail Headline typography, subheadline copy, layout grid, and color palette.
  - `TC-MKT03-03`: Provides exact, production-ready AI image generation prompts for Midjourney / DALL-E 3 with aspect ratios (`--ar 16:9`, `--ar 9:16`, `--ar 1:1`).
  - `TC-MKT03-04`: Prompts specify art style (cyberpunk neon diagnostic HUD, minimalist modern clean UI, 3D claymorphic hardware).
  - `TC-MKT03-05`: Includes social media feature highlight banner concepts with banner copy.

- **F-MKT-04: Go-To-Market Strategy & Personas**
  - `TC-MKT04-01`: `marketing/gtm_strategy.md` contains comprehensive launch timeline (Pre-Launch, Launch Day, Post-Launch growth).
  - `TC-MKT04-02`: Details 4 distinct target audience personas (Streamer / Content Creator, Remote Professional, Educator / Student, Job Interviewee).
  - `TC-MKT04-03`: Provides primary and secondary SEO keyword research tables with search intent and target landing tags.
  - `TC-MKT04-04`: Defines multi-channel distribution plan (Product Hunt, Reddit /r/webdev /r/streaming, Hacker News, Discord).
  - `TC-MKT04-05`: Defines key performance indicators (KPIs) and growth milestones for adoption tracking.

---

### Tier 2: Boundary & Corner Cases Suite (>=5 Test Cases per Feature, 180+ Total)

#### Category A: Camera Diagnostics Boundary Cases (35 Test Cases)
- **F-CAM-01 (Live Stream Preview)**
  - `TC-CAM01-B01`: Browser with 0 connected video devices requests camera -> triggers `NotFoundError` gracefully without crashing.
  - `TC-CAM01-B02`: User rapidly toggles "Start/Stop Camera" 20 times in 2 seconds -> prevents race conditions or orphaned media tracks.
  - `TC-CAM01-B03`: Camera permission is granted but video stream sends blank/black frames -> detects zero-data stream and alerts user.
  - `TC-CAM01-B04`: Video element resized to 1px by 1px -> canvas/video rendering calculations do not trigger division-by-zero.
  - `TC-CAM01-B05`: Video track muted by hardware privacy switch (`track.onmute`) -> UI displays "Camera hardware shutter closed or muted".

- **F-CAM-02 (Resolution & Aspect Ratio Detection)**
  - `TC-CAM02-B01`: `videoWidth` and `videoHeight` are 0 during initial mount -> displays "Initializing..." rather than "0x0 NaN:NaN".
  - `TC-CAM02-B02`: Camera outputs non-standard resolution (e.g. 752x416 or 1080x1920 portrait) -> correctly calculates exact non-integer aspect ratio.
  - `TC-CAM02-B03`: Resolution changes abruptly mid-stream (e.g. camera auto-downscales due to bandwidth/lighting) -> updates resolution badge in real-time.
  - `TC-CAM02-B04`: Extremely high resolution feed (4K 3840x2160 or 8K) -> UI badges do not overflow or cause layout clipping.
  - `TC-CAM02-B05`: Stream track orientation changes (mobile rotation 90 deg) -> aspect ratio swaps width/height gracefully.

- **F-CAM-03 (Supported Resolution Capability Picker)**
  - `TC-CAM03-B01`: Selecting 4K on a 720p webcam triggers `OverconstrainedError` -> automatically falls back to highest valid resolution.
  - `TC-CAM03-B02`: Probing resolution with fractional aspect ratios -> constraints parser rounds safely without exception.
  - `TC-CAM03-B03`: Switching resolution while camera is stopping -> handles abort signal without uncaught promise rejection.
  - `TC-CAM03-B04`: Rapidly selecting multiple resolutions in dropdown -> queues or cancels intermediate requests to prevent pipeline lock.
  - `TC-CAM03-B05`: All probed resolutions fail -> displays "Custom Camera Resolution Active" with native dimensions.

- **F-CAM-04 (FPS Counter & Dropped Frame Monitor)**
  - `TC-CAM04-B01`: Frame rate drops below 5 FPS (extreme low light) -> FPS counter updates accurately and triggers low-light performance warning.
  - `TC-CAM04-B02`: High-speed 120 FPS / 240 FPS camera feed -> counter scales accurately without capping at 60 FPS.
  - `TC-CAM04-B03`: Browser tab minimized / hidden (`document.hidden = true`) -> pauses FPS calculation to prevent background timer accumulation.
  - `TC-CAM04-B04`: System clock changes or timer jitter -> delta calculations clamp negative or infinite elapsed times.
  - `TC-CAM04-B05`: Camera stream completely freezes (0 frames rendered for >3s) -> UI flags "Stream Stalled / Frozen".

- **F-CAM-05 (Camera Enumeration & Switching)**
  - `TC-CAM05-B01`: `enumerateDevices()` returns empty array -> dropdown shows "No cameras detected" and disables switch button.
  - `TC-CAM05-B02`: 10+ virtual / physical cameras connected -> dropdown renders cleanly with scrollbar without breaking UI.
  - `TC-CAM05-B03`: Camera unplugged during active video preview -> traps track `ended` event and notifies user immediately.
  - `TC-CAM05-B04`: Camera plugged in while app is open -> `devicechange` listener detects new device and updates dropdown list.
  - `TC-CAM05-B05`: Device label is empty string (permissions not yet granted) -> displays "Camera 1 (Permission Needed)" placeholder.

- **F-CAM-06 (Advanced Video Capabilities & Controls)**
  - `TC-CAM06-B01`: `applyConstraints({advanced: [{zoom: 10}]})` exceeds max zoom -> clamps to `capabilities.zoom.max`.
  - `TC-CAM06-B02`: `getCapabilities` throws or returns undefined -> gracefully defaults to basic camera mode without UI error.
  - `TC-CAM06-B03`: Torch toggled on laptop webcam (unsupported) -> torch button remains hidden.
  - `TC-CAM06-B04`: Rapidly dragging zoom slider -> debounces constraint applications to prevent browser camera driver crash.
  - `TC-CAM06-B05`: Mobile front/back camera switch during active stream -> stops previous track before requesting opposite facing mode.

- **F-CAM-07 (Snapshot & Frame Capture Engine)**
  - `TC-CAM07-B01`: Snapshot triggered while video is buffering (dimensions 0x0) -> displays warning "Wait for video stream to start".
  - `TC-CAM07-B02`: Snapshot taken on 4K stream -> canvas memory allocation handled without exceeding browser heap limit.
  - `TC-CAM07-B03`: Browser denies clipboard write permission -> falls back to automatic file download with notice.
  - `TC-CAM07-B04`: Snapshot modal opened and closed 50 times -> canvas elements cleanly garbage collected with 0 memory leak.
  - `TC-CAM07-B05`: Snapshot taken on mirrored video -> exported image preserves user-chosen mirror state option.

#### Category B: Microphone Diagnostics Boundary Cases (40 Test Cases)
- **F-MIC-01 (Waveform Oscilloscope)**
  - `TC-MIC01-B01`: `AudioContext` initialized in suspended state due to browser autoplay policy -> shows "Click to activate audio" overlay.
  - `TC-MIC01-B02`: Pure 0-amplitude signal (muted mic) -> renders perfectly centered horizontal line at mid-canvas.
  - `TC-MIC01-B03`: Maximum amplitude square wave -> waveform peaks clamp cleanly at canvas top/bottom borders without rendering artifacts.
  - `TC-MIC01-B04`: Window resized to extreme narrow width (200px) -> canvas adapts without horizontal scroll overflow.
  - `TC-MIC01-B05`: High CPU load causes frame drops -> visualizer drops frames gracefully without desynchronizing audio stream.

- **F-MIC-02 (Frequency Spectrum Visualizer)**
  - `TC-MIC02-B01`: Input audio contains only ultrasonic (>20kHz) or infrasonic (<20Hz) frequencies -> spectrum renders cleanly at edge bins.
  - `TC-MIC02-B02`: White noise input with flat spectrum -> renders uniform bar distribution without visual spikes.
  - `TC-MIC02-B03`: FFT size switched dynamically (256 -> 1024 -> 4096) -> re-allocates typed arrays without throwing index errors.
  - `TC-MIC02-B04`: Sample rate of 96 kHz / 192 kHz audio interface -> frequency scale adapts Nyquist frequency appropriately.
  - `TC-MIC02-B05`: Tab switched to background -> visualizer rendering loop throttles down to save battery.

- **F-MIC-03 (Volume & Peak dBFS Meter)**
  - `TC-MIC03-B01`: Absolute mathematical silence (RMS = 0) -> dBFS formula clamps to -60 dBFS without returning `-Infinity`.
  - `TC-MIC03-B02`: Constant maximum volume (RMS = 1.0) -> dBFS reads exactly 0.0 dBFS and bar reaches 100%.
  - `TC-MIC03-B03`: Rapid microsecond sound bursts (finger snaps) -> peak hold meter captures peak accurately despite short duration.
  - `TC-MIC03-B04`: DC offset in faulty microphone hardware -> applies high-pass filter or RMS centering to prevent false volume floor.
  - `TC-MIC03-B05`: Volume meter rendered on high-DPI (Retina) screen -> canvas/DOM meter scales crisply without pixelation.

- **F-MIC-04 (Audio Clipping Detector)**
  - `TC-MIC04-B01`: Single isolated 1.0 sample -> clipping counter increments reliably.
  - `TC-MIC04-B02`: Continuous sustained clipping for 10 seconds -> warning badge stays active, counter tracks duration without integer overflow.
  - `TC-MIC04-B03`: Audio level at 0.98 (-0.17 dBFS) -> does not trigger false positive clipping alert.
  - `TC-MIC04-B04`: Software gain slider boosted to 200% on normal input -> detects digital clipping introduced by gain node.
  - `TC-MIC04-B05`: Rapid switching between microphones -> resets clipping state cleanly for new device.

- **F-MIC-05 (Audio Latency Diagnostic)**
  - `TC-MIC05-B01`: Browser returns `baseLatency = 0` or `undefined` -> displays estimated latency based on buffer size with "(Estimated)" tag.
  - `TC-MIC05-B02`: Bluetooth headset with high latency (>150ms) -> correctly categorizes as "High Latency (Bluetooth/Wireless)".
  - `TC-MIC05-B03`: Low-latency ASIO / CoreAudio interface (<3ms) -> correctly displays "Ultra-Low Latency".
  - `TC-MIC05-B04`: Audio context sample rate mismatch with OS -> calculates buffer latency using actual context sample rate.
  - `TC-MIC05-B05`: AudioContext closed and re-opened -> latency diagnostic updates with new context parameters.

- **F-MIC-06 (Ambient Noise Floor Indicator)**
  - `TC-MIC06-B01`: Constantly noisy environment (> -30 dBFS) -> displays "High Ambient Noise / Acoustic Shielding Recommended".
  - `TC-MIC06-B02`: Noise floor calibration triggered while user is actively talking -> detects voice activity and asks user to remain silent for calibration.
  - `TC-MIC06-B03`: Microphone hardware self-noise (hiss) -> isolates constant electrical hiss level from transient noises.
  - `TC-MIC06-B04`: Calibration interrupted by device switch -> cancels calibration timer cleanly.
  - `TC-MIC06-B05`: Noise floor lower than -80 dBFS (studio preamp) -> clamps display gracefully.

- **F-MIC-07 (Record & Replay Loopback)**
  - `TC-MIC07-B01`: Recording reaches 30-second maximum limit -> automatically stops recording and generates playback blob.
  - `TC-MIC07-B02`: User clicks "Stop Recording" after 0.2 seconds (ultra-short snippet) -> handles short blob without playback decoding error.
  - `TC-MIC07-B03`: `MediaRecorder.isTypeSupported` checks `audio/webm`, `audio/mp4`, `audio/ogg`, `audio/wav` -> picks supported MIME type.
  - `TC-MIC07-B04`: User records 10 consecutive snippets -> revokes old `URL.createObjectURL` references to prevent browser memory leak.
  - `TC-MIC07-B05`: Replay triggered while microphone visualizer is active -> loopback audio does not create acoustic feedback loop in visualizer.

- **F-MIC-08 (Microphone Enumeration & Selection)**
  - `TC-MIC08-B01`: 0 microphones detected -> UI displays "No microphone detected" and disables test controls.
  - `TC-MIC08-B02`: Microphone disconnected during active recording -> `MediaRecorder.stop()` invoked safely and warning displayed.
  - `TC-MIC08-B03`: Software gain set to 0.0 -> volume meter drops to -60 dBFS and oscilloscope flattens.
  - `TC-MIC08-B04`: Software gain set to 2.0 -> doubles audio amplitude and accurately reflects in visualizers.
  - `TC-MIC08-B05`: Multiple microphones with identical model names -> appends unique index (e.g. "USB Mic (1)", "USB Mic (2)").

#### Category C: Speaker / Output Test Boundary Cases (20 Test Cases)
- **F-SPK-01 (Stereo Channel Balance)**
  - `TC-SPK01-B01`: Mono audio output hardware (single speaker phone) -> plays tone without throwing stereo panner error.
  - `TC-SPK01-B02`: User clicks "Test Left" and immediately clicks "Test Right" -> cleanly switches tone panning without click/pop artifact.
  - `TC-SPK01-B03`: Volume set to 0% -> tone generator runs silently without throwing error.
  - `TC-SPK01-B04`: Tone left playing for extended duration (5+ minutes) -> does not trigger browser audio memory buildup.
  - `TC-SPK01-B05`: Browser tab closed while tone is playing -> AudioContext disposes immediately without background hum.

- **F-SPK-02 (Frequency Sweep Generator)**
  - `TC-SPK02-B01`: Frequency sweep reaches 20,000 Hz limit -> ramps down gain to 0 cleanly before stopping oscillator.
  - `TC-SPK02-B02`: User pauses sweep at 3,450 Hz and resumes -> oscillator resumes from exact paused frequency.
  - `TC-SPK02-B03`: Sweep duration set to minimum (2 seconds) -> exponential ramp calculates fast progression without audio glitch.
  - `TC-SPK02-B04`: Sweep duration set to maximum (30 seconds) -> visual frequency gauge stays in lockstep with oscillator pitch.
  - `TC-SPK02-B05`: User drags frequency slider manually while sweep is running -> overrides sweep with manual continuous tone generator.

- **F-SPK-03 (Speaker Output Device Selection)**
  - `TC-SPK03-B01`: `setSinkId` not supported (Safari / iOS) -> UI displays clean badge "Default System Output (Browser Managed)".
  - `TC-SPK03-B02`: Selected output device disconnected -> catches `setSinkId` error and reverts to default output device.
  - `TC-SPK03-B03`: Bluetooth speaker takes 2 seconds to establish connection -> UI displays loading spinner on output selector.
  - `TC-SPK03-B04`: Output device with restricted permissions -> informs user to allow audio output permissions.
  - `TC-SPK03-B05`: Switching output device during active frequency sweep -> transfers active audio playback without restart.

- **F-SPK-04 (Audio Sample & Noise Generator)**
  - `TC-SPK04-B01`: Pink noise filter buffer generation on low-power CPU -> pre-generates 2-second looped buffer to minimize CPU cycles.
  - `TC-SPK04-B02`: Rapidly toggling between White Noise, Pink Noise, and Voice Sample -> cross-fades smoothly without audio popping.
  - `TC-SPK04-B03`: Sample playback volume set to 100% -> peak amplitude is normalized to -3 dBFS to prevent speaker blowouts.
  - `TC-SPK04-B04`: Continuous looping audio sample plays for 1 hour -> audio buffer repeats seamlessly without glitch or memory increase.
  - `TC-SPK04-B05`: Audio sample load failure (if asset missing) -> falls back to synthetic Web Audio tone generation.

#### Category D: Permissions & Troubleshooting Boundary Cases (25 Test Cases)
- **F-TRB-01 (WebRTC Error Classification)**
  - `TC-TRB01-B01`: `NotAllowedError` thrown with message "Permission dismissed" vs "Permission denied" -> differentiates temporary vs permanent blocks.
  - `TC-TRB01-B02`: `NotReadableError` thrown when another browser tab holds webcam lock -> specific advice: "Close other video tabs (Zoom/Meet)".
  - `TC-TRB01-B03`: `OverconstrainedError` with constraint "width" -> identifies exact failing constraint in user message.
  - `TC-TRB01-B04`: `SecurityError` thrown on `file://` protocol in certain browsers -> instructs user to open via local web server or HTTPS.
  - `TC-TRB01-B05`: Unrecognized custom DOMException -> displays error name, code, and standard troubleshooting checklist.

- **F-TRB-02 (Browser Permission Guides)**
  - `TC-TRB02-B01`: Obscure / niche browser (Vivaldi, Arc, Opera, Tor) -> provides Chromium or Gecko-based guidance based on engine detection.
  - `TC-TRB02-B02`: User in Private / Incognito browsing window -> adds specific incognito permission persistence warning.
  - `TC-TRB02-B03`: User manually clicks different browser tabs -> active guide switches immediately without page scroll jump.
  - `TC-TRB02-B04`: Mobile Safari on iOS with standalone PWA mode -> displays iOS home screen web app permission instructions.
  - `TC-TRB02-B05`: High-contrast mode enabled in OS -> troubleshooting diagrams and icons maintain readability.

- **F-TRB-03 (OS-Level Privacy Guides)**
  - `TC-TRB03-B01`: macOS version detection (macOS Sequoia/Sonoma vs older Catalina) -> provides modern System Settings navigation.
  - `TC-TRB03-B02`: Windows 11 vs Windows 10 navigation differences -> displays toggle for Windows 10 vs Windows 11 paths.
  - `TC-TRB03-B03`: Linux user without V4L2 device permissions -> provides exact terminal command (`sudo usermod -a -G video gourab`).
  - `TC-TRB03-B04`: Android 13/14 granular media permissions -> provides step-by-step App Permissions navigation.
  - `TC-TRB03-B05`: ChromeOS / Chromebook device -> provides ChromeOS Settings > Privacy and Security guidance.

- **F-TRB-04 (Real-time Permission State Monitor)**
  - `TC-TRB04-B01`: User revokes camera permission in browser settings while page is open -> status changes to "Denied" in real-time.
  - `TC-TRB04-B02`: User grants camera permission in browser popup -> status changes to "Granted" in real-time.
  - `TC-TRB04-B03`: `navigator.permissions` unsupported -> status chips fallback to "Test Camera to Check Status".
  - `TC-TRB04-B04`: Permissions API throws `TypeError` for `{name: 'camera'}` (Firefox behavior) -> handles error silently and uses getUserMedia check.
  - `TC-TRB04-B05`: Repeated permission queries -> caches permission status listener to prevent listener leaks.

- **F-TRB-05 (Diagnostic Health Report Generator)**
  - `TC-TRB05-B01`: Diagnostic report generated when no tests have been run -> outputs "Not Tested" for test metrics without crashing.
  - `TC-TRB05-B02`: Report generated with 5 cameras and 6 mics connected -> cleanly formats multi-device list in JSON and Text.
  - `TC-TRB05-B03`: Clipboard copy blocked by browser -> automatically highlights text area for manual `Ctrl+C` / `Cmd+C` copy.
  - `TC-TRB05-B04`: Report JSON serialization with circular structures -> safe JSON serializer prevents serialization exceptions.
  - `TC-TRB05-B05`: Download report filename on OS with special character restrictions -> sanitizes timestamp string for file systems.

#### Category E: UI/UX, Privacy & Accessibility Boundary Cases (25 Test Cases)
- **F-UI-01 (Dark / Light Theme Engine)**
  - `TC-UI01-B01`: `localStorage` is disabled (Private mode with strict storage cookies blocked) -> theme toggle functions in-memory.
  - `TC-UI01-B02`: System theme changes while user has explicit manual theme override -> respects user's manual override preference.
  - `TC-UI01-B03`: Rapidly clicking theme toggle 50 times -> transitions finish cleanly without CSS desynchronization.
  - `TC-UI01-B04`: Contrast ratio verified in both Dark and Light themes -> passes AA 4.5:1 ratio across all text elements.
  - `TC-UI01-B05`: Custom theme CSS variables inspected -> all color tokens have valid CSS color fallbacks.

- **F-UI-02 (Responsive Multi-Device Layout)**
  - `TC-UI02-B01`: Viewport width at absolute minimum 320px (iPhone SE) -> no horizontal scrollbar appears on page.
  - `TC-UI02-B02`: Ultra-wide display 3840px (4K) -> content centers gracefully in max-width container without stretching out of proportion.
  - `TC-UI02-B03`: Split-screen multitasking on iPad / Foldable phone -> layout flexes dynamically between single and dual column.
  - `TC-UI02-B04`: Mobile virtual keyboard opens -> fixed footer / modal does not obscure active input fields.
  - `TC-UI02-B05`: High zoom level (400% browser zoom for accessibility) -> UI elements reflow without overlapping text.

- **F-UI-03 (Privacy-First Zero-Telemetry Guarantee)**
  - `TC-UI03-B01`: Page loaded in simulated offline mode (`navigator.onLine = false`) -> 100% of diagnostic features function without network error.
  - `TC-UI03-B02`: CSP (Content Security Policy) header test -> zero inline script violations and zero unauthorized connect-src violations.
  - `TC-UI03-B03`: LocalStorage inspected -> stores only user UI preferences (`theme`), zero tracking tokens or UUID identifiers.
  - `TC-UI03-B04`: Third-party script injection attempt -> app operates inside strict isolation with 0 dependency on external CDNs.
  - `TC-UI03-B05`: Audio/video blobs inspected in memory -> blobs are created locally via `URL.createObjectURL` and released via `URL.revokeObjectURL`.

- **F-UI-04 (Modular Tabbed Navigation System)**
  - `TC-UI04-B01`: Invalid URL hash provided (e.g. `#nonexistent-tab`) -> defaults safely to first tab (Dashboard or Camera).
  - `TC-UI04-B02`: Rapid clicking between tabs while camera stream is initializing -> cancels previous tab transition safely.
  - `TC-UI04-B03`: Switching tabs while audio sweep is active -> audio sweep continues or pauses gracefully per user preference setting.
  - `TC-UI04-B04`: Browser Back / Forward buttons clicked -> updates active tab corresponding to history hash change.
  - `TC-UI04-B05`: Tab bar on small mobile screen -> scrolls horizontally with touch swipe indicators if tabs overflow width.

- **F-UI-05 (Web Accessibility & Keyboard Nav)**
  - `TC-UI05-B01`: Full user workflow completed using ONLY keyboard (Tab, Shift+Tab, Space, Enter, Arrow keys, Esc) -> 100% operable.
  - `TC-UI05-B02`: Esc key pressed inside snapshot modal or troubleshooting dialog -> closes modal and returns focus to trigger button.
  - `TC-UI05-B03`: Screen reader testing -> all buttons have descriptive aria-labels (e.g. "Test Left Speaker Channel", "Start Recording Voice").
  - `TC-UI05-B04`: Reduced motion preference (`prefers-reduced-motion: reduce`) -> disables rapid visualizer animations / smooth scrolls.
  - `TC-UI05-B05`: Color blindness simulation (Protanopia, Deuteranopia, Tritanopia) -> dBFS volume meter uses text & pattern cues in addition to color.

#### Category F: Competitive Research Boundary Cases (15 Test Cases)
- **F-RES-01 (Competitor Benchmark & Matrix)**
  - `TC-RES01-B01`: Gap analysis covers ad density and intrusive popups on competitor sites with quantitative metrics.
  - `TC-RES01-B02`: Evaluates competitor performance on throttled mobile 3G connections.
  - `TC-RES01-B03`: Analyzes competitor privacy policies and tracking pixel usage (e.g. Google Analytics, ad networks).
  - `TC-RES01-B04`: Evaluates competitor behavior when camera is blocked or in use by another app.
  - `TC-RES01-B05`: Cross-references competitor diagnostic accuracy against hardware ground truth.

- **F-RES-02 (Technical Shortcomings)**
  - `TC-RES02-B01`: Analyzes why competitors fail to report audio clipping (lack of PCM buffer threshold inspection).
  - `TC-RES02-B02`: Analyzes why competitors show inaccurate FPS (relying on `setInterval` instead of `requestVideoFrameCallback`).
  - `TC-RES02-B03`: Analyzes lack of stereo panning in competitor speaker tests.
  - `TC-RES02-B04`: Identifies browser-specific WebRTC bugs documented in Chromium and WebKit issue trackers.
  - `TC-RES02-B05`: Details mathematical formulas for audio decibel conversion and Nyquist frequency bin mapping.

- **F-RES-03 (Actionable Feature Blueprint)**
  - `TC-RES03-B01`: Blueprint accounts for browsers with missing `setSinkId` support.
  - `TC-RES03-B02`: Blueprint accounts for mobile browsers with restrictive autoplay and audio context policies.
  - `TC-RES03-B03`: Defines clear separation of concerns (Camera module, Audio module, UI module, Diagnostics engine).
  - `TC-RES03-B04`: Specifies fallback strategies for legacy browsers lacking modern WebRTC methods.
  - `TC-RES03-B05`: Documents acceptance checklist verifying every gap identified in research has a corresponding implementation feature.

#### Category G: Marketing Collateral Boundary Cases (20 Test Cases)
- **F-MKT-01 (Email Campaigns)**
  - `TC-MKT01-B01`: Email templates tested for plain-text formatting fallback compatibility.
  - `TC-MKT01-B02`: Email subject lines tested for spam trigger words and length constraints (<50 chars for mobile inbox).
  - `TC-MKT01-B03`: Cold outreach email includes clear personalized hooks for IT managers and remote team leads.
  - `TC-MKT01-B04`: Product launch email includes distinct CTAs for testing tool vs sharing on social media.
  - `TC-MKT01-B05`: Unsubscribe and privacy compliance disclaimers included in email footers.

- **F-MKT-02 (Ad Scripts & Copy)**
  - `TC-MKT02-B01`: Short-form video scripts strictly adhere to 15-second, 30-second, and 60-second pacing constraints.
  - `TC-MKT02-B02`: TikTok script hooks formulated for the critical first 3 seconds to maximize viewer retention.
  - `TC-MKT02-B03`: Podcast host-read script includes natural conversational transitions and audio-only demonstrations.
  - `TC-MKT02-B04`: Google Search PPC ad headlines strictly adhere to 30-character limit and descriptions to 90-character limit.
  - `TC-MKT02-B05`: Social media ad copy variations formulated for both technical (developers/streamers) and non-technical (remote workers) audiences.

- **F-MKT-03 (Poster Concepts & Prompts)**
  - `TC-MKT03-B01`: AI image prompts include precise negative prompts to prevent distorted anatomy or text artifacts.
  - `TC-MKT03-B02`: Image prompts specify exact aspect ratios (`--ar 16:9` for landscape banners, `--ar 9:16` for mobile stories).
  - `TC-MKT03-B03`: Poster typography layouts specify font pairing hierarchies and contrast guidelines.
  - `TC-MKT03-B04`: Prompts provide variations across 3 distinct aesthetic styles (Futuristic HUD, Clean Minimalist, 3D Isometric).
  - `TC-MKT03-B05`: Visual concepts provide exact hex color codes for brand consistency.

- **F-MKT-04 (GTM Strategy & Personas)**
  - `TC-MKT04-B01`: Personas include detailed pain points, tech stack, primary goals, and preferred social channels.
  - `TC-MKT04-B02`: SEO keyword matrix includes search volume estimates, competition tier, and target page metadata.
  - `TC-MKT04-B03`: Launch roadmap includes contingency plans for launch day traffic spikes and social media engagement.
  - `TC-MKT04-B04`: Community distribution plan provides tailored submission copy for Reddit, Hacker News, and Discord.
  - `TC-MKT04-B05`: Defines quantitative success metrics (e.g. 10,000 monthly active tests, 0 telemetry complaints).

---

### Tier 3: Cross-Feature Combinations Suite (Pairwise Matrix)

| Combination ID | Feature A | Feature B | Feature C | Test Scenario & Verification Objective | Expected Behavior |
|---|---|---|---|---|---|
| **TC-PAIR-01** | F-CAM-01 (Live Video) | F-MIC-01 (Oscilloscope) | F-MIC-03 (dBFS Meter) | Full Audio-Video simultaneous testing: Stream live 1080p video while rendering 60 FPS audio waveform and dynamic dBFS volume meter. | Both video and audio render smoothly without frame dropping, audio glitching, or CPU spiking (>20%). |
| **TC-PAIR-02** | F-CAM-01 (Live Video) | F-MIC-07 (Audio Loopback) | F-CAM-07 (Snapshot) | Capture snapshot image while active microphone loopback recording is in progress with live camera feed. | Snapshot captures pristine frame; audio recording continues uninterrupted with 0 missing audio chunks. |
| **TC-PAIR-03** | F-SPK-01 (Stereo Panner) | F-MIC-01 (Oscilloscope) | F-MIC-03 (Volume Meter) | Run Left/Right speaker balance test while microphone oscilloscope is active on internal speakers/mic. | Oscilloscope detects speaker output tone (acoustic coupling); speaker tone plays without stuttering. |
| **TC-PAIR-04** | F-SPK-02 (Freq Sweep) | F-MIC-02 (Freq Spectrum) | F-MIC-04 (Clipping) | Run 20Hz-20kHz frequency sweep while spectrum analyzer is monitoring mic input. | Spectrum analyzer peak frequency marker tracks speaker sweep frequency in real-time; clipping warning fires if volume too high. |
| **TC-PAIR-05** | F-CAM-03 (Res Switch) | F-CAM-04 (FPS Counter) | F-UI-01 (Theme Switch) | Switch camera resolution from 720p to 1080p while FPS counter is measuring and toggle Dark/Light theme simultaneously. | Stream re-negotiates cleanly, FPS counter continues calculating without NaN, canvas visualizer colors update instantly. |
| **TC-PAIR-06** | F-CAM-05 (Device Switch) | F-MIC-08 (Mic Switch) | F-TRB-04 (Permission Mon) | Switch both camera device and microphone device simultaneously in multi-device setup. | Both streams re-bind to selected device IDs; permission monitor retains "Granted" status without permission re-prompts. |
| **TC-PAIR-07** | F-MIC-07 (Audio Loopback) | F-SPK-03 (Output Switch) | F-MIC-03 (dBFS Meter) | Replay recorded audio loopback snippet while changing speaker output device (`setSinkId`). | Audio playback routes to newly selected output device; dBFS meter reflects replay audio levels. |
| **TC-PAIR-08** | F-CAM-01 (Live Video) | F-TRB-01 (Error State) | F-TRB-05 (Diag Export) | Camera stream disconnected mid-test (simulated track stop / unplug) -> Export Diagnostic Report. | Error state catches track termination, displays warning banner, and exported JSON report logs "Camera Disconnected During Test". |
| **TC-PAIR-09** | F-UI-04 (Tab Switch) | F-CAM-01 (Live Video) | F-MIC-01 (Oscilloscope) | User switches from Camera tab to Speaker tab to Troubleshooting tab while streams are active. | Background streams either maintain state or throttle rendering gracefully; returning to Camera tab resumes live preview instantly. |
| **TC-PAIR-10** | F-UI-02 (Responsive) | F-CAM-01 (Live Video) | F-MIC-02 (Spectrum) | Rapidly resize browser window between 320px mobile width and 1920px desktop width while video & spectrum are rendering. | Layout dynamically shifts between single-column and multi-column; canvas visualizers resize buffers without distortion or crash. |
| **TC-PAIR-11** | F-MIC-08 (Gain Boost) | F-MIC-04 (Clipping) | F-MIC-06 (Noise Floor) | Boost software mic gain to 200% on quiet speech in noisy room. | Clipping detector flags saturation if gain pushes peaks to 0 dBFS; noise floor indicator reflects amplified ambient floor. |
| **TC-PAIR-12** | F-TRB-02 (Browser Guide) | F-TRB-04 (Permission Mon)| F-CAM-01 (Camera Start) | User follows Chrome troubleshooting guide, resets permissions, and clicks "Restart Camera". | Permission monitor reflects state transition from "Denied" to "Granted"; camera stream starts immediately. |
| **TC-PAIR-13** | F-UI-05 (Keyboard Nav) | F-CAM-07 (Snapshot) | F-MIC-07 (Audio Loopback) | Navigate entire app using only keyboard Tab/Enter/Space: Start Camera, Take Snapshot, Record Audio Snippet, Replay. | All buttons activate on Space/Enter; modal dialog traps keyboard focus; focus returns to trigger on modal close. |
| **TC-PAIR-14** | F-UI-03 (Offline Check) | F-SPK-04 (Noise Gen) | F-TRB-05 (Diag Export) | Disconnect network (offline mode), generate pink noise audio test, and export system diagnostic report. | Pink noise generates purely via Web Audio API; diagnostic report exports locally; zero network errors generated. |
| **TC-PAIR-15** | F-CAM-06 (Zoom/Torch) | F-CAM-02 (Resolution) | F-CAM-04 (FPS Counter) | Apply 2x hardware zoom on mobile camera while monitoring active resolution and FPS counter. | Zoom applies cleanly via constraints; resolution and FPS remain stable without stream re-initialization. |

---

### Tier 4: Real-World Application Scenarios (End-to-End User Workflows)

1. **Scenario WF-01: Remote Job Interview Prep**
   - *Workflow*: User accesses app -> Grants camera & mic permissions -> Confirms 1080p 30 FPS video with mirror mode -> Verifies mic dBFS meter in optimal zone (-18 dBFS) -> Records 5s loopback audio snippet & plays back -> Runs Speaker test tone -> Enters interview fully verified in < 60s.
2. **Scenario WF-02: Live Streamer Pre-Flight Check**
   - *Workflow*: Streamer selects Capture Card input -> Probes 60 FPS stability -> Tests XLR mic input and checks Audio Clipping detector at high vocal peaks -> Balances stereo headphones with Left/Right channel isolation.
3. **Scenario WF-03: IT Support Remote Diagnostic Export**
   - *Workflow*: User experiencing camera failure opens tool -> Tool catches `NotReadableError` ("Camera in use by Zoom/Teams") -> User clicks "Export Diagnostic Report" -> Copies clean JSON report with hardware and OS metrics into support ticket.
4. **Scenario WF-04: Telehealth Mobile Patient Quick-Check**
   - *Workflow*: Patient on 375px smartphone opens site -> Mobile layout renders large touch targets -> Patient checks front camera, flips to rear camera -> Verifies mic speech bar and speaker chime.
5. **Scenario WF-05: Hardware Troubleshooting & Permission Recovery**
   - *Workflow*: User on macOS Firefox accidentally blocks camera -> Tool detects `NotAllowedError` -> Displays macOS & Firefox visual guide -> User resets permissions -> Status chip updates from "Denied" to "Granted" -> Live stream starts.
6. **Scenario WF-06: Noisy Environment Audio Calibration**
   - *Workflow*: Consultant in coffee shop runs "Calibrate Ambient Noise Floor" (detects -36 dBFS) -> Tool calculates speech SNR (14 dB, "Marginal") -> Consultant plugs in headset mic (SNR improves to 32 dB, "Excellent").
7. **Scenario WF-07: Audiophile / Musician Stereo Monitor Verification**
   - *Workflow*: Audio engineer tests reference monitors -> Verifies pure Left-only and Right-only channel isolation -> Runs 20Hz-20kHz logarithmic frequency sweep -> Plays Pink Noise to inspect flat frequency response.
8. **Scenario WF-08: Offline / Air-Gapped Privacy Audit**
   - *Workflow*: Security officer disconnects device from network -> Executes all tests locally -> DevTools network panel confirms exactly 0 outbound requests, 0 trackers, 0 storage leaks.
9. **Scenario WF-09: Multi-Device Hot-Plug & Dynamic Recovery Flow**
   - *Workflow*: User unplugs USB-C dock mid-test -> `devicechange` listener detects peripheral loss -> Automatically fails over to built-in mic/webcam with UI warning -> Reconnects dock and restores selection.
10. **Scenario WF-10: Low-End Hardware & Accessibility Navigation Flow**
    - *Workflow*: User with accessibility needs navigates entire app via keyboard (Tab/Enter/Space) in High Contrast Dark Mode -> Screen reader live regions announce results -> System maintains <15% CPU load.

---

## 4. Standalone Web App Automated Testing Infrastructure (`TEST_INFRA.md` Blueprint)

The testing architecture provides comprehensive automated verification using **Node.js 22 built-ins** and **Headless Google Chrome** without adding build dependencies to the client app.

### 4.1 Test Directory Structure Specification
```
mic_cam_tester/
├── index.html                    # Zero-dependency standalone application
├── styles/                       # Modular CSS (main, visualizers, themes)
├── scripts/                      # Modular JS (camera, mic, speaker, troubleshooter, visualizers)
└── tests/
    ├── run_all.mjs               # Master test runner (node tests/run_all.mjs)
    ├── static/
    │   └── syntax_linter.mjs     # HTML/CSS/JS syntax & zero-dependency validator
    ├── unit/
    │   ├── mock_browser.mjs      # Lightweight DOM, MediaDevices & WebAudio mocks
    │   ├── camera_test.mjs       # Camera controller & resolution unit tests
    │   ├── audio_math_test.mjs   # dBFS, RMS, FFT, and noise floor math tests
    │   ├── speaker_test.mjs      # Stereo panner & frequency sweep unit tests
    │   ├── troubleshooter_test.mjs# Error classification & report generator tests
    │   └── theme_test.mjs        # Theme state & localStorage tests
    ├── e2e/
    │   ├── cdp_client.mjs        # Zero-dependency Chrome DevTools Protocol client
    │   └── app_e2e_test.mjs      # Full browser E2E test with fake media streams
    └── docs/
        └── collateral_linter.mjs # Markdown structure & prompt validator for marketing/research
```

### 4.2 Automated Test Suites
1. **Static Syntax & Dependency Validator (`tests/static/syntax_linter.mjs`)**:
   - Parses all JS files with Node module parser.
   - Verifies 0 external CDN script tags in `index.html`.
   - Validates all CSS token references and responsive breakpoints.
2. **Unit & State Machine Harness (`tests/unit/` via `node:test`)**:
   - Full in-memory mocks for `navigator.mediaDevices`, `AudioContext`, `AnalyserNode`, `StereoPannerNode`, `MediaRecorder`, and `HTMLCanvasElement`.
   - Tests decibel mathematics, clipping detection algorithms, FFT frequency binning, latency estimation, and permission error state machines.
3. **Headless Chrome E2E Automation (`tests/e2e/` via Native CDP)**:
   - Spawns `google-chrome --headless=new --remote-debugging-port=9222 --use-fake-device-for-media-stream --use-fake-ui-for-media-stream`.
   - Connects directly over Node 22 native `WebSocket` to Chrome DevTools Protocol.
   - Verifies live video element streaming, canvas animation loops, AudioContext running states, responsive viewport resizing (320px to 1920px), and asserts 0 browser console errors.
4. **Collateral & Documentation Linter (`tests/docs/`)**:
   - Asserts markdown section completeness across `research/gap_analysis.md`, `marketing/email_campaigns.md`, `marketing/ad_scripts.md`, `marketing/poster_concepts_and_prompts.md`, and `marketing/gtm_strategy.md`.
   - Validates AI image prompt syntax and aspect ratio parameters (`--ar`).

---

## 5. Test Case Inventory Summary & Metrics

| Category | Discovered Features | Tier 1 Tests (Feature Coverage) | Tier 2 Tests (Boundary & Edge) | Tier 3 Tests (Pairwise) | Tier 4 Tests (E2E Workflows) | Total Test Cases |
|---|---|---|---|---|---|---|
| **Category A: Camera Diagnostics** | 7 Features | 35 Tests (5/feat) | 35 Tests (5/feat) | 6 Tests | 3 Workflows | **79 Tests** |
| **Category B: Microphone Diagnostics** | 8 Features | 40 Tests (5/feat) | 40 Tests (5/feat) | 8 Tests | 3 Workflows | **91 Tests** |
| **Category C: Speaker / Output Test** | 4 Features | 20 Tests (5/feat) | 20 Tests (5/feat) | 5 Tests | 2 Workflows | **47 Tests** |
| **Category D: Permissions & Troubleshoot** | 5 Features | 25 Tests (5/feat) | 25 Tests (5/feat) | 6 Tests | 2 Workflows | **58 Tests** |
| **Category E: UI/UX, Privacy & A11y** | 5 Features | 25 Tests (5/feat) | 25 Tests (5/feat) | 5 Tests | 2 Workflows | **57 Tests** |
| **Category F: Competitive Research** | 3 Features | 15 Tests (5/feat) | 15 Tests (5/feat) | 2 Tests | 1 Workflow | **33 Tests** |
| **Category G: Marketing Collateral** | 4 Features | 20 Tests (5/feat) | 20 Tests (5/feat) | 3 Tests | 1 Workflow | **44 Tests** |
| **TOTALS** | **36 Features** | **180 Tests** | **180 Tests** | **35 Tests** | **14 Workflow Mappings** | **409 Test Cases** |

---

## 6. Recommendations & Quality Gates for Implementation

1. **Strict Zero-Dependency Gate**: The application in `mic_cam_tester/` must load directly in any modern browser from the local filesystem or static file server without requiring `npm install`, webpack, vite, or any build step. All testing harnesses in `tests/` must utilize only standard Node 22 built-in modules.
2. **Web Audio Autoplay Gate**: AudioContext must be initialized or resumed strictly within user-gesture handlers (click/tap events) to prevent browser console autoplay warnings.
3. **Memory & Lifecycle Gate**: All media stream tracks (`track.stop()`), AudioContext nodes (`audioCtx.close()`), and animation frame loops (`cancelAnimationFrame`) must be cleanly disposed when stopping tests or navigating away.
4. **WCAG 2.1 AA Gate**: All buttons, sliders, and interactive controls must support keyboard navigation with visible focus rings and ARIA labels.
5. **Headless Chrome CI Verification Gate**: Before final signoff, the complete test suite (`node tests/run_all.mjs`) must pass with 0 errors across static analysis, unit mocks, headless Chrome CDP E2E, and documentation linting.
