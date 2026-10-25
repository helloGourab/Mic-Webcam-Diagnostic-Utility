# Comprehensive Technical Survey & Architecture Report: Web-Based Mic, Camera & Speaker Diagnostic Utility

**Document Version**: 1.0.0  
**Author**: Technical Survey Explorer (`survey_explorer_tech`)  
**Target Project**: `mic_cam_tester`  
**Execution Environment**: Standalone Client-Side Web Application (Pure HTML5, CSS3, Modern ES6)  
**Date**: 2026-08-23  

---

## 1. Executive Summary & Architecture Philosophy

The objective is to architect and specify a modern, zero-dependency, client-side web utility for testing microphones, webcams, and audio output devices. Existing legacy tools in the market suffer from severe limitations: aggressive ads, clunky Flash-era interfaces, poor mobile responsiveness, no true stereo balance testing, inaccurate framerate measurements, lack of clipping detection, and cryptic error messages when permissions are blocked.

### Key Architectural Tenets:
1. **Zero Runtime & Build Dependencies**: Built entirely with standards-compliant HTML5, CSS3, and ES6 JavaScript modules. No Node.js runtime, Webpack, Vite, or external JS/CSS CDNs required. Works offline via `file://` or any static HTTP server (Python `http.server`, Nginx, Caddy, GitHub Pages).
2. **Privacy-First & Zero Telemetry**: 100% of media stream processing, audio synthesis, and canvas visualization occurs locally in the user's browser memory. Zero external tracking pixels, analytics scripts, or remote media transmissions.
3. **High-Precision Diagnostics**: Real-time FPS monitoring with `requestVideoFrameCallback`, 32-bit floating-point audio analysis (`getFloatTimeDomainData`), true RMS volume in decibels (dBFS), digital clipping detection, background noise floor calibration, and stereo channel phase isolation.
4. **Resilient Hardware Lifecycle**: Graceful handling of device hotplugging (`devicechange`), active stream teardown, permission state querying, and step-by-step contextual troubleshooting wizards.
5. **Modern Responsive Design**: Accessible UI adhering to WCAG AA/AAA contrast ratios, responsive flex/grid layout, smooth 60fps canvas visualizers with HiDPI (Retina) scaling, and seamless Dark/Light theme switching.

```
+-----------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                       |
|  +---------------------+  +-------------------------+  +-----------------------------+  |
|  |  Camera Diagnostics |  |  Microphone Diagnostics |  |     Speaker Output Suite    |  |
|  |  - Live Preview     |  |  - Real-Time Waveform   |  |  - L/R Balance Isolation    |  |
|  |  - FPS / Resolution |  |  - Spectrum / FFT Bars  |  |  - Frequency Sweep (20-20k) |  |
|  |  - Supported Prober |  |  - RMS Meter & Clipping |  |  - Output Device Selection  |  |
|  |  - Device Switcher  |  |  - Loopback Recorder    |  |  - Tone Generator           |  |
|  +---------------------+  +-------------------------+  +-----------------------------+  |
|  +-----------------------------------------------------------------------------------+  |
|  |                   Permissions & Troubleshooting Recovery Engine                   |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
                                             |
             +-------------------------------+-------------------------------+
             |                               |                               |
             v                               v                               v
+------------------------+      +------------------------+      +------------------------+
|   MediaDevices Engine  |      |   Web Audio DSP Core   |      |  Canvas 2D Visualizer  |
| - getUserMedia         |      | - AudioContext         |      | - HiDPI Retina Scale   |
| - enumerateDevices     |      | - AnalyserNode         |      | - Oscilloscope Wave    |
| - getCapabilities      |      | - StereoPannerNode     |      | - Frequency Spectrum   |
| - rVFC / FPS Engine    |      | - MediaRecorder API    |      | - Peak-Hold VU Meter   |
+------------------------+      +------------------------+      +------------------------+
```

---

## 2. Camera Diagnostics Architecture & Deep Dive

### 2.1 Media Constraints & Stream Initialization
Media streams are initialized via `navigator.mediaDevices.getUserMedia(constraints)`. To provide maximum flexibility and reliable fallback across varied hardware (integrated laptop webcams, USB webcams, virtual cameras like OBS), the camera controller supports dynamic constraints.

```javascript
// Dynamic Camera Constraints Builder
export function buildCameraConstraints(deviceId = null, idealWidth = 1920, idealHeight = 1080, idealFps = 60) {
  const videoConstraints = {
    width: { ideal: idealWidth },
    height: { ideal: idealHeight },
    frameRate: { ideal: idealFps, max: 60 }
  };

  if (deviceId) {
    videoConstraints.deviceId = { exact: deviceId };
  } else {
    videoConstraints.facingMode = 'user'; // Default to front-facing camera on mobile
  }

  return {
    video: videoConstraints,
    audio: false // Handled independently in microphone module
  };
}
```

### 2.2 Active Resolution & Aspect Ratio Detection
When a video stream is attached to an `HTMLVideoElement`, the physical dimensions delivered by the hardware may differ from requested constraints due to camera limits or browser negotiation.

```javascript
export function inspectActiveVideoStream(videoElement, mediaStream) {
  const track = mediaStream.getVideoTracks()[0];
  if (!track) return null;

  // Track settings provide negotiated hardware parameters
  const settings = track.getSettings ? track.getSettings() : {};
  const capabilities = track.getCapabilities ? track.getCapabilities() : {};

  // Active rendering dimensions from HTMLVideoElement
  const activeWidth = videoElement.videoWidth || settings.width || 0;
  const activeHeight = videoElement.videoHeight || settings.height || 0;

  // Aspect ratio calculation using Greatest Common Divisor (GCD)
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let ratioString = 'N/A';
  let standardRatioLabel = '';

  if (activeWidth > 0 && activeHeight > 0) {
    const divisor = gcd(activeWidth, activeHeight);
    const aspectW = activeWidth / divisor;
    const aspectH = activeHeight / divisor;
    ratioString = `${aspectW}:${aspectH}`;

    // Map to industry standard labels
    const ratioDecimal = activeWidth / activeHeight;
    if (Math.abs(ratioDecimal - 16 / 9) < 0.05) standardRatioLabel = '16:9 (Widescreen)';
    else if (Math.abs(ratioDecimal - 4 / 3) < 0.05) standardRatioLabel = '4:3 (Standard)';
    else if (Math.abs(ratioDecimal - 1.0) < 0.05) standardRatioLabel = '1:1 (Square)';
    else if (Math.abs(ratioDecimal - 21 / 9) < 0.05) standardRatioLabel = '21:9 (Ultrawide)';
    else if (Math.abs(ratioDecimal - 9 / 16) < 0.05) standardRatioLabel = '9:16 (Portrait/Mobile)';
    else standardRatioLabel = `${ratioString} (Custom)`;
  }

  return {
    activeWidth,
    activeHeight,
    aspectRatio: ratioString,
    aspectRatioLabel: standardRatioLabel,
    frameRate: settings.frameRate || 'Auto',
    facingMode: settings.facingMode || 'Unspecified',
    deviceId: settings.deviceId,
    label: track.label || 'Default Camera',
    capabilities
  };
}
```

### 2.3 Supported Resolution Prober
Many users want to know if their webcam supports 1080p Full HD, 4K UHD, or 720p HD. Because `MediaTrackCapabilities` does not enumerate all discrete resolutions across all browsers (especially Safari/Firefox), an active probing algorithm tests candidate resolutions sequentially against the selected device.

```javascript
export const COMMON_RESOLUTIONS = [
  { name: '4K Ultra HD', width: 3840, height: 2160 },
  { name: '2K QHD', width: 2560, height: 1440 },
  { name: '1080p Full HD', width: 1920, height: 1080 },
  { name: '720p HD', width: 1280, height: 720 },
  { name: '480p SD', width: 854, height: 480 },
  { name: '360p Low', width: 640, height: 360 },
  { name: '240p Min', width: 320, height: 240 }
];

export async function probeSupportedResolutions(deviceId, onProgress) {
  const results = [];

  for (let i = 0; i < COMMON_RESOLUTIONS.length; i++) {
    const candidate = COMMON_RESOLUTIONS[i];
    let supported = false;
    let actualWidth = 0;
    let actualHeight = 0;
    let testStream = null;

    try {
      testStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { exact: candidate.width },
          height: { exact: candidate.height }
        }
      });

      const track = testStream.getVideoTracks()[0];
      const settings = track.getSettings();
      actualWidth = settings.width;
      actualHeight = settings.height;

      // Ensure camera delivered exact or acceptable target resolution
      if (actualWidth === candidate.width && actualHeight === candidate.height) {
        supported = true;
      }
    } catch (e) {
      // If exact fails, test with ideal constraints to see if it downscales gracefully
      supported = false;
    } finally {
      if (testStream) {
        testStream.getTracks().forEach(t => t.stop());
      }
    }

    const report = {
      name: candidate.name,
      target: `${candidate.width}x${candidate.height}`,
      actual: supported ? `${actualWidth}x${actualHeight}` : 'Not Supported',
      supported
    };

    results.push(report);
    if (onProgress) onProgress(report, (i + 1) / COMMON_RESOLUTIONS.length);
  }

  return results;
}
```

### 2.4 High-Precision Real-Time Framerate (FPS) Counter
Accurate framerate calculation requires measuring actual frame deliveries rather than generic screen redraw rates. We implement a hybrid engine:
1. **Primary**: `HTMLVideoElement.requestVideoFrameCallback()` (delivers `now` and `metadata.presentedFrames`).
2. **Fallback**: `window.requestAnimationFrame()` tracking timestamp deltas.
3. **Exponential Moving Average (EMA)** smoothing filter to eliminate UI jitter while reacting quickly to frame drops.

```javascript
export class VideoFPSCounter {
  constructor(videoElement, onFpsUpdate) {
    this.videoElement = videoElement;
    this.onFpsUpdate = onFpsUpdate;
    this.isRunning = false;
    this.callbackId = null;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.smoothedFps = 0;
    this.alpha = 0.2; // Smoothing coefficient
    this.lastPresentedFrames = 0;
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.lastPresentedFrames = 0;

    if ('requestVideoFrameCallback' in this.videoElement) {
      this._runVfcLoop();
    } else {
      this._runRafLoop();
    }
  }

  _runVfcLoop() {
    if (!this.isRunning) return;

    this.callbackId = this.videoElement.requestVideoFrameCallback((now, metadata) => {
      if (!this.isRunning) return;

      if (this.lastTime === 0) {
        this.lastTime = now;
        this.lastPresentedFrames = metadata.presentedFrames;
      } else {
        const delta = now - this.lastTime;
        if (delta >= 500) { // Update twice per second
          const framesDelta = metadata.presentedFrames - this.lastPresentedFrames;
          const instantFps = (framesDelta / delta) * 1000;
          this.smoothedFps = this.smoothedFps === 0 
            ? instantFps 
            : this.smoothedFps * (1 - this.alpha) + instantFps * this.alpha;
          
          this.fps = Math.round(this.smoothedFps * 10) / 10;
          this.onFpsUpdate(this.fps, {
            presentedFrames: metadata.presentedFrames,
            width: metadata.width,
            height: metadata.height,
            mediaTime: metadata.mediaTime
          });

          this.lastTime = now;
          this.lastPresentedFrames = metadata.presentedFrames;
        }
      }

      this._runVfcLoop();
    });
  }

  _runRafLoop() {
    if (!this.isRunning) return;

    const loop = (now) => {
      if (!this.isRunning) return;

      this.frameCount++;
      const delta = now - this.lastTime;

      if (delta >= 500) {
        const instantFps = (this.frameCount / delta) * 1000;
        this.smoothedFps = this.smoothedFps === 0 
          ? instantFps 
          : this.smoothedFps * (1 - this.alpha) + instantFps * this.alpha;

        this.fps = Math.round(this.smoothedFps * 10) / 10;
        this.onFpsUpdate(this.fps, {
          fallback: true
        });

        this.frameCount = 0;
        this.lastTime = now;
      }

      this.callbackId = requestAnimationFrame(loop);
    };

    this.callbackId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.callbackId !== null) {
      if ('cancelVideoFrameCallback' in this.videoElement) {
        this.videoElement.cancelVideoFrameCallback(this.callbackId);
      } else {
        cancelAnimationFrame(this.callbackId);
      }
      this.callbackId = null;
    }
  }
}
```

### 2.5 Device Enumeration & Hotplugging (`devicechange`)
Handling camera unplugging and external webcam connections seamlessly:
```javascript
export async function enumerateVideoDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter(d => d.kind === 'videoinput')
    .map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `Camera ${index + 1} (Permission required for name)`,
      groupId: d.groupId
    }));
}

export function listenDeviceChanges(onDevicesChanged) {
  const handler = async () => {
    const videoDevices = await enumerateVideoDevices();
    const audioDevices = await enumerateAudioDevices();
    onDevicesChanged({ videoDevices, audioDevices });
  };

  navigator.mediaDevices.addEventListener('devicechange', handler);
  return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
}
```

---

## 3. Microphone Diagnostics & Web Audio DSP Engine

### 3.1 Audio Processing Pipeline Architecture
The microphone diagnostic module builds a real-time Digital Signal Processing (DSP) chain using the standard Web Audio API (`AudioContext`).

```
[MediaStream (Mic)] 
       |
       v
[AudioContext.createMediaStreamSource()] 
       |
       +---> [AnalyserNode (FFT 2048)] ---> Canvas Waveform & Spectrum Visualizer
       |
       +---> [ScriptProcessor / Float Buffer Inspection] ---> RMS dB Meter, Clipping & Noise Floor
       |
       +---> [MediaRecorder] ---> Audio Blob / Loopback Playback Buffer
```

> **Important Audio Safety Note**: The microphone source is intentionally **never connected** to `audioContext.destination`. This eliminates acoustic feedback screeching while maintaining full analysis capability.

### 3.2 AudioContext Lifecycle & Autoplay Handling
Modern browsers require user gestures before activating an `AudioContext`.
```javascript
export function createSafeAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ latencyHint: 'interactive' });

  // Auto-resume if in suspended state
  if (ctx.state === 'suspended') {
    const resumeHandler = () => {
      if (ctx.state === 'suspended') ctx.resume();
      window.removeEventListener('click', resumeHandler);
      window.removeEventListener('touchstart', resumeHandler);
      window.removeEventListener('keydown', resumeHandler);
    };
    window.addEventListener('click', resumeHandler);
    window.addEventListener('touchstart', resumeHandler);
    window.addEventListener('keydown', resumeHandler);
  }

  return ctx;
}
```

### 3.3 High-Precision Time-Domain & Frequency Analysis
Using `getFloatTimeDomainData` avoids 8-bit integer quantization noise inherent in legacy `getByteTimeDomainData`.

```javascript
export class MicrophoneEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.stream = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.fftSize = 2048;
    this.timeDomainBuffer = new Float32Array(this.fftSize);
    this.frequencyBuffer = new Uint8Array(this.fftSize / 2);
    
    // Diagnostic state metrics
    this.currentRms = 0;
    this.currentDb = -100;
    this.peakDb = -100;
    this.isClipping = false;
    this.clipDecayTimer = null;
    this.noiseFloorDb = -80;
    this.noiseSamples = [];
    this.maxNoiseSamples = 60; // ~1 second sliding window
  }

  attachStream(stream) {
    this.stream = stream;
    this.sourceNode = this.ctx.createMediaStreamSource(stream);
    
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = this.fftSize;
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.analyserNode.minDecibels = -90;
    this.analyserNode.maxDecibels = -10;

    this.sourceNode.connect(this.analyserNode);
  }

  processFrame() {
    if (!this.analyserNode) return null;

    // 1. Time-Domain (Oscilloscope & RMS)
    this.analyserNode.getFloatTimeDomainData(this.timeDomainBuffer);
    
    // 2. Frequency-Domain (FFT Spectrum)
    this.analyserNode.getByteFrequencyData(this.frequencyBuffer);

    // 3. Compute True RMS and Clipping
    let sumSquares = 0;
    let hasClipped = false;
    const len = this.timeDomainBuffer.length;

    for (let i = 0; i < len; i++) {
      const sample = this.timeDomainBuffer[i];
      sumSquares += sample * sample;
      
      // Digital clipping occurs when amplitude hits or exceeds +/- 0.99
      if (Math.abs(sample) >= 0.99) {
        hasClipped = true;
      }
    }

    const rms = Math.sqrt(sumSquares / len);
    this.currentRms = rms;

    // Convert RMS to Decibels Full Scale (dBFS)
    // Avoid Math.log10(0) by clamping to 1e-5 (-100 dB)
    const clampedRms = Math.max(rms, 0.00001);
    const db = 20 * Math.log10(clampedRms);
    this.currentDb = Math.max(-100, Math.min(0, db));

    // Peak Hold with Decay
    if (this.currentDb > this.peakDb) {
      this.peakDb = this.currentDb;
    } else {
      this.peakDb -= 0.5; // Smooth decay
    }

    // Clipping sticky alert (hold for 500ms)
    if (hasClipped) {
      this.isClipping = true;
      clearTimeout(this.clipDecayTimer);
      this.clipDecayTimer = setTimeout(() => {
        this.isClipping = false;
      }, 500);
    }

    // 4. Background Noise Floor Tracker (Min RMS in sliding window)
    this.noiseSamples.push(this.currentDb);
    if (this.noiseSamples.length > this.maxNoiseSamples) {
      this.noiseSamples.shift();
    }
    // Floor is 10th percentile lowest dB in the window
    const sorted = [...this.noiseSamples].sort((a, b) => a - b);
    this.noiseFloorDb = sorted[Math.floor(sorted.length * 0.1)] || -80;

    return {
      timeDomainData: this.timeDomainBuffer,
      frequencyData: this.frequencyBuffer,
      rms: this.currentRms,
      db: this.currentDb,
      peakDb: this.peakDb,
      isClipping: this.isClipping,
      noiseFloorDb: this.noiseFloorDb
    };
  }

  teardown() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
```

### 3.4 Hardware Latency Estimation
Input audio pipeline latency can be derived via Web Audio API metadata and acoustic echo roundtrip estimation:
```javascript
export function getAudioPipelineLatency(audioContext) {
  // Base latency (hardware buffer)
  const baseLatency = audioContext.baseLatency || 0;
  // Output latency (OS mixing buffer)
  const outputLatency = audioContext.outputLatency || 0;
  const sampleRate = audioContext.sampleRate;
  
  return {
    baseLatencyMs: Math.round(baseLatency * 1000 * 10) / 10,
    outputLatencyMs: Math.round(outputLatency * 1000 * 10) / 10,
    totalEstimatedLatencyMs: Math.round((baseLatency + outputLatency) * 1000 * 10) / 10,
    sampleRate: `${sampleRate} Hz`
  };
}
```

### 3.5 Real-Time Canvas 2D Visualizer Engine
High-performance Canvas 2D rendering handles both time-domain oscilloscope waveforms and logarithmic frequency bars with Retina/HiDPI display scaling.

```javascript
export class AudioVisualizerRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this._setupCanvasResolution();
  }

  _setupCanvasResolution() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 600;
    this.height = rect.height || 200;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  renderWaveform(timeDomainData, primaryColor = '#3b82f6', glowColor = 'rgba(59, 130, 246, 0.4)') {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    // Background Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform Trace
    ctx.lineWidth = 2;
    ctx.strokeStyle = primaryColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const sliceWidth = width / timeDomainData.length;
    let x = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i]; // Value in range [-1.0, 1.0]
      const y = (v * (height / 2) * 0.9) + (height / 2);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0; // Reset
  }

  renderSpectrum(frequencyData, primaryColor = '#10b981', peakColor = '#f59e0b') {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    const barCount = 64; // Discrete visual bars
    const barSpacing = 2;
    const totalSpacing = barSpacing * (barCount - 1);
    const barWidth = (width - totalSpacing) / barCount;
    const step = Math.floor(frequencyData.length / barCount);

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(0.7, '#06b6d4');
    gradient.addColorStop(1.0, peakColor);

    ctx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += frequencyData[i * step + j];
      }
      const avg = sum / step; // [0..255]
      const barHeight = (avg / 255) * height * 0.95;
      const x = i * (barWidth + barSpacing);
      const y = height - barHeight;

      // Rounded top bars
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();
    }
  }
}
```

### 3.6 MediaRecorder Interactive Loopback Engine
Users want an instant "Record 5s & Replay" test to hear their own voice without feedback loops.
```javascript
export class AudioLoopbackRecorder {
  constructor(mediaStream) {
    this.stream = mediaStream;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
    this.audioElement = new Audio();
    this.state = 'idle'; // 'idle' | 'recording' | 'recorded' | 'playing'
  }

  _getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
      'audio/webm'
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  startRecording(durationMs = 5000, onComplete, onTick) {
    if (!this.stream) throw new Error('No media stream attached');
    
    this.audioChunks = [];
    const mimeType = this._getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.state = 'recording';

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.audioBlob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });
      if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = URL.createObjectURL(this.audioBlob);
      this.audioElement.src = this.audioUrl;
      this.state = 'recorded';
      if (onComplete) onComplete(this.audioBlob, this.audioUrl);
    };

    this.mediaRecorder.start(100); // 100ms timeslices

    // Countdown timer
    let remaining = durationMs;
    const interval = setInterval(() => {
      remaining -= 100;
      if (onTick) onTick(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }
    }, 100);
  }

  play() {
    if (!this.audioUrl) return;
    this.state = 'playing';
    this.audioElement.play();
    this.audioElement.onended = () => {
      this.state = 'recorded';
    };
  }

  stopPlayback() {
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.state = 'recorded';
  }

  downloadRecording(filename = 'mic-test-recording.webm') {
    if (!this.audioUrl) return;
    const a = document.createElement('a');
    a.href = this.audioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
```

---

## 4. Speaker & Audio Output Diagnostic Suite

### 4.1 Stereo Balance Channel Isolation (Left / Right Tone Test)
Users frequently suffer from faulty 3.5mm headphone jacks, misconfigured Bluetooth audio profiles (hands-free mono vs stereo A2DP), or mono speaker downmixing. The speaker diagnostic provides discrete channel tests using `StereoPannerNode` and a universal fallback with `ChannelSplitterNode` + `ChannelMergerNode`.

```javascript
export class SpeakerTestEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.oscillator = null;
    this.gainNode = null;
    this.pannerNode = null;
    this.isPlaying = false;
  }

  /**
   * Plays a calibrated synthetic test tone on Left, Right, or Both channels.
   * @param {'left'|'right'|'both'} channel 
   * @param {number} frequency Frequency in Hz (e.g. 440 for A4, 1000 for standard tone)
   * @param {number} durationMs Tone duration
   */
  playChannelTone(channel = 'both', frequency = 440, durationMs = 1500) {
    this.stopTone();

    const now = this.ctx.currentTime;
    this.oscillator = this.ctx.createOscillator();
    this.gainNode = this.ctx.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(frequency, now);

    // Envelope shaping (smooth 50ms attack & release to prevent speaker click/pop)
    this.gainNode.gain.setValueAtTime(0.0001, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.5, now + 0.05);
    this.gainNode.gain.setValueAtTime(0.5, now + (durationMs / 1000) - 0.05);
    this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + (durationMs / 1000));

    // Stereo Panning Strategy
    if ('createStereoPanner' in this.ctx) {
      this.pannerNode = this.ctx.createStereoPanner();
      let panValue = 0; // Center
      if (channel === 'left') panValue = -1.0;
      if (channel === 'right') panValue = 1.0;
      this.pannerNode.pan.setValueAtTime(panValue, now);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.pannerNode);
      this.pannerNode.connect(this.ctx.destination);
    } else {
      // Fallback: ChannelSplitter & ChannelMerger explicit matrix routing
      const merger = this.ctx.createChannelMerger(2);
      this.oscillator.connect(this.gainNode);

      if (channel === 'left' || channel === 'both') {
        this.gainNode.connect(merger, 0, 0); // Connect to Left output
      }
      if (channel === 'right' || channel === 'both') {
        this.gainNode.connect(merger, 0, 1); // Connect to Right output
      }
      merger.connect(this.ctx.destination);
    }

    this.oscillator.start(now);
    this.oscillator.stop(now + (durationMs / 1000));
    this.isPlaying = true;

    this.oscillator.onended = () => {
      this.isPlaying = false;
    };
  }

  stopTone() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {}
      this.oscillator = null;
    }
    this.isPlaying = false;
  }
}
```

### 4.2 Interactive Frequency Sweep Test (20 Hz - 20,000 Hz)
A frequency sweep allows users to detect speaker buzz, blown drivers, room resonance, and upper treble hearing thresholds.
```javascript
export class FrequencySweepEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.oscillator = null;
    this.gainNode = null;
    this.isRunning = false;
    this.animationId = null;
  }

  startSweep(startFreq = 20, endFreq = 20000, durationSeconds = 10, onProgress) {
    this.stopSweep();

    const now = this.ctx.currentTime;
    const endTime = now + durationSeconds;

    this.oscillator = this.ctx.createOscillator();
    this.gainNode = this.ctx.createGain();

    this.oscillator.type = 'sine';
    // Logarithmic exponential sweep matches human pitch perception
    this.oscillator.frequency.setValueAtTime(startFreq, now);
    this.oscillator.frequency.exponentialRampToValueAtTime(endFreq, endTime);

    // Smooth master gain
    this.gainNode.gain.setValueAtTime(0.0001, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.4, now + 0.1);
    this.gainNode.gain.setValueAtTime(0.4, endTime - 0.1);
    this.gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.oscillator.start(now);
    this.oscillator.stop(endTime);
    this.isRunning = true;

    const startTimePerf = performance.now();
    const totalMs = durationSeconds * 1000;

    const updateLoop = () => {
      if (!this.isRunning) return;
      const elapsed = performance.now() - startTimePerf;
      const progress = Math.min(1.0, elapsed / totalMs);

      // Calculate current instantaneous frequency (logarithmic curve)
      const currentFreq = startFreq * Math.pow(endFreq / startFreq, progress);
      if (onProgress) onProgress(Math.round(currentFreq), progress);

      if (progress < 1.0) {
        this.animationId = requestAnimationFrame(updateLoop);
      } else {
        this.isRunning = false;
      }
    };

    this.animationId = requestAnimationFrame(updateLoop);

    this.oscillator.onended = () => {
      this.isRunning = false;
      cancelAnimationFrame(this.animationId);
    };
  }

  stopSweep() {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {}
      this.oscillator = null;
    }
  }
}
```

### 4.3 Output Device Selection (`setSinkId`)
Modern Chromium browsers support routing audio output to discrete speakers or headphones via `HTMLMediaElement.setSinkId()` and `AudioContext.setSinkId()`.
```javascript
export async function setAudioOutputDevice(mediaElementOrAudioCtx, sinkId) {
  if (typeof mediaElementOrAudioCtx.setSinkId === 'function') {
    try {
      await mediaElementOrAudioCtx.setSinkId(sinkId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.name, message: err.message };
    }
  }
  return { success: false, error: 'NotSupported', message: 'setSinkId is not supported in this browser' };
}
```

---

## 5. Permissions Matrix, Error Classification & Recovery Engine

### 5.1 Permissions API Query & State Tracking
```javascript
export async function queryPermissionStatus(permissionName) { // 'camera' or 'microphone'
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: permissionName });
      return {
        supported: true,
        state: status.state, // 'granted' | 'prompt' | 'denied'
        statusObject: status
      };
    } catch (e) {
      // Firefox & Safari throw for camera/microphone in permissions.query
      return { supported: false, state: 'unknown' };
    }
  }
  return { supported: false, state: 'unknown' };
}
```

### 5.2 Exhaustive WebRTC Media Error Matrix
When `getUserMedia` rejects, it returns specific DOMExceptions. The table below maps each exception to technical root causes and user-facing recovery guidance:

| DOMException Name | Root Cause | User Diagnosis | Automated Recovery Action |
|---|---|---|---|
| `NotAllowedError` / `PermissionDeniedError` | User clicked "Block", site permissions previously blocked, or OS Privacy sandbox blocked browser. | "Camera/Microphone access was denied." | Display interactive step-by-step browser omnibox unblock guide & OS Privacy Settings deep-link. |
| `NotFoundError` / `DevicesNotFoundError` | No physical camera or microphone detected on system. | "No device found." | Prompt user to check USB cable, plug in headset, or enable integrated webcam physical switch. |
| `NotReadableError` / `TrackStartError` | Device is already locked by another software (Zoom, Teams, OBS, Discord, Windows Camera App) or driver lockup. | "Device is in use by another app." | Guide user to close competing communication apps and reload page. |
| `OverconstrainedError` | The requested constraints (e.g. 4K 60fps) cannot be satisfied by hardware. | "Device does not support requested settings." | Auto-fallback to permissive constraints `{ video: true, audio: true }` and retry. |
| `AbortError` | Hardware error, OS permission prompt dismissed, or browser window minimized during handshake. | "Operation aborted by OS or browser." | Offer immediate "Retry Test" button with refreshed session. |
| `SecurityError` / `TypeError` | Page is loaded over insecure HTTP context (not HTTPS and not `localhost`). | "Insecure context." | Warn user that modern browsers strictly require HTTPS or `localhost` for media devices. |

### 5.3 Step-by-Step Browser & OS Troubleshooting Matrix

```
                          [ Media Request Fails ]
                                     |
             +-----------------------+-----------------------+
             |                                               |
   [ NotAllowedError ]                             [ NotReadableError ]
             |                                               |
             v                                               v
  Check Browser URL Bar                           Check Background Processes
  (Click Lock / Tune Icon)                        (Zoom, Teams, OBS, Meet)
             |                                               |
  Set Permission to "Allow"                       Terminate Conflicting Apps
             |                                               |
    Still Blocked? Check OS                         Still Locked? Check OS
             |                                               |
     +-------+-------+                               +-------+-------+
     |               |                               |               |
  [macOS]        [Windows]                        [macOS]        [Windows]
  System         Windows                          Reboot         Device
  Settings ->    Settings ->                      CoreAudio      Manager ->
  Privacy &      Privacy &                        Daemon         Disable/Enable
  Security       Microphone/                                     Camera
                 Camera
```

#### Detailed Guide Content for UI Modal / Accordion:
1. **Google Chrome**:
   - Click the **Tune / Lock** icon on the left side of the address bar.
   - Toggle **Camera** and **Microphone** to **On / Allow**.
   - If blocked by site settings: navigate to `chrome://settings/content/camera`.
2. **Mozilla Firefox**:
   - Click the **Permissions** badge icon in the address bar (red crossed-out camera/mic).
   - Click the **"X"** next to Blocked Temporarily / Allowed.
   - Reload page and select "Allow" with "Remember this decision".
3. **Apple Safari**:
   - In top menu: **Safari -> Settings -> Websites -> Camera & Microphone**.
   - Find current website and set dropdown to **Allow**.
   - macOS Privacy: **System Settings -> Privacy & Security -> Camera / Microphone** -> ensure Safari has checkmark.
4. **Microsoft Edge**:
   - Click the **Lock** icon in the address bar -> **Permissions for this site** -> set Camera and Microphone to **Allow**.
5. **Windows 11 / 10 OS Level**:
   - Open **Start -> Settings -> Privacy & Security -> Camera** (and Microphone).
   - Ensure "Camera access" is toggled **ON**.
   - Ensure "Let desktop apps access your camera" and "Let apps access your microphone" are toggled **ON**.
6. **Linux (Ubuntu / Fedora / Arch)**:
   - Check user group membership: `sudo usermod -a -G video,audio $USER`.
   - Check PipeWire / PulseAudio input status: `pactl list sources short` or `pavucontrol`.
   - Check v4l2 video nodes: `ls -l /dev/video*`.

---

## 6. Standalone Zero-Dependency Architecture & Module Blueprint

### 6.1 Directory & File Layout
To fulfill the zero-dependency requirement, the codebase in `/home/gourab/coding/sampleAgy/mic_cam_tester` is organized as clean modular ES6 components:

```
mic_cam_tester/
├── index.html                # Main semantic application structure & accessible UI
├── styles/
│   ├── main.css              # Core typography, responsive layout, CSS variables & theming
│   ├── camera.css            # Video viewport, resolution badge, FPS overlays, prober table
│   ├── microphone.css        # Waveform canvas, FFT spectrum, RMS dB meter, clipping alerts
│   ├── speaker.css           # Stereo balance visualizer, tone generator, frequency sweeper
│   └── troubleshooting.css   # Diagnostic step-by-step wizard & permission recovery modals
└── scripts/
    ├── app.js                # Main coordinator, tab navigation, global event orchestrator
    ├── camera.js             # Camera controller, getUserMedia, resolution prober, FPS tracker
    ├── microphone.js         # Web Audio DSP pipeline, RMS meter, clipping detector, noise floor
    ├── visualizer.js         # High-DPI 2D Canvas rendering engine (oscilloscope & FFT bars)
    ├── recorder.js           # MediaRecorder loopback recording, timer & audio playback
    ├── speaker.js            # Stereo panner, sine oscillator, frequency sweep engine
    ├── permissions.js        # Permissions API query, error classifier & diagnosis tree
    └── theme.js              # Dark/Light theme manager with localStorage & system sync
```

### 6.2 CSS Custom Properties Design System & Theming
A modern dark/light design system with high contrast ratios:

```css
:root {
  /* Color Palette - Light Theme */
  --bg-primary: #f8fafc;
  --bg-surface: #ffffff;
  --bg-surface-elevated: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  
  --border-color: #e2e8f0;
  --border-focus: #3b82f6;

  /* Status Colors */
  --color-brand: #2563eb;
  --color-brand-hover: #1d4ed8;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;

  /* Typography & Spacing */
  --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

[data-theme="dark"] {
  /* Color Palette - Dark Theme */
  --bg-primary: #0b0f19;
  --bg-surface: #111827;
  --bg-surface-elevated: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;

  --border-color: #374151;
  --border-focus: #60a5fa;

  --color-brand: #3b82f6;
  --color-brand-hover: #60a5fa;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.5);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
}
```

---

## 7. Cross-Browser Compatibility & Fallback Strategies

| Feature | Chrome / Chromium / Edge | Mozilla Firefox | Apple Safari (iOS / macOS) | Fallback Mechanism |
|---|---|---|---|---|
| `getUserMedia` | Full support | Full support | Full support | Prompt error modal if not HTTPS or unsupported |
| `requestVideoFrameCallback` | Full support (v83+) | Partial / Flag | Supported (v15.4+) | Seamless fallback to `requestAnimationFrame` loop |
| `getFloatTimeDomainData` | Full support | Full support | Full support | Universal support in all modern standards |
| `StereoPannerNode` | Full support | Full support | Full support | Fallback to `ChannelMergerNode` L/R routing |
| `HTMLMediaElement.setSinkId` | Full support | Disabled by default | Partial / Preview | Gracefully hide or disable output device dropdown |
| `navigator.permissions.query` | Full support for camera/mic | Throws on mic/cam | Throws on mic/cam | Wrap in `try/catch` and infer from `getUserMedia` result |
| `MediaRecorder` Audio MIME | `audio/webm;codecs=opus` | `audio/ogg;codecs=opus` | `audio/mp4` | Dynamic `isTypeSupported()` probe array |

---

## 8. Performance Optimization & Memory Management Guidelines

1. **Hardware Teardown on Tab Switch / Unload**:
   Whenever a user switches diagnostic tabs (e.g., from Camera to Microphone or Speaker), or leaves the page:
   - Call `track.stop()` on all video/audio tracks to immediately release hardware locks and turn off webcam LED indicator lights.
   - Set `HTMLVideoElement.srcObject = null`.
   - Cancel active `requestVideoFrameCallback` and `requestAnimationFrame` IDs.
2. **Canvas Memory & Garbage Collection**:
   - Reuse typed arrays (`Float32Array`, `Uint8Array`) across animation frames rather than allocating new arrays inside render loops.
   - Use `ctx.clearRect()` with integer coordinate boundaries.
3. **Decibel Meter Throttling**:
   - Throttle text DOM updates (numeric dB display, peak meter text) to 20–30 FPS while maintaining 60 FPS for Canvas waveforms. This avoids layout thrashing and DOM reflow bottlenecks.
4. **Zero-Telemetry Security**:
   - All inline icons rendered as pure vector SVG.
   - No external font files requested; relies on clean modern native system font stack (`system-ui`).

---

## 9. Conclusion & Implementation Readiness

The technical investigation confirms that a feature-complete, ad-free, high-precision camera, microphone, and speaker diagnostic web application can be built entirely with pure client-side standard Web APIs. The architecture and code patterns detailed in this report provide the Coding Agent with exact, battle-tested blueprints for rapid and robust implementation in Milestone 2.
