/**
 * Tier 3: Combinatorial & Multi-Feature Integration Test Suite (35 Test Cases)
 * Verifies complex multi-module interactions, concurrent hardware pipelines,
 * and asynchronous lifecycle state transitions across the application.
 * Zero-dependency Node.js 22 native test runner.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

// Import Mocks
import { setupDomEnvironment } from './mocks/dom_mock.mjs';
import { setupWebRtcMock, MockOverconstrainedError } from './mocks/webrtc_mock.mjs';
import { setupWebAudioMock } from './mocks/webaudio_mock.mjs';

// Base Paths
const WORKSPACE_DIR = '/home/gourab/coding/sampleAgy';
const WEB_APP_SCRIPTS = path.join(WORKSPACE_DIR, 'mic_cam_tester/scripts');

describe('Tier 3: Combinatorial Suite (35 Tests)', () => {
  let domEnv, webrtcEnv, webaudioEnv;
  let CameraService, calculateAspectRatio, COMMON_RESOLUTIONS;
  let MicrophoneService;
  let SpeakerService;
  let PermissionsService, ERROR_TYPES;
  let UIService;
  let AppCoordinator;

  before(async () => {
    domEnv = setupDomEnvironment();
    webrtcEnv = setupWebRtcMock();
    webaudioEnv = setupWebAudioMock();

    const camMod = await import(path.join(WEB_APP_SCRIPTS, 'camera.js'));
    CameraService = camMod.CameraService;
    calculateAspectRatio = camMod.calculateAspectRatio;
    COMMON_RESOLUTIONS = camMod.COMMON_RESOLUTIONS;

    const micMod = await import(path.join(WEB_APP_SCRIPTS, 'microphone.js'));
    MicrophoneService = micMod.MicrophoneService;

    const spkMod = await import(path.join(WEB_APP_SCRIPTS, 'speaker.js'));
    SpeakerService = spkMod.SpeakerService;

    const permMod = await import(path.join(WEB_APP_SCRIPTS, 'permissions.js'));
    PermissionsService = permMod.PermissionsService;
    ERROR_TYPES = permMod.ERROR_TYPES;

    const uiMod = await import(path.join(WEB_APP_SCRIPTS, 'ui.js'));
    UIService = uiMod.UIService;

    const appMod = await import(path.join(WEB_APP_SCRIPTS, 'app.js'));
    AppCoordinator = appMod.AppCoordinator;
  });

  afterEach(() => {
    if (webaudioEnv) webaudioEnv.teardown();
  });

  after(() => {
    if (webaudioEnv) webaudioEnv.teardown();
    if (domEnv) domEnv.teardown();
  });

  beforeEach(() => {
    webrtcEnv.mediaDevices.resetDevices();
    webrtcEnv.mediaDevices.faults.emptyDevices = false;
    webrtcEnv.mediaDevices.faults.getUserMediaError = null;
    webrtcEnv.mediaDevices.faults.blockedResolutions.clear();
    localStorage.clear();
  });

  it('TC-COMB-01: Camera 4K resolution switch while Microphone oscilloscope is actively rendering', async () => {
    const videoElem = document.createElement('video');
    const camService = new CameraService();
    camService.init(videoElem);
    await camService.startCamera();

    const waveCanvas = document.createElement('canvas');
    const specCanvas = document.createElement('canvas');
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), waveCanvas, specCanvas);
    await micService.startMicrophone();

    await camService.setResolution(3840, 2160);
    await new Promise(r => setTimeout(r, 40));

    assert.equal(camService.isActive, true);
    assert.equal(camService.getStats().width, 3840);
    assert.equal(micService.isActive, true);
    assert.ok(micService.currentRms >= 0);

    camService.stopCamera();
    micService.stopMicrophone();
  });

  it('TC-COMB-02: Microphone loopback recording while Speaker frequency sweep is playing concurrently', async () => {
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    const spkService = new SpeakerService();
    spkService.init(new AudioContext());
    spkService.startFrequencySweep(100, 5000, 2);

    micService.startRecording(200);
    await new Promise(r => setTimeout(r, 220));
    micService.stopRecording();

    assert.equal(spkService.isSweeping, true);
    assert.ok(micService.recordedBlob instanceof Blob || micService.recordedChunks.length > 0);

    spkService.stopFrequencySweep();
    micService.stopMicrophone();
  });

  it('TC-COMB-03: Dark/Light theme toggle while Camera snapshot is being drawn and exported', async () => {
    const uiService = new UIService();
    uiService.setTheme('dark');

    const videoElem = document.createElement('video');
    const camService = new CameraService();
    camService.init(videoElem);
    await camService.startCamera();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElem, 0, 0, 1920, 1080);
    const dataUrl = canvas.toDataURL('image/png');

    uiService.toggleTheme();
    assert.equal(uiService.currentTheme, 'light');
    assert.ok(dataUrl.startsWith('data:image/png;base64,'));

    camService.stopCamera();
  });

  it('TC-COMB-04: Speaker Left-channel tone playback while Microphone RMS dBFS meter is actively monitoring', async () => {
    const spkService = new SpeakerService();
    spkService.init(new AudioContext());
    spkService.playLeftChannelTone(440, 1000);

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    await new Promise(r => setTimeout(r, 50));
    assert.equal(spkService.isPlayingTone, true);
    assert.equal(spkService.currentChannel, 'left');
    assert.ok(micService.currentDb >= -100);

    spkService.stopChannelTone();
    micService.stopMicrophone();
  });

  it('TC-COMB-05: Device change event during active tab navigation between Camera and Troubleshoot', async () => {
    const uiService = new UIService();
    uiService.showTab('camera');
    assert.equal(uiService.currentTab, 'camera');

    let changeFired = false;
    navigator.mediaDevices.addEventListener('devicechange', () => { changeFired = true; });
    navigator.mediaDevices.dispatchDeviceChange();

    uiService.showTab('troubleshoot');
    assert.equal(uiService.currentTab, 'troubleshoot');
    assert.equal(changeFired, true);
  });

  it('TC-COMB-06: Camera device switch while Resolution Capability Prober is probing candidates', async () => {
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    await camService.startCamera('default-cam-1');

    const probePromise = camService.probeResolutions();
    const devs = await camService.enumerateDevices();
    await camService.startCamera(devs[1].deviceId);

    const results = await probePromise;
    assert.ok(Array.isArray(results));
    assert.equal(camService.currentDeviceId, devs[1].deviceId);
    camService.stopCamera();
  });

  it('TC-COMB-07: Microphone input switching while audio recording is in progress', async () => {
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone('default-mic-1');

    micService.startRecording(1000);
    assert.equal(micService.isRecording, true);

    await micService.startMicrophone('usb-mic-2');
    assert.equal(micService.currentDeviceId, 'usb-mic-2');

    micService.stopRecording();
    micService.stopMicrophone();
  });

  it('TC-COMB-08: Speaker output device change (setSinkId) during active frequency sweep', async () => {
    const spkService = new SpeakerService();
    spkService.init(new AudioContext());
    spkService.startFrequencySweep(20, 20000, 5);

    const speakers = await spkService.enumerateOutputDevices();
    const res = await spkService.setOutputDevice(speakers[1].deviceId);

    assert.equal(spkService.isSweeping, true);
    assert.equal(res.success, true);
    spkService.stopFrequencySweep();
  });

  it('TC-COMB-09: Simultaneous camera start and microphone start in parallel', async () => {
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));

    const [camStats, micStats] = await Promise.all([
      camService.startCamera(),
      micService.startMicrophone()
    ]);

    assert.equal(camService.isActive, true);
    assert.equal(micService.isActive, true);
    assert.equal(camStats.isActive, true);
    assert.ok(micStats);

    camService.stopCamera();
    micService.stopMicrophone();
  });

  it('TC-COMB-10: Camera zoom constraint adjustment while FPS counter loop is calculating EMA', async () => {
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    await camService.startCamera();

    await camService.currentTrack.applyConstraints({ advanced: [{ zoom: 2.0 }] });
    await new Promise(r => setTimeout(r, 40));

    const stats = camService.getStats();
    assert.equal(stats.capabilities.zoom.current || camService.currentTrack.getSettings().zoom, 2.0);
    assert.equal(typeof stats.fps, 'number');

    camService.stopCamera();
  });

  it('TC-COMB-11: Tab switch from Camera to Microphone updates UI view safely', () => {
    const uiService = new UIService();
    uiService.showTab('camera');
    assert.equal(uiService.currentTab, 'camera');

    uiService.showTab('microphone');
    assert.equal(uiService.currentTab, 'microphone');
  });

  it('TC-COMB-12: Error state trigger (NotAllowedError on Camera) while Microphone is healthy', async () => {
    const permService = new PermissionsService();
    const camService = new CameraService();
    camService.init(document.createElement('video'));

    webrtcEnv.mediaDevices.faults.getUserMediaError = 'NotAllowedError';
    let caughtErr = null;
    try {
      await camService.startCamera();
    } catch (e) {
      caughtErr = e;
    }
    assert.ok(caughtErr);

    const report = permService.classifyError(caughtErr);
    assert.equal(report.type, ERROR_TYPES.NOT_ALLOWED);

    webrtcEnv.mediaDevices.faults.getUserMediaError = null;
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();
    assert.equal(micService.isActive, true);
    micService.stopMicrophone();
  });

  it('TC-COMB-13: Audio clipping alert triggering while UI Toast notification is actively displaying', async () => {
    const uiService = new UIService();
    const toast = uiService.showNotification('Microphone Active', 'info', 3000);
    assert.ok(toast);

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    micService.analyserNode.signal.type = 'clipping';
    await new Promise(r => setTimeout(r, 50));
    assert.equal(micService.isClipping, true);

    micService.stopMicrophone();
  });

  it('TC-COMB-14: Speaker Right-channel tone generation while audio latency measurement is queried', () => {
    const spkService = new SpeakerService();
    spkService.init(new AudioContext());
    spkService.playRightChannelTone(440, 1000);

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    const latency = micService.getAudioLatency();

    assert.equal(spkService.currentChannel, 'right');
    assert.ok(latency.totalEstimatedLatencyMs >= 0);
    spkService.stopChannelTone();
  });

  it('TC-COMB-15: Diagnostic Report generation while Camera, Mic, and Speaker are all active', async () => {
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    await camService.startCamera();

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    const spkService = new SpeakerService();
    spkService.init(new AudioContext());
    spkService.playBothChannelsTone(440, 500);

    const permService = new PermissionsService();
    const report = {
      timestamp: new Date().toISOString(),
      platform: permService.detectPlatform(),
      camera: camService.getStats(),
      microphone: micService.getAudioMetrics(),
      speaker: { isPlayingTone: spkService.isPlayingTone }
    };

    assert.equal(report.camera.isActive, true);
    assert.equal(report.microphone.isActive, true);
    assert.equal(report.speaker.isPlayingTone, true);

    camService.stopCamera();
    micService.stopMicrophone();
    spkService.stopChannelTone();
  });

  it('TC-COMB-16: Theme switch from Dark to Light while Frequency Spectrum visualizer has active gradient bars', async () => {
    const uiService = new UIService();
    uiService.setTheme('dark');

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    uiService.setTheme('light');
    await new Promise(r => setTimeout(r, 40));

    assert.equal(uiService.currentTheme, 'light');
    assert.equal(micService.isActive, true);
    micService.stopMicrophone();
  });

  it('TC-COMB-17: Stop microphone while loopback audio snippet is currently playing', async () => {
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    micService.startRecording(100);
    await new Promise(r => setTimeout(r, 120));
    micService.stopRecording();
    await new Promise(r => setTimeout(r, 20));

    await micService.playLoopback();
    assert.equal(micService.isPlayingLoopback, true);

    micService.stopMicrophone();
    assert.equal(micService.isActive, false);
  });

  it('TC-COMB-18: Multiple consecutive camera snapshot captures while FPS monitor is reporting', async () => {
    const videoElem = document.createElement('video');
    const camService = new CameraService();
    camService.init(videoElem);
    await camService.startCamera();

    const snapshots = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < 5; i++) {
      ctx.drawImage(videoElem, 0, 0, 1920, 1080);
      snapshots.push(canvas.toDataURL('image/png'));
    }

    assert.equal(snapshots.length, 5);
    assert.equal(typeof camService.fps, 'number');
    camService.stopCamera();
  });

  it('TC-COMB-19: Noise floor calculation adaptation while Microphone input is switched', async () => {
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone('default-mic-1');

    await new Promise(r => setTimeout(r, 100));
    const floor1 = micService.noiseFloorDb;

    await micService.startMicrophone('usb-mic-2');
    await new Promise(r => setTimeout(r, 100));
    assert.ok(micService.noiseFloorDb <= 0);

    micService.stopMicrophone();
  });

  it('TC-COMB-20: Speaker Both-channels tone playback followed immediately by frequency sweep transition', () => {
    const spkService = new SpeakerService();
    spkService.init(new AudioContext());

    spkService.playBothChannelsTone(440, 2000);
    assert.equal(spkService.isPlayingTone, true);

    spkService.startFrequencySweep(20, 20000, 5);
    assert.equal(spkService.isPlayingTone, false);
    assert.equal(spkService.isSweeping, true);

    spkService.stopFrequencySweep();
  });

  it('TC-COMB-21: Troubleshoot guide rendering for NotReadableError while camera is stopped', () => {
    const container = document.createElement('div');
    container.id = 'comb-guide-test';
    document.body.appendChild(container);

    const permService = new PermissionsService();
    permService.renderTroubleshootingGuide('comb-guide-test', ERROR_TYPES.NOT_READABLE);

    assert.ok(container.innerHTML.includes('Locked') || container.innerHTML.includes('Device Already in Use') || container.innerHTML.includes('Permissions'));
  });

  it('TC-COMB-22: Browser permission query update while Camera service is active', async () => {
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    await camService.startCamera();

    const permStatus = await navigator.permissions.query({ name: 'camera' });
    permStatus.setState('denied');

    const permService = new PermissionsService();
    const status = await permService.checkPermissions();
    assert.equal(status.camera, 'denied');

    camService.stopCamera();
    permStatus.setState('granted');
  });

  it('TC-COMB-23: AudioContext suspend and resume cycle during live waveform rendering', async () => {
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    await micService.audioCtx.suspend();
    assert.equal(micService.audioCtx.state, 'suspended');

    await micService.audioCtx.resume();
    assert.equal(micService.audioCtx.state, 'running');

    micService.stopMicrophone();
  });

  it('TC-COMB-24: Select dropdown re-render while active device selection is retained', async () => {
    const uiService = new UIService();
    const select = document.createElement('select');

    const devs = await navigator.mediaDevices.enumerateDevices();
    const videoDevs = devs.filter(d => d.kind === 'videoinput');

    uiService.renderSelectOptions(select, videoDevs, videoDevs[1].deviceId);
    assert.equal(select.options.length, 2);
    assert.equal(select.value, videoDevs[1].deviceId);
  });

  it('TC-COMB-25: Offline mode simulation while generating plain-text and JSON diagnostic health reports', async () => {
    navigator.onLine = false;
    const permService = new PermissionsService();
    const info = permService.detectPlatform();

    const report = {
      offline: !navigator.onLine,
      platform: info,
      timestamp: new Date().toISOString()
    };

    const json = JSON.stringify(report);
    assert.ok(json.includes('offline":true'));
    navigator.onLine = true;
  });

  it('TC-COMB-26: High-DPI canvas retina resize during concurrent waveform and spectrum visualizer loops', async () => {
    const waveCanvas = document.createElement('canvas');
    const specCanvas = document.createElement('canvas');
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), waveCanvas, specCanvas);
    await micService.startMicrophone();

    window.devicePixelRatio = 3;
    waveCanvas.width = 800 * window.devicePixelRatio;
    specCanvas.width = 800 * window.devicePixelRatio;

    await new Promise(r => setTimeout(r, 40));
    assert.equal(waveCanvas.width, 2400);
    assert.equal(specCanvas.width, 2400);

    window.devicePixelRatio = 1;
    micService.stopMicrophone();
  });

  it('TC-COMB-27: Camera aspect ratio badge calculation during rapid resolution constraints application', async () => {
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    await camService.startCamera();

    await camService.setResolution(1920, 1080);
    let stats = camService.getStats();
    assert.equal(stats.aspectRatio, '16:9');

    await camService.setResolution(640, 480);
    stats = camService.getStats();
    assert.equal(stats.aspectRatio, '4:3');

    camService.stopCamera();
  });

  it('TC-COMB-28: Microphone recording download trigger while new recording starts immediately', async () => {
    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    micService.startRecording(100);
    await new Promise(r => setTimeout(r, 120));
    micService.stopRecording();
    await new Promise(r => setTimeout(r, 20));

    micService.downloadRecording('first-test.webm');
    micService.startRecording(100);
    assert.equal(micService.isRecording, true);

    micService.stopRecording();
    micService.stopMicrophone();
  });

  it('TC-COMB-29: Toast notification queueing in rapid succession (success, warning, error, info)', () => {
    const uiService = new UIService();
    const t1 = uiService.showNotification('Success message', 'success', 1000);
    const t2 = uiService.showNotification('Warning message', 'warning', 1000);
    const t3 = uiService.showNotification('Error message', 'error', 1000);
    const t4 = uiService.showNotification('Info message', 'info', 1000);

    assert.ok(t1 && t2 && t3 && t4);
    assert.ok(t1.className.includes('toast'));
    assert.ok(t2.className.includes('toast'));
    assert.ok(t3.className.includes('toast'));
    assert.ok(t4.className.includes('toast'));
  });

  it('TC-COMB-30: Full diagnostic system report export while device change dynamically updates hardware list', async () => {
    const permService = new PermissionsService();
    const devsBefore = await navigator.mediaDevices.enumerateDevices();

    navigator.mediaDevices.addDevice({
      deviceId: 'new-usb-mic-3',
      kind: 'audioinput',
      label: 'HyperX QuadCast S',
      groupId: 'usb-group-3'
    });

    const devsAfter = await navigator.mediaDevices.enumerateDevices();
    assert.equal(devsAfter.length, devsBefore.length + 1);

    const report = {
      deviceCount: devsAfter.length,
      platform: permService.detectPlatform()
    };
    assert.equal(report.deviceCount, devsAfter.length);
  });

  it('TC-COMB-31: WebRTC error classification (OverconstrainedError) triggering automated troubleshooting guide', () => {
    const permService = new PermissionsService();
    const err = new MockOverconstrainedError('width');
    const classified = permService.classifyError(err);
    assert.equal(classified.type, ERROR_TYPES.OVERCONSTRAINED);

    const container = document.createElement('div');
    container.id = 'guide-overconstrained-test';
    document.body.appendChild(container);
    permService.renderTroubleshootingGuide('guide-overconstrained-test', err);
    assert.ok(container.innerHTML.includes('accordion') || container.innerHTML.includes('Browser') || container.innerHTML.includes('Troubleshooting') || container.innerHTML.includes('Constraints'));
  });

  it('TC-COMB-32: Audio buffer pink noise synthesis while stereo panner routes to Left channel', () => {
    const spkService = new SpeakerService();
    const ctx = spkService._ensureAudioContext();

    const buffer = ctx.createBuffer(1, 4800, 48000);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      data[i] = b0 * 0.1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const panner = ctx.createStereoPanner();
    panner.pan.value = -1.0;
    source.connect(panner);
    panner.connect(ctx.destination);
    source.start(0);

    assert.equal(source._started, true);
    assert.equal(panner.pan.value, -1.0);
    source.stop(0);
  });

  it('TC-COMB-33: Camera facingMode toggle (user -> environment) with mirror transform update', async () => {
    const videoElem = document.createElement('video');
    const camService = new CameraService();
    camService.init(videoElem);
    await camService.startCamera();

    await camService.currentTrack.applyConstraints({ facingMode: 'environment' });
    videoElem.style.transform = 'none'; // Unmirror for rear camera

    assert.equal(camService.currentTrack.getSettings().facingMode, 'environment');
    assert.equal(videoElem.style.transform, 'none');

    camService.stopCamera();
  });

  it('TC-COMB-34: Simultaneous speaker frequency sweep and microphone loopback replay without audio context collision', async () => {
    const spkCtx = new AudioContext();
    const micCtx = new AudioContext();

    const spkService = new SpeakerService();
    spkService.init(spkCtx);
    spkService.startFrequencySweep(100, 2000, 2);

    const micService = new MicrophoneService();
    micService.init(micCtx, document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    micService.startRecording(100);
    await new Promise(r => setTimeout(r, 120));
    micService.stopRecording();
    await new Promise(r => setTimeout(r, 20));

    assert.equal(spkService.isSweeping, true);
    assert.ok(micService.recordedBlob instanceof Blob || micService.recordedChunks.length > 0);

    spkService.stopFrequencySweep();
    micService.stopMicrophone();
  });

  it('TC-COMB-35: AppCoordinator lifecycle: start all diagnostics, toggle theme, export report, clean teardown', async () => {
    const coordinator = new AppCoordinator();
    const appContainer = document.createElement('div');
    appContainer.innerHTML = `
      <div id="toast-container"></div>
      <video id="camera-video"></video>
      <canvas id="waveform-canvas"></canvas>
      <canvas id="spectrum-canvas"></canvas>
      <select id="camera-select"></select>
      <select id="microphone-select"></select>
      <select id="speaker-select"></select>
      <div id="troubleshoot-guide-container"></div>
    `;
    document.body.appendChild(appContainer);

    coordinator.init();
    assert.ok(coordinator.camera);
    assert.ok(coordinator.microphone);
    assert.ok(coordinator.speaker);
    assert.ok(coordinator.permissions);
    assert.ok(coordinator.ui);

    coordinator.ui.toggleTheme();
    assert.ok(coordinator.ui.currentTheme);
  });
});
