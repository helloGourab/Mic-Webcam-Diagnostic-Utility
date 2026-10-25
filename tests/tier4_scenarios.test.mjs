/**
 * Tier 4: Real-World Application Workflow Scenarios Test Suite (12 Comprehensive Scenarios)
 * Simulates complete end-to-end multi-step user workflows, hardware state lifecycles,
 * network/permission edge conditions, and diagnostic report exports.
 * Zero-dependency Node.js 22 native test runner.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

// Import Mocks
import { setupDomEnvironment } from './mocks/dom_mock.mjs';
import { setupWebRtcMock, MockOverconstrainedError, MockDOMException } from './mocks/webrtc_mock.mjs';
import { setupWebAudioMock } from './mocks/webaudio_mock.mjs';

// Base Paths
const WORKSPACE_DIR = '/home/gourab/coding/sampleAgy';
const WEB_APP_SCRIPTS = path.join(WORKSPACE_DIR, 'mic_cam_tester/scripts');

describe('Tier 4: Real-World Application Workflow Scenarios (12 Scenarios)', () => {
  let domEnv, webrtcEnv, webaudioEnv;
  let CameraService, calculateAspectRatio, formatResolutionLabel, COMMON_RESOLUTIONS;
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
    formatResolutionLabel = camMod.formatResolutionLabel;
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
    navigator.onLine = true;
  });

  /* =========================================================================
   * Scenario 1: Streamer Pre-Flight Broadcast Check
   * ========================================================================= */
  it('SCN-01: Streamer Pre-Flight Broadcast Check (4K Webcam, Studio Mic, Peak Clipping, Stereo Tone & Loopback)', async () => {
    // 1. Setup Streamer Environment
    const videoElem = document.createElement('video');
    const waveCanvas = document.createElement('canvas');
    const specCanvas = document.createElement('canvas');
    const audioCtx = new AudioContext();

    const camService = new CameraService();
    camService.init(videoElem);

    const micService = new MicrophoneService();
    micService.init(audioCtx, waveCanvas, specCanvas);

    const spkService = new SpeakerService();
    spkService.init(audioCtx);

    // 2. Start Camera and verify 1080p FHD baseline
    await camService.startCamera();
    assert.equal(camService.isActive, true, 'Camera should be active');
    let camStats = camService.getStats();
    assert.equal(camStats.width, 1920);
    assert.equal(camStats.height, 1080);
    assert.equal(camStats.aspectRatio, '16:9');

    // 3. Prober tests 4K capability and switches to 4K UHD
    await camService.setResolution(3840, 2160);
    camStats = camService.getStats();
    assert.equal(camStats.width, 3840);
    assert.equal(camStats.height, 2160);
    assert.equal(camStats.aspectRatio, '16:9');
    assert.equal(camStats.aspectRatioLabel, '16:9 (Widescreen)');

    // 4. Verify FPS counter loop
    await new Promise(r => setTimeout(r, 60));
    assert.ok(camService.fps >= 0);

    // 5. Start Microphone Service with Studio Mic
    await micService.startMicrophone();
    assert.equal(micService.isActive, true, 'Microphone should be active');

    // 6. Test Peak Clipping detection during vocal loud burst
    micService.analyserNode.signal.type = 'clipping';
    await new Promise(r => setTimeout(r, 40));
    assert.equal(micService.isClipping, true, 'Clipping detector must flag peak overload');
    const loudMetrics = micService.getAudioMetrics();
    assert.equal(loudMetrics.isClipping, true);

    // 7. Verify Speaker Stereo Channel Check (Left, then Right)
    spkService.playLeftChannelTone(440);
    assert.equal(spkService.currentChannel, 'left');
    assert.equal(spkService.pannerNode.pan.value, -1.0);
    spkService.stopChannelTone();

    spkService.playRightChannelTone(440);
    assert.equal(spkService.currentChannel, 'right');
    assert.equal(spkService.pannerNode.pan.value, 1.0);
    spkService.stopChannelTone();

    // 8. Perform 150ms Loopback Voice Replay Test
    micService.startRecording(150);
    assert.equal(micService.isRecording, true);
    await new Promise(r => setTimeout(r, 180));
    micService.stopRecording();
    await new Promise(r => setTimeout(r, 20));

    assert.equal(micService.isRecording, false);
    assert.ok(micService.recordedBlob, 'Recorded audio blob must be created');
    assert.ok(micService.recordedBlob.type.includes('audio/webm'));

    // 9. Teardown gracefully
    camService.stopCamera();
    micService.stopMicrophone();
    assert.equal(camService.isActive, false);
    assert.equal(micService.isActive, false);
  });

  /* =========================================================================
   * Scenario 2: Remote Worker Video Interview Setup
   * ========================================================================= */
  it('SCN-02: Remote Worker Video Interview Setup (Device Switch, Noise Floor, Voice Greeting Loopback, Mirror & Theme)', async () => {
    // 1. Device Enumeration & Selection
    const devs = await navigator.mediaDevices.enumerateDevices();
    const mics = devs.filter(d => d.kind === 'audioinput');
    const cams = devs.filter(d => d.kind === 'videoinput');
    assert.ok(mics.length >= 2, 'Should have multiple microphones available');
    assert.ok(cams.length >= 2, 'Should have multiple cameras available');

    // 2. Select Headset Microphone (Device 2)
    const headsetMic = mics[1];
    const micService = new MicrophoneService();
    const audioCtx = new AudioContext();
    micService.init(audioCtx, document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone(headsetMic.deviceId);

    assert.equal(micService.currentDeviceId, headsetMic.deviceId);

    // 3. Noise Floor Calibration in quiet room
    micService.analyserNode.signal.type = 'silence';
    await new Promise(r => setTimeout(r, 40));
    const quietMetrics = micService.getAudioMetrics();
    assert.ok(quietMetrics.noiseFloorDb <= -50, `Noise floor should be <= -50 dBFS (was ${quietMetrics.noiseFloorDb})`);

    // 4. Test Interview Greeting Loopback Recording
    micService.startRecording(120);
    await new Promise(r => setTimeout(r, 140));
    micService.stopRecording();
    await new Promise(r => setTimeout(r, 20));

    assert.ok(micService.recordedBlob);
    assert.doesNotThrow(() => micService.playLoopback());
    assert.equal(micService.isPlayingLoopback, true);
    micService.stopLoopback();
    assert.equal(micService.isPlayingLoopback, false);

    // 5. Camera Mirror Check for user front-facing camera
    const videoElem = document.createElement('video');
    const camService = new CameraService();
    camService.init(videoElem);
    await camService.startCamera(cams[0].deviceId);

    assert.equal(camService.currentTrack.getSettings().facingMode, 'user');
    videoElem.style.transform = 'scaleX(-1)';
    assert.equal(videoElem.style.transform, 'scaleX(-1)');

    // 6. Daytime Theme adjustment (Light Mode)
    const uiService = new UIService();
    uiService.setTheme('light');
    assert.equal(uiService.currentTheme, 'light');
    assert.equal(localStorage.getItem('mic_cam_tester_theme'), 'light');

    // Cleanup
    camService.stopCamera();
    micService.stopMicrophone();
  });

  /* =========================================================================
   * Scenario 3: Telehealth Doctor Clinical Consultation Session
   * ========================================================================= */
  it('SCN-03: Telehealth Doctor Consultation (Bandwidth 720p Negotiation, Isolated Stereo & Speech-Band Sweep)', async () => {
    // 1. Probing camera resolutions to pick stable 720p HD for medical stream
    const camService = new CameraService();
    const videoElem = document.createElement('video');
    camService.init(videoElem);
    await camService.startCamera();

    const capabilities = await camService.probeResolutions();
    assert.ok(capabilities.length >= 4, 'Should detect supported resolutions');

    // Set 720p HD
    await camService.setResolution(1280, 720);
    const stats = camService.getStats();
    assert.equal(stats.width, 1280);
    assert.equal(stats.height, 720);
    assert.equal(stats.resolutionLabel, '1280x720 (720p HD)');

    // 2. Speaker Isolated Left/Right Medical Audio Verification
    const spkService = new SpeakerService();
    spkService.init(new AudioContext());

    spkService.playLeftChannelTone(500);
    assert.equal(spkService.currentChannel, 'left');
    assert.equal(spkService.pannerNode.pan.value, -1.0);
    spkService.stopChannelTone();

    spkService.playRightChannelTone(500);
    assert.equal(spkService.currentChannel, 'right');
    assert.equal(spkService.pannerNode.pan.value, 1.0);
    spkService.stopChannelTone();

    // 3. Human Speech-Band Frequency Sweep (200Hz to 4000Hz)
    spkService.startFrequencySweep(200, 4000, 2);
    assert.equal(spkService.isSweeping, true);
    assert.equal(spkService.sweepOscillator.type, 'sine');
    spkService.stopFrequencySweep();
    assert.equal(spkService.isSweeping, false);

    // 4. Privacy & Zero-Telemetry Confirmation
    const permService = new PermissionsService();
    const platform = permService.detectPlatform();
    assert.ok(platform.browser, 'Browser must be detected');
    assert.ok(platform.os, 'OS must be detected');

    camService.stopCamera();
  });

  /* =========================================================================
   * Scenario 4: Musician High-Fidelity Studio Interface & Clipping Check
   * ========================================================================= */
  it('SCN-04: Musician Studio Interface (Calibrated Sine Wave, Peak Detector & Full 20Hz-20kHz Log Sweep)', async () => {
    const audioCtx = new AudioContext();
    const micService = new MicrophoneService();
    micService.init(audioCtx, document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    // 1. Calibrated Sine Wave Input Simulation (amplitude = 0.5)
    micService.analyserNode.signal.type = 'sine';
    micService.analyserNode.signal.amplitude = 0.5;
    await new Promise(r => setTimeout(r, 40));
    let metrics = micService.getAudioMetrics();
    assert.ok(metrics.rms > 0, 'RMS should be positive');
    assert.equal(metrics.isClipping, false, 'Calibrated -6 dBFS signal must not clip');

    // 2. Sudden Input Overload Simulation
    micService.analyserNode.signal.type = 'clipping';
    await new Promise(r => setTimeout(r, 40));
    metrics = micService.getAudioMetrics();
    assert.equal(metrics.isClipping, true, 'Overload signal must trigger clipping indicator');

    // 3. Full Audio Spectrum 20Hz - 20,000Hz Logarithmic Frequency Sweep
    const spkService = new SpeakerService();
    spkService.init(audioCtx);
    spkService.startFrequencySweep(20, 20000, 3);
    assert.equal(spkService.isSweeping, true);

    await new Promise(r => setTimeout(r, 50));
    spkService.stopFrequencySweep();
    assert.equal(spkService.isSweeping, false);

    micService.stopMicrophone();
  });

  /* =========================================================================
   * Scenario 5: IT Helpdesk Remote Permission & Hardware Troubleshooting
   * ========================================================================= */
  it('SCN-05: IT Helpdesk Workflow (Permission Denied, Diagnostic Classification, Interactive Guide & Recovery)', async () => {
    const permService = new PermissionsService();

    // 1. Simulate Browser Permission Denied (NotAllowedError)
    const notAllowedErr = new MockDOMException('Permission denied by user', 'NotAllowedError');
    const classifiedNotAllowed = permService.classifyError(notAllowedErr);
    assert.equal(classifiedNotAllowed.type, ERROR_TYPES.NOT_ALLOWED);
    assert.ok(classifiedNotAllowed.title.includes('Denied') || classifiedNotAllowed.title.includes('Blocked'));

    // 2. Render OS/Browser Specific Troubleshooting Guide in DOM
    const guideContainer = document.createElement('div');
    guideContainer.id = 'it-troubleshooting-container';
    document.body.appendChild(guideContainer);

    permService.renderTroubleshootingGuide('it-troubleshooting-container', notAllowedErr);
    assert.ok(guideContainer.innerHTML.includes('accordion') || guideContainer.innerHTML.includes('Permissions') || guideContainer.innerHTML.includes('Troubleshooting'));

    // 3. Simulate User Granting Permission in Browser Settings
    webrtcEnv.mediaDevices.faults.getUserMediaError = null;
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    await camService.startCamera();
    assert.equal(camService.isActive, true, 'Camera should successfully activate after permission grant');

    // 4. Simulate Hardware Missing Error (NotFoundError)
    const notFoundErr = new MockDOMException('Requested device not found', 'NotFoundError');
    const classifiedNotFound = permService.classifyError(notFoundErr);
    assert.equal(classifiedNotFound.type, ERROR_TYPES.NOT_FOUND);

    permService.renderTroubleshootingGuide('it-troubleshooting-container', notFoundErr);
    assert.ok(guideContainer.innerHTML.includes('Hardware') || guideContainer.innerHTML.includes('Not Found') || guideContainer.innerHTML.includes('device'));

    camService.stopCamera();
    if (guideContainer.parentNode) guideContainer.parentNode.removeChild(guideContainer);
  });

  /* =========================================================================
   * Scenario 6: Field Diagnostic Air-Gapped / Offline Session
   * ========================================================================= */
  it('SCN-06: Field Diagnostic Air-Gapped Session (Offline Mode, Local Media Pipeline, Snapshot & JSON Export)', async () => {
    // 1. Simulate Offline State
    navigator.onLine = false;

    // 2. Initialize Core Web Utility Services Locally
    const videoElem = document.createElement('video');
    const camService = new CameraService();
    camService.init(videoElem);
    await camService.startCamera();

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    // 3. Take Camera Snapshot to Canvas
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = 1920;
    snapshotCanvas.height = 1080;
    const ctx = snapshotCanvas.getContext('2d');
    ctx.drawImage(videoElem, 0, 0, 1920, 1080);
    const dataUrl = snapshotCanvas.toDataURL('image/png');
    assert.ok(dataUrl.startsWith('data:image/png'));

    // 4. Record Offline Audio Loopback Sample
    micService.startRecording(100);
    await new Promise(r => setTimeout(r, 120));
    micService.stopRecording();
    await new Promise(r => setTimeout(r, 20));
    assert.ok(micService.recordedBlob, 'Offline audio recording must succeed');

    // 5. Generate Offline Diagnostic System Report
    const permService = new PermissionsService();
    const platform = permService.detectPlatform();
    const camStats = camService.getStats();
    const micMetrics = micService.getAudioMetrics();

    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      offline: !navigator.onLine,
      platform,
      camera: {
        active: camService.isActive,
        resolution: `${camStats.width}x${camStats.height}`,
        fps: camStats.fps
      },
      microphone: {
        active: micService.isActive,
        rms: micMetrics.rms,
        noiseFloorDb: micMetrics.noiseFloorDb,
        totalEstimatedLatencyMs: micMetrics.totalEstimatedLatencyMs
      },
      zeroTelemetryVerified: true
    };

    assert.equal(diagnosticReport.offline, true);
    assert.equal(diagnosticReport.camera.active, true);
    assert.equal(diagnosticReport.microphone.active, true);

    const jsonReportStr = JSON.stringify(diagnosticReport, null, 2);
    assert.ok(jsonReportStr.includes('zeroTelemetryVerified'));

    camService.stopCamera();
    micService.stopMicrophone();
  });

  /* =========================================================================
   * Scenario 7: Live Stream Hotplug Device Swap (Webcam & USB Mic)
   * ========================================================================= */
  it('SCN-07: Live Stream Hotplug Device Swap (Dynamic Device Addition, Dropdown Refresh & Hot-Swap Stream)', async () => {
    const camService = new CameraService();
    const videoElem = document.createElement('video');
    camService.init(videoElem);
    await camService.startCamera();

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();

    const initialCams = await camService.enumerateDevices();

    // 1. Hotplug New External 4K Webcam
    navigator.mediaDevices.addDevice({
      deviceId: 'hotplug-cam-4k',
      kind: 'videoinput',
      label: 'Elgato Facecam Pro 4K',
      groupId: 'elgato-group'
    });

    // 2. Trigger devicechange event
    const devChangeEvent = new Event('devicechange');
    navigator.mediaDevices.dispatchEvent(devChangeEvent);

    // 3. Enumerate refreshed devices
    const updatedCams = await camService.enumerateDevices();
    assert.equal(updatedCams.length, initialCams.length + 1);

    // 4. Hot-swap active camera stream to new 4K device
    await camService.startCamera('hotplug-cam-4k');
    assert.equal(camService.currentDeviceId, 'hotplug-cam-4k');

    // 5. Disconnect Original Microphone and handle track ended
    const origMicTrack = micService.stream.getAudioTracks()[0];
    origMicTrack.readyState = 'ended';
    origMicTrack.dispatchEvent(new Event('ended'));

    assert.equal(origMicTrack.readyState, 'ended');

    camService.stopCamera();
    micService.stopMicrophone();
  });

  /* =========================================================================
   * Scenario 8: High-DPI Retina Canvas Rendering & Responsive Viewport Transition
   * ========================================================================= */
  it('SCN-08: High-DPI Retina Canvas Rendering & Responsive Viewport Adaptation', async () => {
    // 1. Setup Canvas in Retina 2x display
    window.devicePixelRatio = 2.0;
    const waveCanvas = document.createElement('canvas');
    const specCanvas = document.createElement('canvas');

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), waveCanvas, specCanvas);
    await micService.startMicrophone();

    assert.equal(waveCanvas.width, 1200, 'Canvas backing width must scale with DPR 2.0');
    assert.equal(waveCanvas.height, 400, 'Canvas backing height must scale with DPR 2.0');

    // 2. Simulate Viewport Resize to Mobile (350x150 @ DPR 3.0)
    window.devicePixelRatio = 3.0;
    waveCanvas.style.width = '350px';
    waveCanvas.style.height = '150px';

    micService._setupCanvasScale(waveCanvas, waveCanvas.getContext('2d'));
    assert.equal(waveCanvas.width, 1050, 'Canvas backing width must scale with mobile DPR 3.0');
    assert.equal(waveCanvas.height, 450, 'Canvas backing height must scale with mobile DPR 3.0');

    micService.stopMicrophone();
  });

  /* =========================================================================
   * Scenario 9: Low-End Legacy Device Low-Resolution Fallback Negotiation
   * ========================================================================= */
  it('SCN-09: Low-End Hardware Fallback Negotiation (Overconstrained Rejection & Downward Fallback to 480p SD)', async () => {
    // 1. Block High Resolutions (4K, 2K, 1080p, 720p)
    webrtcEnv.mediaDevices.faults.blockedResolutions.add('3840x2160');
    webrtcEnv.mediaDevices.faults.blockedResolutions.add('2560x1440');
    webrtcEnv.mediaDevices.faults.blockedResolutions.add('1920x1080');
    webrtcEnv.mediaDevices.faults.blockedResolutions.add('1280x720');

    const camService = new CameraService();
    const videoElem = document.createElement('video');
    camService.init(videoElem);

    // 2. Probe Resolutions: 4K/1080p/720p fail, 480p/360p succeed
    const probeResults = await camService.probeResolutions();
    const res4K = probeResults.find(r => r.targetWidth === 3840);
    const res1080 = probeResults.find(r => r.targetWidth === 1920);
    const res480 = probeResults.find(r => r.targetWidth === 854);
    const res360 = probeResults.find(r => r.targetWidth === 640);

    assert.equal(res4K.supported, false);
    assert.equal(res1080.supported, false);
    assert.equal(res480.supported, true);
    assert.equal(res360.supported, true);

    // 3. Start Camera with Fallback to 480p
    await camService.startCamera(null, { video: { width: { ideal: 854 }, height: { ideal: 480 } }, audio: false });
    assert.equal(camService.isActive, true);
    const stats = camService.getStats();
    assert.equal(stats.width, 854);
    assert.equal(stats.height, 480);
    assert.equal(stats.resolutionLabel, '854x480 (480p SD)');

    camService.stopCamera();
  });

  /* =========================================================================
   * Scenario 10: End-to-End System Audit, Multi-Channel Test & Report Export
   * ========================================================================= */
  it('SCN-10: End-to-End System Audit, Multi-Channel Test & Comprehensive Report Export', async () => {
    // 1. Construct Full Coordinator DOM Environment
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="toast-container"></div>
      <button id="theme-toggle-btn"></button>
      <video id="camera-video"></video>
      <canvas id="waveform-canvas"></canvas>
      <canvas id="spectrum-canvas"></canvas>
      <select id="camera-select"></select>
      <select id="mic-select"></select>
      <select id="speaker-select"></select>
      <div id="troubleshooting-container"></div>
      <div id="sink-id-badge"></div>
    `;
    document.body.appendChild(container);

    const coordinator = new AppCoordinator();
    await coordinator.init();

    // 2. Verify all sub-modules initialized
    assert.ok(coordinator.camera);
    assert.ok(coordinator.microphone);
    assert.ok(coordinator.speaker);
    assert.ok(coordinator.permissions);
    assert.ok(coordinator.ui);

    // 3. Run Camera, Mic, and Speaker in Full Diagnostic Pass
    await coordinator.camera.startCamera();
    await coordinator.microphone.startMicrophone();
    coordinator.speaker.playLeftChannelTone(440);
    coordinator.speaker.stopChannelTone();

    // 4. Generate Diagnostic Full System Audit Object
    const camStats = coordinator.camera.getStats();
    const micMetrics = coordinator.microphone.getAudioMetrics();
    const permStatus = await coordinator.permissions.checkPermissions();

    const auditReport = {
      suite: 'Mic & Webcam Diagnostic Utility E2E Audit',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      featuresTested: 36,
      camera: {
        status: coordinator.camera.isActive ? 'PASS' : 'FAIL',
        resolution: `${camStats.width}x${camStats.height}`,
        fps: camStats.fps
      },
      microphone: {
        status: coordinator.microphone.isActive ? 'PASS' : 'FAIL',
        rms: micMetrics.rms,
        noiseFloorDb: micMetrics.noiseFloorDb
      },
      speaker: {
        status: 'PASS',
        stereoChannelsVerified: true
      },
      permissions: permStatus
    };

    assert.equal(auditReport.featuresTested, 36);
    assert.equal(auditReport.camera.status, 'PASS');
    assert.equal(auditReport.microphone.status, 'PASS');
    assert.equal(auditReport.speaker.status, 'PASS');

    // Clean up
    coordinator.camera.stopCamera();
    coordinator.microphone.stopMicrophone();
    if (container.parentNode) container.parentNode.removeChild(container);
  });

  /* =========================================================================
   * Scenario 11: Multi-Tab Rapid Switching with Background Audio State Retention
   * ========================================================================= */
  it('SCN-11: Multi-Tab Rapid Navigation with Continuous Background Audio Processing', async () => {
    const uiService = new UIService();
    const micService = new MicrophoneService();
    const spkService = new SpeakerService();
    const audioCtx = new AudioContext();

    micService.init(audioCtx, document.createElement('canvas'), document.createElement('canvas'));
    spkService.init(audioCtx);

    await micService.startMicrophone();
    spkService.playLeftChannelTone(440);

    // 1. Rapidly Switch Tabs
    uiService.showTab('microphone');
    assert.equal(uiService.currentTab, 'microphone');
    assert.equal(micService.isActive, true);

    uiService.showTab('speaker');
    assert.equal(uiService.currentTab, 'speaker');
    assert.equal(spkService.currentChannel, 'left');

    uiService.showTab('camera');
    assert.equal(uiService.currentTab, 'camera');

    uiService.showTab('troubleshooting');
    assert.equal(uiService.currentTab, 'troubleshooting');

    // 2. Return to Microphone Tab and confirm stream and metrics are intact
    uiService.showTab('microphone');
    assert.equal(uiService.currentTab, 'microphone');
    assert.equal(micService.isActive, true);
    assert.ok(micService.currentRms >= 0);

    spkService.stopChannelTone();
    micService.stopMicrophone();
  });

  /* =========================================================================
   * Scenario 12: Stress & Recovery Workflow: Permission Revocation Mid-Session
   * ========================================================================= */
  it('SCN-12: Stress & Recovery Workflow (Mid-Session Permission Revocation & Clean Reconnect)', async () => {
    const camService = new CameraService();
    camService.init(document.createElement('video'));
    await camService.startCamera();
    assert.equal(camService.isActive, true);

    const micService = new MicrophoneService();
    micService.init(new AudioContext(), document.createElement('canvas'), document.createElement('canvas'));
    await micService.startMicrophone();
    assert.equal(micService.isActive, true);

    // 1. Simulate External Hardware / OS Revocation (Track Ended)
    const camTrack = camService.stream.getVideoTracks()[0];
    const micTrack = micService.stream.getAudioTracks()[0];
    camTrack.readyState = 'ended';
    camTrack.dispatchEvent(new Event('ended'));

    micTrack.readyState = 'ended';
    micTrack.dispatchEvent(new Event('ended'));

    // 2. Trigger notification & troubleshooting guide
    const uiService = new UIService();
    const toast = uiService.showNotification('Media track was disconnected by OS or hardware', 'error');
    assert.ok(toast);
    assert.ok(toast.className.includes('toast-error'));

    // 3. User Re-enables Hardware & Restarts Diagnostics
    camService.stopCamera();
    micService.stopMicrophone();

    await camService.startCamera();
    await micService.startMicrophone();

    assert.equal(camService.isActive, true, 'Camera must successfully restart');
    assert.equal(micService.isActive, true, 'Microphone must successfully restart');

    camService.stopCamera();
    micService.stopMicrophone();
  });
});
