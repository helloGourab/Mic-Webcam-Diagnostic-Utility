# Project: Modern Microphone & Camera Diagnostic Utility & Collateral Suite

## Architecture
A modern, feature-complete, zero-dependency client-side web utility application accompanied by in-depth competitive research, marketing collateral, and a 4-tier E2E testing framework.

### System Components
1. **Research Module** (`research/gap_analysis.md`):
   - Exhaustive competitive analysis of existing tools (WebCamMicTest, MicTests, DeviceTests, OnlineMicTest, WebcamTests).
   - UX/technical gap analysis and feature blueprint.
2. **Web Utility Core** (`mic_cam_tester/`):
   - `index.html`: Semantic HTML5 single-page application structure.
   - `styles/main.css`: Responsive CSS3 design, CSS custom properties for Light/Dark themes, high-contrast accessible visualizer styling.
   - `scripts/camera.js`: WebRTC MediaDevices stream capture, dynamic resolution probing, aspect ratio calculation, real-time FPS estimation (`requestVideoFrameCallback` + EMA fallback), camera switcher.
   - `scripts/microphone.js`: Web Audio API (`AudioContext`, `AnalyserNode`), time-domain waveform & frequency FFT visualizers (Retina canvas), dBFS RMS volume meter, peak clipping indicator, noise floor estimator, latency probe, `MediaRecorder` audio loopback buffer.
   - `scripts/speaker.js`: Web Audio API tone generator with `StereoPannerNode` for isolated Left/Right channel testing, 20Hz–20kHz logarithmic frequency sweep generator.
   - `scripts/permissions.js`: Device permission checker (`navigator.permissions.query`), detailed error classifier (`NotAllowedError`, `NotFoundError`, etc.), interactive troubleshooting guides for Chrome, Firefox, Safari, Edge, Windows, macOS, Linux.
   - `scripts/ui.js`: Theme switching (dark/light), tab navigation, zero-telemetry guarantee indicator, toast notifications.
   - `scripts/app.js`: Main initialization, event bus, and module coordination.
3. **Marketing Suite** (`marketing/`):
   - `email_campaigns.md`: Cold outreach, newsletter announcement, 4-stage launch email sequence.
   - `ad_scripts.md`: TikTok/Reels/Shorts short-form video scripts, podcast host-read ad scripts, Google/Meta PPC ad copy.
   - `poster_concepts_and_prompts.md`: Visual poster concepts, typography/layout copy, exact Midjourney/DALL-E 3/Flux image prompts.
   - `gtm_strategy.md`: Launch timeline, target audience personas (streamers, remote workers, educators, interviewees), high-intent SEO keyword matrix, distribution channels.
4. **Testing Infrastructure** (`tests/`, `TEST_INFRA.md`, `TEST_READY.md`):
   - Node.js 22 native test runner (`node:test`, `node:assert`).
   - Mock WebRTC/WebAudio DOM and API test harness.
   - 4-Tier Test Suite covering all 36 atomic features (Tiers 1–4).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Competitor Benchmarking | In-depth evaluation of 5 major mic/cam test websites | M1 | Survey |
| 2 | UX & Technical Gap Diagnosis | Identification of deceptive ads, latency/clipping gaps, permission flaws | M1 | Survey |
| 3 | Technical Feature Blueprint | Actionable specifications for next-gen diagnostics | M1 | Survey |
| 4 | Live Video Preview | Real-time WebRTC webcam feed rendering in `<video>` element | M2 | Survey / R2 |
| 5 | Active Resolution & Aspect Ratio | Real-time video resolution detection and GCD aspect ratio calculation | M2 | Survey / R2 |
| 6 | Supported Resolutions Picker | Dynamic probing and switching across standard resolutions (4K, 1080p, 720p, 480p, 360p) | M2 | Survey / R2 |
| 7 | Real-Time FPS Counter | Frame rate counter using `requestVideoFrameCallback` with `requestAnimationFrame` fallback | M2 | Survey / R2 |
| 8 | Multi-Camera Switching | Device enumeration and seamless switching between front/back/external webcams | M2 | Survey / R2 |
| 9 | Time-Domain Waveform Visualizer | Real-time oscillating audio waveform canvas rendering via `AnalyserNode` | M2 | Survey / R2 |
| 10 | Frequency Spectrum (FFT) Visualizer | Real-time frequency bar graph visualizer | M2 | Survey / R2 |
| 11 | True RMS Volume & Clipping Meter | Volume meter calibrated in dBFS with peak clipping detection ($|x| \ge 0.99$) | M2 | Survey / R2 |
| 12 | Audio Input Latency Estimation | Pipeline latency calculation via `AudioContext.baseLatency` and timestamping | M2 | Survey / R2 |
| 13 | Background Noise Floor Indicator | Dynamic ambient noise floor calibration and status badge | M2 | Survey / R2 |
| 14 | Record & Replay Audio Loopback | Interactive recording and playback test using `MediaRecorder` | M2 | Survey / R2 |
| 15 | Stereo Channel Balance Verification | Distinct Left-only and Right-only test tone playback using `StereoPannerNode` | M2 | Survey / R2 |
| 16 | 20Hz–20kHz Frequency Sweep | Logarithmic continuous audio sweep test | M2 | Survey / R2 |
| 17 | Audio Output Device Selection | Speaker switching via `setSinkId` where supported | M2 | Survey / R2 |
| 18 | Interactive Permissions Guide | Guided step-by-step resolution for camera/mic access permissions | M2 | Survey / R2 |
| 19 | Specific Browser Recovery Steps | Actionable resolution steps for Chrome, Firefox, Safari, Edge | M2 | Survey / R2 |
| 20 | OS-Level Troubleshooting | Hardware permission instructions for macOS, Windows, Linux | M2 | Survey / R2 |
| 21 | Zero-Telemetry Guarantee | Pure client-side processing with zero network tracking / analytics | M2 | Survey / R2 |
| 22 | Dark / Light Theme Support | Modern UI with system-preference detection and manual toggle | M2 | Survey / R2 |
| 23 | Fully Responsive Layout | Fluid adaptation across mobile, tablet, and desktop viewports | M2 | Survey / R2 |
| 24 | Device Hotplug Detection | Automatic UI refresh on `devicechange` events | M2 | Survey / R2 |
| 25 | Cold Outreach Email Templates | Multi-angle cold outreach emails for B2B/remote teams | M3 | Survey / R3 |
| 26 | Newsletter Announcement Email | Feature highlight announcement for tech/developer newsletters | M3 | Survey / R3 |
| 27 | 4-Stage Launch Sequence Emails | Pre-launch teaser, launch day, feature deep-dive, feedback request | M3 | Survey / R3 |
| 28 | Short-Form Video Ad Scripts | 3 viral short-form video scripts (TikTok/Reels/Shorts format) | M3 | Survey / R3 |
| 29 | Podcast Host-Read Ad Copy | 30-sec and 60-sec host-read podcast ad scripts | M3 | Survey / R3 |
| 30 | Search & Social PPC Ad Copy | High-converting search headlines, descriptions, and social ad copy | M3 | Survey / R3 |
| 31 | Visual Poster Concepts & Copy | 4 distinct design concepts with headline, body, and CTA copy | M3 | Survey / R3 |
| 32 | AI Image Generation Prompts | Exact copy-paste prompts for Midjourney, DALL-E 3, and Flux | M3 | Survey / R3 |
| 33 | Target Audience Personas | Detailed personas for Streamers, Remote Workers, Educators, Interviewees | M3 | Survey / R3 |
| 34 | 4-Phase Launch Timeline | Pre-launch, Launch Day, Growth, and Sustained Community phases | M3 | Survey / R3 |
| 35 | High-Intent SEO Keyword Matrix | Keyword targets with search intent, volume tier, and meta descriptions | M3 | Survey / R3 |
| 36 | Multi-Channel Distribution Plan | Product Hunt, Reddit, Hacker News, Discord/Slack communities | M3 | Survey / R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Competitive Research & Gap Analysis | `research/gap_analysis.md` | none | PLANNED |
| M2 | Client-Side Web Utility Application | `mic_cam_tester/index.html`, `styles/`, `scripts/` | M1 (blueprint) | PLANNED |
| M3 | Comprehensive Marketing Collateral | `marketing/email_campaigns.md`, `ad_scripts.md`, `poster_concepts_and_prompts.md`, `gtm_strategy.md` | M1 (insights) | PLANNED |
| M4 | E2E Testing Suite & Quality Verification | `tests/`, `TEST_READY.md`, all 4 tiers passing | M2, M3 | PLANNED |

## Interface Contracts
### Web Application Modular Interface (`mic_cam_tester/scripts/`)
- `CameraModule`: `init()`, `startCamera(deviceId, constraints)`, `stopCamera()`, `probeResolutions()`, `setResolution(w, h)`, `getStats()`.
- `MicrophoneModule`: `init()`, `startMicrophone(deviceId)`, `stopMicrophone()`, `startRecording()`, `stopRecording()`, `playLoopback()`, `getAudioMetrics()`.
- `SpeakerModule`: `init()`, `playLeftChannelTone()`, `playRightChannelTone()`, `stopChannelTone()`, `startFrequencySweep()`, `stopFrequencySweep()`, `setOutputDevice(deviceId)`.
- `PermissionsModule`: `checkPermissions()`, `classifyError(error)`, `renderTroubleshootingGuide(containerId, errorType)`.
- `UIModule`: `initTheme()`, `toggleTheme()`, `showTab(tabId)`, `showNotification(msg, type)`.

## Code Layout
```
/home/gourab/coding/sampleAgy/
├── ORIGINAL_REQUEST.md
├── PROJECT.md
├── TEST_INFRA.md
├── TEST_READY.md
├── research/
│   └── gap_analysis.md
├── mic_cam_tester/
│   ├── index.html
│   ├── styles/
│   │   ├── main.css
│   │   ├── visualizers.css
│   │   └── components.css
│   └── scripts/
│       ├── app.js
│       ├── camera.js
│       ├── microphone.js
│       ├── speaker.js
│       ├── permissions.js
│       └── ui.js
├── marketing/
│   ├── email_campaigns.md
│   ├── ad_scripts.md
│   ├── poster_concepts_and_prompts.md
│   └── gtm_strategy.md
└── tests/
    ├── e2e_runner.mjs
    ├── mocks/
    │   ├── webrtc_mock.mjs
    │   ├── webaudio_mock.mjs
    │   └── dom_mock.mjs
    ├── tier1_features.test.mjs
    ├── tier2_boundaries.test.mjs
    ├── tier3_combinations.test.mjs
    └── tier4_scenarios.test.mjs
```
