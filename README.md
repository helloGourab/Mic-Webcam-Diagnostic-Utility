# 🎙️📹 Mic & Webcam Diagnostic Utility — Hardware Lab

[![Privacy: Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Zero%20Telemetry-10b981.svg)](#privacy--security-guarantee)
[![Architecture: Client-Side](https://img.shields.io/badge/Architecture-Pure%20Client--Side%20SPA-3b82f6.svg)](#architecture)
[![Web APIs: WebRTC & Web Audio](https://img.shields.io/badge/APIs-WebRTC%20%7C%20Web%20Audio%20API-8b5cf6.svg)](#core-diagnostic-capabilities)
[![Tests: 479 Passed](https://img.shields.io/badge/Tests-479%20Passed%20(100%25)-success.svg)](#automated-test-suite)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern, professional, privacy-first web utility for in-depth diagnostic testing of **Webcams**, **Microphones**, and **Speakers/Headphones**. 

Built with pure client-side HTML5, modern ES6 modules, and native browser Web Audio and WebRTC APIs — with **zero external dependencies, zero advertisements, zero tracking telemetry, and zero build steps required**.

---

## 🌟 Why This Tool Exists

Legacy hardware test websites (*WebCamMicTest*, *MicTests*, *DeviceTests*, *OnlineMicTest*) were built over a decade ago and suffer from severe usability and privacy issues:
- 🚫 **Malvertising & Deceptive Ads**: Aggressive programmatic banner ads, deceptive green "Download" buttons, and pop-unders.
- 📉 **Cumulative Layout Shift (CLS)**: Unstable layouts that jump as ad slots asynchronously load.
- 🕵️‍♂️ **Privacy & Telemetry Leaks**: Third-party tracking cookies, analytics pixels, and fingerprinting scripts.
- 📊 **Shallow Diagnostics**: Uncalibrated volume bars that cannot detect 0 dBFS digital gain clipping, dead audio channels, or low-light webcam frame rate drops.

This utility delivers a **clean, studio-grade diagnostic workstation** designed for remote workers, streamers, content creators, telehealth professionals, and interview candidates.

---

## 🛠️ Core Diagnostic Capabilities

### 1. 📹 Camera Diagnostics
- **Real-Time Video Preview**: Mirror mode toggle, front/rear camera switcher, and custom zoom constraint adjustment.
- **Active Resolution & Aspect Ratio**: Precise pixel resolution detection with Euclidean GCD aspect ratio calculation (`16:9`, `4:3`, `1:1`, `21:9`).
- **Real-Time FPS Counter**: Calculates active frame rates via Exponential Moving Average (EMA) and `requestVideoFrameCallback` fallback.
- **Capability Resolution Prober**: Tests camera sensor support across **4K UHD** (3840×2160), **1440p QHD** (2560×1440), **1080p FHD** (1920×1080), **720p HD** (1280×720), and **480p SD** (640×480).
- **Snapshot Capture**: Instant frame grab with copy-to-clipboard and PNG download.

### 2. 🎙️ Microphone & Audio Analysis
- **Dual 60FPS Canvas Visualizers**:
  - **Oscilloscope Waveform**: Real-time time-domain sine wave rendering with gradient glow.
  - **FFT Frequency Spectrum**: 2048-point Fast Fourier Transform (FFT) bars across the audible human spectrum (20Hz–20,000Hz).
- **True RMS dBFS Metering**: Calibrated decibel scale (-60 dBFS to 0 dBFS) with dynamic level bar.
- **Instant Peak Clipping Alert**: Automatically flags digital gain saturation at 0 dBFS with visual warning badges.
- **Noise Floor & Latency Estimation**: Sliding-window ambient background noise measurement and audio input latency detection.
- **Audio Record & Playback Loopback**: Record 5-second audio snippets into an in-memory buffer with visual playback scrubber and WAV/WebM export.

### 3. 🔊 Speaker & Headphone Testing
- **Isolated Left / Right Stereo Channels**: Independent 440Hz sine wave tone generation to verify stereo channel wiring and headphone balance.
- **20Hz–20,000Hz Logarithmic Frequency Sweep**: Smooth continuous frequency sweep to test bass response, driver crossover, and treble fidelity.
- **Output Device Switcher**: Dynamic audio sink routing via `setSinkId` where supported.

### 4. 🛡️ Permissions & Troubleshooting Hub
- **Auto-Detection Engine**: Automatically detects the user's browser (Chrome, Firefox, Safari, Edge) and operating system (macOS, Windows, Linux).
- **Interactive Recovery Decision Tree**: Provides step-by-step guides for common error states:
  - `NotAllowedError` (Browser / OS permission block)
  - `NotReadableError` (Device in use by Zoom, Teams, OBS, Discord)
  - `NotFoundError` (Hardware unplugged or privacy shutter closed)
  - `OverconstrainedError` (Unsupported resolution/framerate constraint)
  - `SecurityError` (Insecure HTTP context)

---

## 🔒 Privacy & Security Architecture

- **100% Client-Side In-Memory Execution**: No media streams, audio buffers, or webcam frames are ever recorded to a server or transmitted over a network.
- **Zero Telemetry / Zero Cookies**: No Google Analytics, no tracking pixels, no advertising networks. `localStorage` is used solely to store the user's UI theme choice (`'dark'` / `'light'`).
- **Strict Content Security Policy (CSP)**:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; connect-src 'none'; font-src 'self'; base-uri 'self'; form-action 'self';">
  ```
  `connect-src 'none'` locks down outbound HTTP/WebSocket egress at the browser engine level.
- **Safe DOM Text Node Rendering**: All dynamic notifications and labels render via `textContent` rather than `innerHTML` interpolation.

---

## 📁 Repository Structure

```
.
├── LICENSE                          # MIT Open-Source License
├── README.md                        # Master Project Documentation
├── TEST_READY.md                    # Test Suite Specifications & Audit Log
│
├── mic_cam_tester/                  # Standalone Web Diagnostic Utility
│   ├── index.html                   # Responsive SPA Entrypoint (Dark/Light UI)
│   ├── styles/
│   │   ├── main.css                 # CSS Grid/Flexbox Layout & Color Tokens
│   │   ├── components.css           # Buttons, Badges, Cards, Accordions, Toasts
│   │   └── visualizers.css          # Oscilloscope, Spectrum & Meter Styles
│   └── scripts/
│       ├── app.js                   # Application Coordinator & Tab Controller
│       ├── camera.js                # WebRTC Video Stream, FPS & Resolution Prober
│       ├── microphone.js            # Web Audio FFT, dBFS Meter & Loopback Buffer
│       ├── speaker.js               # Stereo Tone Generator & Frequency Sweep
│       ├── permissions.js           # Browser/OS Troubleshooting Decision Tree
│       └── ui.js                    # Theme Engine, Notifications & Selects
│
├── research/                        # Competitive & Technical Intelligence
│   └── gap_analysis.md              # 630+ Line Competitor Audit & DSP Architecture
│
├── marketing/                       # Marketing & Go-To-Market Collateral
│   ├── ad_scripts.md                # TikTok/Reels Scripts, Podcast Ads & PPC Copy
│   ├── email_campaigns.md           # Cold Outreach Sequences & Launch Emails
│   ├── poster_concepts_and_prompts.md # AI Image Prompts (Midjourney/DALL-E/Flux)
│   └── gtm_strategy.md              # Target Personas, SEO Keywords & Roadmap
│
└── tests/                           # 4-Tier Automated Test Harness
    ├── e2e_runner.mjs               # Master Test Runner Orchestrator
    ├── tier1_features.test.mjs      # Tier 1: Feature Coverage (216 assertions)
    ├── tier2_boundaries.test.mjs    # Tier 2: Boundary & Fault Limits (216 assertions)
    ├── tier3_combinations.test.mjs  # Tier 3: Cross-Module Concurrency (35 assertions)
    ├── tier4_scenarios.test.mjs     # Tier 4: Real-World Workflows (12 assertions)
    └── mocks/
        ├── dom_mock.mjs             # Mock DOM, Window, Canvas & LocalStorage
        ├── webaudio_mock.mjs        # Mock AudioContext, Analyser & MediaRecorder
        └── webrtc_mock.mjs          # Mock MediaDevices, MediaStream & Permissions
```

---

## 🚀 Quick Start

### Option 1: Direct Browser Launch
No installation or dependencies required. Simply double-click:
```bash
mic_cam_tester/index.html
```
*(Note: Camera and microphone APIs require `localhost` or `https://` in Chromium-based browsers for full permission access).*

### Option 2: Local Static Server
Run with any local web server:
```bash
# Using Python
python3 -m http.server 3000 -d mic_cam_tester

# Using Node.js npx serve
npx serve mic_cam_tester
```
Then open `http://localhost:3000` in your web browser.

---

## 🧪 Automated Test Suite

The test suite runs on native **Node.js 22** (`node:test`, `node:assert/strict`) with zero external test runner dependencies.

### Run All 4 Tiers (Master E2E Runner)
```bash
node tests/e2e_runner.mjs
```

### Run Individual Test Tiers
```bash
# Tier 1: Feature Coverage Suite (216 assertions)
node --test tests/tier1_features.test.mjs

# Tier 2: Boundary & Corner Cases Suite (216 assertions)
node --test tests/tier2_boundaries.test.mjs

# Tier 3: Combinatorial & Multi-Feature Suite (35 assertions)
node --test tests/tier3_combinations.test.mjs

# Tier 4: Real-World Workflow Scenarios (12 assertions)
node --test tests/tier4_scenarios.test.mjs
```

### Test Suite Summary
| Test Tier | Focus Area | Assertions | Status |
| :--- | :--- | :---: | :---: |
| **Tier 1** | Feature Coverage (36 core features) | 216 | **PASS** |
| **Tier 2** | Boundary & Fault Limit Tests | 216 | **PASS** |
| **Tier 3** | Cross-Module Concurrency & State Transitions | 35 | **PASS** |
| **Tier 4** | Real-World User Scenarios (Streamer, Telehealth, IT Helpdesk) | 12 | **PASS** |
| **Total** | **Grand Combined Test Suite** | **479** | **PASS (100%)** |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
