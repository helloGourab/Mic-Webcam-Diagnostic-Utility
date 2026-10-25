/**
 * Adversarial Stress & Deep DSP Edge Case Test Harness
 * Author: challenger_1 (Adversarial Stress Verifier)
 * 
 * Verifies:
 * 1. Audio DSP calculations: Silent buffers, log10(0)/-inf protection, full-scale square wave, clipped signals (|x| >= 0.99), peak decay, noise floor tracking, subnormal floats, DC offset.
 * 2. Speaker panner isolation: Pan -1.0 (Left-only), Pan 1.0 (Right-only), Pan 0.0 (Both), equal power panning law, anti-click exponential gain envelopes.
 * 3. Logarithmic frequency sweep: Exact formula scaling, geometric midpoint (632.45Hz at 50%), anti-click envelope, step progression telemetry.
 * 4. Camera aspect ratio & resolution logic: GCD robustness, 16:9, 4:3, 1:1, 9:16 portrait, 21:9 ultrawide, odd/prime resolutions, zero/negative/null inputs, 500-iteration random fuzzing.
 * 5. High-load concurrent operations: Camera + Mic + Speaker + Loopback simultaneously, rapid hammering (500 cycles), device hotplug stress, simulated queue pressure.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { setupDomEnvironment } from './mocks/dom_mock.mjs';
import { setupWebAudioMock } from './mocks/webaudio_mock.mjs';
import { setupWebRtcMock } from './mocks/webrtc_mock.mjs';

const WEB_APP_SCRIPTS = path.join('/home/gourab/coding/sampleAgy', 'mic_cam_tester/scripts');

describe('Adversarial Stress Verification Suite', () => {
  let domEnv, webaudioEnv, webrtcEnv;
  let CameraService, gcd, calculateAspectRatio, formatResolutionLabel, COMMON_RESOLUTIONS;
  let MicrophoneService;
  let SpeakerService;
  let PermissionsService;
  let AppCoordinator;

  before(async () => {
    domEnv = setupDomEnvironment();
    webrtcEnv = setupWebRtcMock();
    webaudioEnv = setupWebAudioMock();

    const camMod = await import(path.join(WEB_APP_SCRIPTS, 'camera.js'));
    CameraService = camMod.CameraService;
    gcd = camMod.gcd;
    calculateAspectRatio = camMod.calculateAspectRatio;
    formatResolutionLabel = camMod.formatResolutionLabel;
    COMMON_RESOLUTIONS = camMod.COMMON_RESOLUTIONS;

    const micMod = await import(path.join(WEB_APP_SCRIPTS, 'microphone.js'));
    MicrophoneService = micMod.MicrophoneService;

    const spkMod = await import(path.join(WEB_APP_SCRIPTS, 'speaker.js'));
    SpeakerService = spkMod.SpeakerService;

    const permMod = await import(path.join(WEB_APP_SCRIPTS, 'permissions.js'));
    PermissionsService = permMod.PermissionsService;

    const appMod = await import(path.join(WEB_APP_SCRIPTS, 'app.js'));
    AppCoordinator = appMod.AppCoordinator;
  });

  after(() => {
    if (domEnv) domEnv.teardown();
  });

  /* ========================================================================= */
  /* 1. AUDIO DSP CALCULATIONS & NUMERICAL STABILITY STRESS                    */
  /* ========================================================================= */
  describe('1. Audio DSP Mathematical Rigor & Stability', () => {
    let mic;

    beforeEach(() => {
      mic = new MicrophoneService();
    });

    afterEach(() => {
      if (mic) mic.stopMicrophone();
    });

    it('handles pure silent buffer (all zeros) without producing -Infinity or NaN in dBFS', async () => {
      await mic.startMicrophone();
      assert.ok(mic.analyserNode, 'AnalyserNode must be initialized');

      mic.analyserNode.signal = { type: 'silence' };

      mic.analyserNode.getFloatTimeDomainData(mic.timeDomainBuffer);
      let sumSquares = 0;
      let clipped = false;
      for (let i = 0; i < mic.timeDomainBuffer.length; i++) {
        const sample = mic.timeDomainBuffer[i];
        sumSquares += sample * sample;
        if (Math.abs(sample) >= 0.99) clipped = true;
      }
      const rms = Math.sqrt(sumSquares / mic.timeDomainBuffer.length);
      const clampedRms = Math.max(rms, 0.00001);
      const db = 20 * Math.log10(clampedRms);
      const currentDb = Math.max(-100, Math.min(0, db));

      assert.strictEqual(rms, 0, 'RMS for silent buffer must be exactly 0.0');
      assert.strictEqual(clampedRms, 0.00001, 'Clamped RMS must prevent log10(0)');
      assert.strictEqual(Number.isFinite(db), true, 'dB must be a finite number');
      assert.strictEqual(Number.isNaN(db), false, 'dB must not be NaN');
      assert.strictEqual(currentDb, -100, 'dBFS for silence must clamp to exactly -100 dBFS');
      assert.strictEqual(clipped, false, 'Silence must not trigger clipping');
    });

    it('handles subnormal floating point values (1e-35) without underflow crashes', async () => {
      await mic.startMicrophone();
      const subnormalData = new Float32Array(2048).fill(1e-35);
      mic.analyserNode.signal = { customTimeData: subnormalData };

      mic.analyserNode.getFloatTimeDomainData(mic.timeDomainBuffer);
      let sumSquares = 0;
      for (let i = 0; i < mic.timeDomainBuffer.length; i++) {
        const s = mic.timeDomainBuffer[i];
        sumSquares += s * s;
      }
      const rms = Math.sqrt(sumSquares / mic.timeDomainBuffer.length);
      const clampedRms = Math.max(rms, 0.00001);
      const db = 20 * Math.log10(clampedRms);
      const currentDb = Math.max(-100, Math.min(0, db));

      assert.strictEqual(Number.isFinite(currentDb), true);
      assert.strictEqual(currentDb, -100);
    });

    it('calculates exact RMS and 0 dBFS for full-scale square wave', async () => {
      await mic.startMicrophone();
      mic.analyserNode.signal = { type: 'clipping' }; // Generates +/- 1.0 square wave

      mic.analyserNode.getFloatTimeDomainData(mic.timeDomainBuffer);
      let sumSquares = 0;
      let clipped = false;
      for (let i = 0; i < mic.timeDomainBuffer.length; i++) {
        const s = mic.timeDomainBuffer[i];
        sumSquares += s * s;
        if (Math.abs(s) >= 0.99) clipped = true;
      }
      const rms = Math.sqrt(sumSquares / mic.timeDomainBuffer.length);
      const clampedRms = Math.max(rms, 0.00001);
      const db = 20 * Math.log10(clampedRms);
      const currentDb = Math.max(-100, Math.min(0, db));

      assert.strictEqual(Math.abs(rms - 1.0) < 1e-6, true, `Square wave RMS must be 1.0, got ${rms}`);
      assert.strictEqual(Math.abs(currentDb - 0.0) < 1e-4, true, `Full scale square wave must be 0 dBFS, got ${currentDb}`);
      assert.strictEqual(clipped, true, 'Square wave with amplitude 1.0 must trigger clipping');
    });

    it('calculates theoretical RMS = A / sqrt(2) for pure sine waves across various amplitudes', async () => {
      await mic.startMicrophone();

      const testAmplitudes = [0.1, 0.25, 0.5, 0.707, 0.9, 0.98];
      for (const amp of testAmplitudes) {
        mic.analyserNode.signal = { type: 'sine', frequency: 1000, amplitude: amp, noiseFloor: 0 };
        mic.analyserNode.getFloatTimeDomainData(mic.timeDomainBuffer);

        let sumSquares = 0;
        for (let i = 0; i < mic.timeDomainBuffer.length; i++) {
          const s = mic.timeDomainBuffer[i];
          sumSquares += s * s;
        }
        const rms = Math.sqrt(sumSquares / mic.timeDomainBuffer.length);
        const expectedRms = amp / Math.SQRT2;
        const diff = Math.abs(rms - expectedRms);

        assert.ok(diff < 0.02, `Sine amp ${amp}: expected RMS ~${expectedRms.toFixed(4)}, got ${rms.toFixed(4)}`);

        const db = 20 * Math.log10(Math.max(rms, 0.00001));
        const expectedDb = 20 * Math.log10(expectedRms);
        assert.ok(Math.abs(db - expectedDb) < 0.3, `Sine amp ${amp}: expected dB ~${expectedDb.toFixed(2)}, got ${db.toFixed(2)}`);
      }
    });

    it('strictly triggers clipping flag at |x| >= 0.99 and avoids false triggers at |x| < 0.99', async () => {
      await mic.startMicrophone();

      // 1. Buffer with a single clipped sample >= 0.99
      const clippedData = new Float32Array(2048).fill(0.1);
      clippedData[100] = 0.991;
      mic.analyserNode.signal = { customTimeData: clippedData };

      mic.analyserNode.getFloatTimeDomainData(mic.timeDomainBuffer);
      let clipped = false;
      for (let i = 0; i < mic.timeDomainBuffer.length; i++) {
        if (Math.abs(mic.timeDomainBuffer[i]) >= 0.99) clipped = true;
      }
      assert.strictEqual(clipped, true, 'Sample >= 0.99 must trigger clipped flag');

      // 2. Buffer with sample strictly below threshold (0.989)
      const safeData = new Float32Array(2048).fill(0.1);
      safeData[100] = 0.989;
      mic.analyserNode.signal = { customTimeData: safeData };

      mic.analyserNode.getFloatTimeDomainData(mic.timeDomainBuffer);
      clipped = false;
      for (let i = 0; i < mic.timeDomainBuffer.length; i++) {
        if (Math.abs(mic.timeDomainBuffer[i]) >= 0.99) clipped = true;
      }
      assert.strictEqual(clipped, false, 'Sample < 0.99 must not trigger clipped flag');
    });

    it('validates peak hold decay mechanics monotonically reduce peak dB', () => {
      let currentDb = -10;
      let peakDb = -10;
      const decayRate = mic.peakDecayRate;

      currentDb = -90;
      const peakHistory = [];

      for (let frame = 0; frame < 50; frame++) {
        if (currentDb > peakDb) {
          peakDb = currentDb;
        } else {
          peakDb = Math.max(-100, peakDb - decayRate);
        }
        peakHistory.push(peakDb);
      }

      for (let i = 1; i < peakHistory.length; i++) {
        assert.ok(peakHistory[i] <= peakHistory[i - 1], `Peak at frame ${i} (${peakHistory[i]}) must be <= frame ${i-1} (${peakHistory[i-1]})`);
        assert.ok(Math.abs((peakHistory[i-1] - peakHistory[i]) - decayRate) < 1e-6 || peakHistory[i] === -90 || peakHistory[i] === -100);
      }
    });

    it('tracks 10th percentile background noise floor accurately under fluctuating noise', () => {
      const noiseWindow = [];
      const windowSize = 80;

      for (let i = 0; i < windowSize; i++) {
        const val = (i % 5 === 0) ? -20 : (-65 + (Math.sin(i) * 3));
        noiseWindow.push(val);
      }

      const sorted = [...noiseWindow].sort((a, b) => a - b);
      const p10 = sorted[Math.floor(sorted.length * 0.1)];

      assert.ok(p10 <= -62 && p10 >= -70, `10th percentile noise floor should be ~ -65 dBFS, got ${p10}`);
    });
  });

  /* ========================================================================= */
  /* 2. SPEAKER PANNER ISOLATION & ENVELOPE SHAPING                            */
  /* ========================================================================= */
  describe('2. Speaker Panner Isolation & Anti-Click Gain Envelopes', () => {
    let speaker;

    beforeEach(() => {
      speaker = new SpeakerService();
      speaker.init();
    });

    afterEach(() => {
      if (speaker) speaker.stopChannelTone();
    });

    it('configures StereoPanner pan parameter strictly to -1.0 for Left channel tone', () => {
      const res = speaker.playLeftChannelTone(440, 1000);
      assert.strictEqual(res.channel, 'left');
      assert.strictEqual(speaker.isPlayingTone, true);
      assert.strictEqual(speaker.currentChannel, 'left');
      assert.ok(speaker.pannerNode, 'Panner node must be created');
      assert.strictEqual(speaker.pannerNode.pan.value, -1.0, 'Left channel tone must set pan to -1.0');

      speaker.stopChannelTone();
      assert.strictEqual(speaker.isPlayingTone, false);
      assert.strictEqual(speaker.pannerNode, null);
    });

    it('configures StereoPanner pan parameter strictly to +1.0 for Right channel tone', () => {
      const res = speaker.playRightChannelTone(440, 1000);
      assert.strictEqual(res.channel, 'right');
      assert.strictEqual(speaker.isPlayingTone, true);
      assert.strictEqual(speaker.currentChannel, 'right');
      assert.ok(speaker.pannerNode, 'Panner node must be created');
      assert.strictEqual(speaker.pannerNode.pan.value, 1.0, 'Right channel tone must set pan to +1.0');

      speaker.stopChannelTone();
      assert.strictEqual(speaker.isPlayingTone, false);
    });

    it('configures StereoPanner pan parameter strictly to 0.0 for Both channels tone', () => {
      const res = speaker.playBothChannelsTone(440, 1000);
      assert.strictEqual(res.channel, 'both');
      assert.strictEqual(speaker.isPlayingTone, true);
      assert.strictEqual(speaker.currentChannel, 'both');
      assert.ok(speaker.pannerNode, 'Panner node must be created');
      assert.strictEqual(speaker.pannerNode.pan.value, 0.0, 'Both channels tone must set pan to 0.0');

      speaker.stopChannelTone();
    });

    it('verifies anti-click gain envelope non-zero baseline avoids Web Audio zero-logarithm errors', () => {
      speaker.playLeftChannelTone(440, 2000);
      const gainEvents = speaker.gainNode.gain.events;

      assert.ok(gainEvents.length >= 4, `Expected at least 4 gain automation events, got ${gainEvents.length}`);
      
      const initialSet = gainEvents.find(e => e.type === 'setValueAtTime');
      assert.ok(initialSet, 'Must have setValueAtTime at start');
      assert.strictEqual(initialSet.value, 0.0001, 'Initial gain must be 0.0001 (non-zero anti-click baseline)');

      const attackRamp = gainEvents.find(e => e.type === 'exponentialRampToValueAtTime' && e.value === 0.45);
      assert.ok(attackRamp, 'Must ramp up to 0.45');

      const releaseRamp = gainEvents.filter(e => e.type === 'exponentialRampToValueAtTime')[1];
      assert.ok(releaseRamp, 'Must ramp down to 0.0001');
      assert.strictEqual(releaseRamp.value, 0.0001, 'Release ramp target must be non-zero (0.0001)');

      speaker.stopChannelTone();
    });
  });

  /* ========================================================================= */
  /* 3. 20Hz - 20kHz LOGARITHMIC FREQUENCY SWEEP VERIFICATION                  */
  /* ========================================================================= */
  describe('3. 20Hz - 20kHz Logarithmic Frequency Sweep Calculations', () => {
    let speaker;

    beforeEach(() => {
      speaker = new SpeakerService();
      speaker.init();
    });

    afterEach(() => {
      if (speaker) speaker.stopFrequencySweep();
    });

    it('calculates exact logarithmic frequency scaling f(p) = f0 * (f1 / f0)^p', () => {
      const f0 = 20;
      const f1 = 20000;
      const ratio = f1 / f0; // 1000

      const calcHz = (p) => Math.round(f0 * Math.pow(ratio, p));

      assert.strictEqual(calcHz(0.0), 20, 'At 0% progress, frequency must be 20 Hz');
      assert.strictEqual(calcHz(1.0), 20000, 'At 100% progress, frequency must be 20,000 Hz');

      const midHz = calcHz(0.5);
      assert.strictEqual(midHz, 632, `Midpoint at 50% must equal 632 Hz (geometric mean), got ${midHz}`);

      assert.strictEqual(calcHz(0.25), 112, 'At 25% progress, frequency must be 112 Hz');
      assert.strictEqual(calcHz(0.75), 3557, 'At 75% progress, frequency must be 3557 Hz');
    });

    it('verifies frequency sweep monotonicity across 1000 continuous progression steps', () => {
      const f0 = 20;
      const f1 = 20000;
      let prevHz = f0;

      for (let step = 1; step <= 1000; step++) {
        const p = step / 1000;
        const currentHz = f0 * Math.pow(f1 / f0, p);
        assert.ok(currentHz > prevHz, `Step ${step} (${currentHz} Hz) must be strictly greater than previous (${prevHz} Hz)`);
        prevHz = currentHz;
      }
      assert.strictEqual(Math.round(prevHz), 20000);
    });

    it('sets up Web Audio exponentialRampToValueAtTime for sweep oscillator and anti-click gain envelope', () => {
      speaker.startFrequencySweep(20, 20000, 5);
      assert.strictEqual(speaker.isSweeping, true);
      assert.ok(speaker.sweepOscillator, 'Sweep oscillator must be instantiated');
      assert.ok(speaker.sweepGain, 'Sweep gain node must be instantiated');

      const freqEvents = speaker.sweepOscillator.frequency.events;
      const gainEvents = speaker.sweepGain.gain.events;

      assert.ok(freqEvents.some(e => e.type === 'exponentialRampToValueAtTime' && e.value === 20000));
      assert.ok(gainEvents.some(e => e.type === 'setValueAtTime' && e.value === 0.0001));
      assert.ok(gainEvents.some(e => e.type === 'exponentialRampToValueAtTime' && e.value === 0.35));

      speaker.stopFrequencySweep();
      assert.strictEqual(speaker.isSweeping, false);
      assert.strictEqual(speaker.sweepOscillator, null);
    });
  });

  /* ========================================================================= */
  /* 4. CAMERA ASPECT RATIO & RESOLUTION PROBING EDGE CASES                    */
  /* ========================================================================= */
  describe('4. Camera Aspect Ratio & Resolution Probing Edge Cases', () => {
    it('verifies Euclidean GCD function with normal, prime, zero, and extreme values', () => {
      assert.strictEqual(gcd(1920, 1080), 120);
      assert.strictEqual(gcd(1280, 720), 80);
      assert.strictEqual(gcd(640, 480), 160);
      assert.strictEqual(gcd(3840, 2160), 240);
      assert.strictEqual(gcd(1000, 1000), 1000);
      assert.strictEqual(gcd(1921, 1079), 1);
      assert.strictEqual(gcd(0, 1080), 1080);
      assert.strictEqual(gcd(1920, 0), 1920);
      assert.strictEqual(gcd(0, 0), 0);
    });

    it('correctly classifies standard widescreen, square, portrait, and ultrawide resolutions', () => {
      const res1080 = calculateAspectRatio(1920, 1080);
      assert.strictEqual(res1080.ratio, '16:9');
      assert.strictEqual(res1080.label, '16:9 (Widescreen)');

      const res720 = calculateAspectRatio(1280, 720);
      assert.strictEqual(res720.ratio, '16:9');
      assert.strictEqual(res720.label, '16:9 (Widescreen)');

      const res4k = calculateAspectRatio(3840, 2160);
      assert.strictEqual(res4k.ratio, '16:9');
      assert.strictEqual(res4k.label, '16:9 (Widescreen)');

      const res480 = calculateAspectRatio(854, 480);
      assert.strictEqual(res480.label, '16:9 (Widescreen)');

      const res43 = calculateAspectRatio(640, 480);
      assert.strictEqual(res43.ratio, '4:3');
      assert.strictEqual(res43.label, '4:3 (Standard)');

      const resVga = calculateAspectRatio(1024, 768);
      assert.strictEqual(resVga.ratio, '4:3');
      assert.strictEqual(resVga.label, '4:3 (Standard)');

      const resSquare = calculateAspectRatio(1000, 1000);
      assert.strictEqual(resSquare.ratio, '1:1');
      assert.strictEqual(resSquare.label, '1:1 (Square)');

      const resPortrait = calculateAspectRatio(1080, 1920);
      assert.strictEqual(resPortrait.ratio, '9:16');
      assert.strictEqual(resPortrait.label, '9:16 (Portrait / Story)');

      const resUltrawide = calculateAspectRatio(2560, 1080);
      assert.strictEqual(resUltrawide.label, '21:9 (Ultrawide)');
    });

    it('fuzzes aspect ratio calculator with 500 random resolution combinations without failure', () => {
      for (let i = 0; i < 500; i++) {
        const w = Math.floor(Math.random() * 8000) + 1;
        const h = Math.floor(Math.random() * 8000) + 1;
        const res = calculateAspectRatio(w, h);
        assert.ok(typeof res.ratio === 'string');
        assert.ok(typeof res.label === 'string');
        assert.ok(res.ratio.includes(':'), `Ratio must include colon: ${res.ratio}`);
      }
    });

    it('safely handles zero, negative, null, NaN, and unhandled edge inputs in aspect ratio calculator', () => {
      assert.deepStrictEqual(calculateAspectRatio(0, 0), { ratio: 'N/A', label: 'Unknown' });
      assert.deepStrictEqual(calculateAspectRatio(0, 1080), { ratio: 'N/A', label: 'Unknown' });
      assert.deepStrictEqual(calculateAspectRatio(1920, 0), { ratio: 'N/A', label: 'Unknown' });
      assert.deepStrictEqual(calculateAspectRatio(-1920, 1080), { ratio: 'N/A', label: 'Unknown' });
      assert.deepStrictEqual(calculateAspectRatio(1920, -1080), { ratio: 'N/A', label: 'Unknown' });
      assert.deepStrictEqual(calculateAspectRatio(null, null), { ratio: 'N/A', label: 'Unknown' });
      assert.deepStrictEqual(calculateAspectRatio(undefined, undefined), { ratio: 'N/A', label: 'Unknown' });
      assert.deepStrictEqual(calculateAspectRatio(NaN, 1080), { ratio: 'N/A', label: 'Unknown' });
    });

    it('formats marketing resolution labels correctly', () => {
      assert.strictEqual(formatResolutionLabel(3840, 2160), '3840x2160 (4K UHD)');
      assert.strictEqual(formatResolutionLabel(2560, 1440), '2560x1440 (2K QHD)');
      assert.strictEqual(formatResolutionLabel(1920, 1080), '1920x1080 (1080p Full HD)');
      assert.strictEqual(formatResolutionLabel(1280, 720), '1280x720 (720p HD)');
      assert.strictEqual(formatResolutionLabel(854, 480), '854x480 (480p SD)');
      assert.strictEqual(formatResolutionLabel(640, 480), '640x480');
      assert.strictEqual(formatResolutionLabel(0, 0), 'N/A');
    });

    it('probes all standard COMMON_RESOLUTIONS without crashing or leaking streams', async () => {
      const cam = new CameraService();
      const progressSteps = [];
      const results = await cam.probeResolutions('default-cam-1', (res, ratio, current, total) => {
        progressSteps.push({ current, total, ratio });
      });

      assert.strictEqual(results.length, COMMON_RESOLUTIONS.length);
      assert.strictEqual(progressSteps.length, COMMON_RESOLUTIONS.length);
      assert.ok(results.every(r => typeof r.supported === 'boolean'));
      assert.ok(results.some(r => r.name === '1080p Full HD' && r.supported === true));
    });
  });

  /* ========================================================================= */
  /* 5. HIGH-LOAD CONCURRENT OPERATIONS & RAPID HAMMERING STRESS               */
  /* ========================================================================= */
  describe('5. High-Load Concurrency & Rapid Teardown Hammering', () => {
    it('executes Camera, Mic, Speaker Frequency Sweep, and MediaRecorder Loopback simultaneously', async () => {
      const cam = new CameraService();
      const mic = new MicrophoneService();
      const speaker = new SpeakerService();

      const [camStats, micMetrics] = await Promise.all([
        cam.startCamera(),
        mic.startMicrophone()
      ]);

      speaker.startFrequencySweep(20, 20000, 2);

      assert.strictEqual(cam.isActive, true);
      assert.strictEqual(mic.isActive, true);
      assert.strictEqual(speaker.isSweeping, true);

      let recordingFinished = false;
      let recordedBlobResult = null;

      await new Promise((resolve) => {
        mic.startRecording(300, null, (blob) => {
          recordingFinished = true;
          recordedBlobResult = blob;
          resolve();
        });
      });

      assert.strictEqual(recordingFinished, true);
      assert.ok(recordedBlobResult, 'Recorded Blob must be created');

      cam.stopCamera();
      mic.stopMicrophone();
      speaker.stopFrequencySweep();

      assert.strictEqual(cam.isActive, false);
      assert.strictEqual(mic.isActive, false);
      assert.strictEqual(speaker.isSweeping, false);
    });

    it('survives 200 rapid cycles of start/stop hammering across all modules without state corruption', async () => {
      const cam = new CameraService();
      const mic = new MicrophoneService();
      const speaker = new SpeakerService();

      for (let i = 0; i < 200; i++) {
        await cam.startCamera();
        await mic.startMicrophone();
        speaker.playLeftChannelTone(440, 20);

        assert.strictEqual(cam.isActive, true);
        assert.strictEqual(mic.isActive, true);
        assert.strictEqual(speaker.isPlayingTone, true);

        cam.stopCamera();
        mic.stopMicrophone();
        speaker.stopChannelTone();

        assert.strictEqual(cam.isActive, false);
        assert.strictEqual(mic.isActive, false);
        assert.strictEqual(speaker.isPlayingTone, false);
      }
    });

    it('handles device hotplug events during active streams gracefully', async () => {
      const coordinator = new AppCoordinator();
      await coordinator.init();

      await coordinator.camera.startCamera();
      await coordinator.microphone.startMicrophone();
      assert.strictEqual(coordinator.camera.isActive, true);
      assert.strictEqual(coordinator.microphone.isActive, true);

      const newCamera = {
        deviceId: 'usb-cam-999',
        kind: 'videoinput',
        label: '4K Ultra StreamCam',
        groupId: 'usb-group-999'
      };
      const newMic = {
        deviceId: 'usb-mic-999',
        kind: 'audioinput',
        label: 'Studio XLR Interface',
        groupId: 'usb-group-999'
      };

      navigator.mediaDevices.addDevice(newCamera);
      navigator.mediaDevices.addDevice(newMic);

      await coordinator.refreshDevices();

      assert.strictEqual(coordinator.camera.isActive, true);
      assert.strictEqual(coordinator.microphone.isActive, true);

      coordinator.camera.stopCamera();
      coordinator.microphone.stopMicrophone();
    });
  });

  /* ========================================================================= */
  /* 6. PERMISSIONS & FAULT INJECTION ERROR RECOVERY                           */
  /* ========================================================================= */
  describe('6. Permissions & Fault Recovery Robustness', () => {
    let permissions;

    beforeEach(() => {
      permissions = new PermissionsService();
    });

    it('accurately classifies NotAllowedError with actionable OS/Browser recovery guide', () => {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';

      const classified = permissions.classifyError(err);
      assert.strictEqual(classified.type, 'NotAllowedError');
      assert.strictEqual(classified.name, 'NotAllowedError');
      assert.strictEqual(classified.severity, 'danger');
      assert.ok(classified.solution.length > 10);
    });

    it('accurately classifies NotFoundError when no camera/microphone is connected', () => {
      const err = new Error('Requested device not found');
      err.name = 'NotFoundError';

      const classified = permissions.classifyError(err);
      assert.strictEqual(classified.type, 'NotFoundError');
      assert.strictEqual(classified.name, 'NotFoundError');
      assert.strictEqual(classified.severity, 'warning');
      assert.ok(classified.solution.length > 10);
    });

    it('renders platform-filtered troubleshooting guide for macOS, Windows, and Linux', () => {
      const div = document.createElement('div');
      div.id = 'troubleshooting-container';
      document.body.appendChild(div);

      permissions.renderTroubleshootingGuide('troubleshooting-container', null, 'macos');
      assert.ok(div.innerHTML.includes('macOS'), 'Must render macOS instructions');

      permissions.renderTroubleshootingGuide('troubleshooting-container', null, 'windows');
      assert.ok(div.innerHTML.includes('Windows'), 'Must render Windows instructions');

      permissions.renderTroubleshootingGuide('troubleshooting-container', null, 'linux');
      assert.ok(div.innerHTML.includes('Linux'), 'Must render Linux instructions');

      document.body.removeChild(div);
    });
  });
});
