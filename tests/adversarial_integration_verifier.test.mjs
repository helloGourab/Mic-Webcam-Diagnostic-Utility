/**
 * Adversarial Systems & Integration Verification Test Suite
 * Mic & Camera Diagnostic Utility
 * 
 * Verifies:
 * 1. WebRTC Permission Error Classification Matrix (all standard & non-standard error types + guide rendering)
 * 2. Device Hotplug Dynamic Lifecycle (devicechange event handling, dropdown reactivity, device removal/addition, teardown)
 * 3. Zero-Telemetry & Offline Resilience (navigator.onLine=false, zero network requests, no 3rd-party assets)
 * 4. High-DPI Canvas Backing Store Scaling under rapid resize & varied DPR values (1x, 2x, 3x, fractional)
 * 5. Test Runner Process Isolation and Exit Code Correctness under success vs failure scenarios
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { setupDomEnvironment, MockEvent } from './mocks/dom_mock.mjs';
import { setupWebRtcMock, MockDOMException, MockOverconstrainedError } from './mocks/webrtc_mock.mjs';
import { setupWebAudioMock } from './mocks/webaudio_mock.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_APP_DIR = path.resolve(ROOT_DIR, 'mic_cam_tester');

describe('Adversarial Systems & Integration Verification Suite', () => {
  let domEnv;
  let webrtcEnv;
  let webaudioEnv;
  let PermissionsModule, ERROR_TYPES, PermissionsService;
  let CameraModule, CameraService;
  let MicrophoneModule, MicrophoneService;
  let SpeakerModule, SpeakerService;
  let UIModule, UIService;
  let AppCoordinator;

  before(async () => {
    // Read actual index.html to populate DOM
    const htmlContent = fs.readFileSync(path.join(WEB_APP_DIR, 'index.html'), 'utf-8');
    domEnv = setupDomEnvironment(htmlContent);
    webrtcEnv = setupWebRtcMock();
    webaudioEnv = setupWebAudioMock();

    // Dynamically import modules
    const permMod = await import('../mic_cam_tester/scripts/permissions.js');
    PermissionsModule = permMod.PermissionsModule;
    ERROR_TYPES = permMod.ERROR_TYPES;
    PermissionsService = permMod.PermissionsService;

    const camMod = await import('../mic_cam_tester/scripts/camera.js');
    CameraModule = camMod.CameraModule;
    CameraService = camMod.CameraService;

    const micMod = await import('../mic_cam_tester/scripts/microphone.js');
    MicrophoneModule = micMod.MicrophoneModule;
    MicrophoneService = micMod.MicrophoneService;

    const spkMod = await import('../mic_cam_tester/scripts/speaker.js');
    SpeakerModule = spkMod.SpeakerModule;
    SpeakerService = spkMod.SpeakerService;

    const uiMod = await import('../mic_cam_tester/scripts/ui.js');
    UIModule = uiMod.UIModule;
    UIService = uiMod.UIService;

    const appMod = await import('../mic_cam_tester/scripts/app.js');
    AppCoordinator = appMod.AppCoordinator;
  });

  after(() => {
    if (domEnv && domEnv.teardown) domEnv.teardown();
    if (webrtcEnv && webrtcEnv.teardown) webrtcEnv.teardown();
    if (webaudioEnv && webaudioEnv.teardown) webaudioEnv.teardown();
  });

  /* =========================================================================
   * 1. PERMISSION ERROR CLASSIFICATION MATRIX & TROUBLESHOOTING
   * ========================================================================= */
  describe('1. WebRTC Permission Error Classification Matrix', () => {
    let service;

    beforeEach(() => {
      service = new PermissionsService();
    });

    test('Matrix: NotAllowedError and legacy permission denial variants', () => {
      const variants = [
        new MockDOMException('User denied access', 'NotAllowedError'),
        new MockDOMException('Permission was denied', 'PermissionDeniedError'),
        new MockDOMException('Permission prompt dismissed', 'PermissionDismissedError'),
        { name: 'NotAllowedError', message: 'System denied' }
      ];

      for (const err of variants) {
        const classified = service.classifyError(err);
        assert.equal(classified.type, ERROR_TYPES.NOT_ALLOWED, `Failed for ${err.name}`);
        assert.equal(classified.severity, 'danger');
        assert.match(classified.title, /Permission Denied/i);
        assert.ok(classified.solution.length > 10);
        assert.ok(classified.technicalDetail.length > 0);
      }
    });

    test('Matrix: NotFoundError and hardware missing variants', () => {
      const variants = [
        new MockDOMException('Requested device not found', 'NotFoundError'),
        new MockDOMException('Hardware missing', 'DevicesNotFoundError'),
        { name: 'NotFoundError', message: 'No videoinput device' }
      ];

      for (const err of variants) {
        const classified = service.classifyError(err);
        assert.equal(classified.type, ERROR_TYPES.NOT_FOUND, `Failed for ${err.name}`);
        assert.equal(classified.severity, 'warning');
        assert.match(classified.title, /Device Not Found/i);
        assert.ok(classified.solution.length > 10);
      }
    });

    test('Matrix: NotReadableError and concurrent hardware lock (TrackStartError)', () => {
      const variants = [
        new MockDOMException('Device locked by another app', 'NotReadableError'),
        new MockDOMException('Track start error', 'TrackStartError'),
        { name: 'NotReadableError', message: 'Hardware conflict' }
      ];

      for (const err of variants) {
        const classified = service.classifyError(err);
        assert.equal(classified.type, ERROR_TYPES.NOT_READABLE, `Failed for ${err.name}`);
        assert.equal(classified.severity, 'danger');
        assert.match(classified.title, /Device Already in Use/i);
        assert.match(classified.solution, /Zoom|Teams|OBS|Discord|Meet/i);
      }
    });

    test('Matrix: OverconstrainedError and impossible resolution constraints', () => {
      const variants = [
        new MockOverconstrainedError('width', 'Constraint width not satisfied'),
        new MockDOMException('Constraints cannot be satisfied', 'ConstraintNotSatisfiedError'),
        { name: 'OverconstrainedError', message: 'Overconstrained frameRate' }
      ];

      for (const err of variants) {
        const classified = service.classifyError(err);
        assert.equal(classified.type, ERROR_TYPES.OVERCONSTRAINED, `Failed for ${err.name}`);
        assert.equal(classified.severity, 'warning');
        assert.match(classified.title, /Constraints Not Supported/i);
        assert.match(classified.solution, /lower resolution/i);
      }
    });

    test('Matrix: SecurityError, TypeError, and Insecure Origin detection', () => {
      const variants = [
        new MockDOMException('MediaDevices is only supported in secure contexts', 'SecurityError'),
        new TypeError('getUserMedia is undefined (insecure context)'),
        { name: 'SecurityError', message: 'Insecure origin' }
      ];

      for (const err of variants) {
        const classified = service.classifyError(err);
        assert.equal(classified.type, ERROR_TYPES.SECURITY, `Failed for ${err.name}`);
        assert.equal(classified.severity, 'danger');
        assert.match(classified.title, /Insecure Context/i);
        assert.match(classified.solution, /HTTPS|localhost/i);
      }
    });

    test('Matrix: AbortError on interrupted hardware handshake', () => {
      const err = new MockDOMException('Connection aborted', 'AbortError');
      const classified = service.classifyError(err);
      assert.equal(classified.type, ERROR_TYPES.ABORT);
      assert.equal(classified.severity, 'warning');
      assert.match(classified.title, /Aborted/i);
    });

    test('Matrix: Unknown custom errors, string errors, and edge-case null/undefined', () => {
      const nullClassified = service.classifyError(null);
      assert.equal(nullClassified.type, ERROR_TYPES.UNKNOWN);
      assert.equal(nullClassified.title, 'Unknown State');

      const customErr = new Error('Custom driver level crash code 0x80004005');
      customErr.name = 'DriverCrashError';
      const customClassified = service.classifyError(customErr);
      assert.equal(customClassified.type, ERROR_TYPES.UNKNOWN);
      assert.match(customClassified.title, /DriverCrashError/);
      assert.match(customClassified.technicalDetail, /0x80004005/);

      const strErr = service.classifyError('RawStringErrorMessage');
      assert.equal(strErr.type, ERROR_TYPES.UNKNOWN);
      assert.match(strErr.title, /RawStringErrorMessage/);
    });

    test('Troubleshooting Guide Rendering: Chrome, Firefox, Safari, Edge, Windows, macOS, Linux', () => {
      const container = document.createElement('div');
      container.id = 'test-guide-container';
      document.body.appendChild(container);

      // Render with an active error
      const testErr = new MockDOMException('Camera in use by Zoom', 'NotReadableError');
      service.renderTroubleshootingGuide(container, testErr);

      assert.ok(container.innerHTML.includes('permission-banner'), 'Rendered banner HTML');
      assert.ok(container.innerHTML.includes('Device Already in Use'), 'Banner title matches');
      assert.ok(container.innerHTML.includes('Zoom, Microsoft Teams, OBS Studio'), 'Banner solution matches');

      // Test platform filters
      const platforms = [
        { filter: 'chrome', browserName: 'Google Chrome / Chromium / Brave' },
        { filter: 'firefox', browserName: 'Mozilla Firefox' },
        { filter: 'safari', browserName: 'Apple Safari' },
        { filter: 'edge', browserName: 'Microsoft Edge' },
        { filter: 'windows', osName: 'Windows 11 / 10' },
        { filter: 'macos', osName: 'macOS' },
        { filter: 'linux', osName: 'Linux' }
      ];

      for (const p of platforms) {
        service.renderTroubleshootingGuide(container, null, p.filter);
        if (p.browserName) {
          assert.ok(container.innerHTML.includes(p.browserName), `Platform ${p.filter} browser guide rendered`);
        }
        if (p.osName) {
          assert.ok(container.innerHTML.includes(p.osName), `Platform ${p.filter} OS guide rendered`);
        }
        assert.ok(container.innerHTML.includes('step-list'), `Platform ${p.filter} step list rendered`);
      }

      document.body.removeChild(container);
    });
  });

  /* =========================================================================
   * 2. DEVICE HOTPLUG DYNAMIC LIFECYCLE
   * ========================================================================= */
  describe('2. Device Hotplug Dynamic Lifecycle', () => {
    let app;

    beforeEach(async () => {
      webrtcEnv.mediaDevices.resetDevices();
      app = new AppCoordinator();
      await app.init();
    });

    test('Hotplug: devicechange event listener is actively registered on mediaDevices', () => {
      const listeners = webrtcEnv.mediaDevices._listeners.get('devicechange') || [];
      assert.ok(listeners.length > 0, 'devicechange listener must be registered on mediaDevices');
    });

    test('Hotplug: dynamically plugging in a new USB 4K camera and external mic triggers UI refresh', async () => {
      const cameraSelect = document.getElementById('camera-select');
      const micSelect = document.getElementById('mic-select');

      const initialCamCount = cameraSelect.options.length;
      const initialMicCount = micSelect.options.length;

      // Add new devices
      webrtcEnv.mediaDevices.addDevice({
        deviceId: 'hotplugged-4k-cam',
        kind: 'videoinput',
        label: 'Elgato Facecam Pro 4K (Hotplugged)',
        groupId: 'usb-group-hotplug'
      });

      webrtcEnv.mediaDevices.addDevice({
        deviceId: 'hotplugged-mic-pro',
        kind: 'audioinput',
        label: 'Rode PodMic USB (Hotplugged)',
        groupId: 'usb-group-hotplug'
      });

      // Allow event loop to process async devicechange handler
      await new Promise(r => setTimeout(r, 50));

      assert.equal(cameraSelect.options.length, initialCamCount + 1, 'Camera select should contain new hotplugged camera');
      assert.equal(micSelect.options.length, initialMicCount + 1, 'Mic select should contain new hotplugged mic');

      const hasCamOption = cameraSelect.options.some(o => o.value === 'hotplugged-4k-cam');
      const hasMicOption = micSelect.options.some(o => o.value === 'hotplugged-mic-pro');
      assert.ok(hasCamOption, 'Camera select option value matches hotplugged device');
      assert.ok(hasMicOption, 'Mic select option value matches hotplugged device');
    });

    test('Hotplug: removing a device dynamically prunes select dropdowns safely', async () => {
      const cameraSelect = document.getElementById('camera-select');
      const prevCount = cameraSelect.options.length;

      // Remove a device
      webrtcEnv.mediaDevices.removeDevice('usb-cam-2');
      await new Promise(r => setTimeout(r, 50));

      assert.equal(cameraSelect.options.length, prevCount - 1, 'Camera option count should decrease after removal');
      const stillPresent = cameraSelect.options.some(o => o.value === 'usb-cam-2');
      assert.equal(stillPresent, false, 'Removed device should no longer appear in select dropdown');
    });

    test('Hotplug: beforeunload teardown closes all media streams and audio nodes', async () => {
      // Start camera & mic
      await app.camera.startCamera();
      await app.microphone.startMicrophone();
      app.speaker.playBothChannelsTone(440, 5000);

      assert.equal(app.camera.isActive, true, 'Camera active before unload');
      assert.equal(app.microphone.isActive, true, 'Microphone active before unload');
      assert.equal(app.speaker.isPlayingTone, true, 'Speaker tone playing before unload');

      // Trigger beforeunload event
      window.dispatchEvent(new MockEvent('beforeunload'));

      assert.equal(app.camera.isActive, false, 'Camera should be stopped on beforeunload');
      assert.equal(app.microphone.isActive, false, 'Microphone should be stopped on beforeunload');
      assert.equal(app.speaker.isPlayingTone, false, 'Speaker tone should be stopped on beforeunload');
    });
  });

  /* =========================================================================
   * 3. ZERO-TELEMETRY & OFFLINE RESILIENCE AUDIT
   * ========================================================================= */
  describe('3. Zero-Telemetry & Offline Resilience Audit', () => {
    test('Offline Resilience: Full application modules operate seamlessly when navigator.onLine = false', async () => {
      window.navigator.onLine = false;

      const cameraService = new CameraService();
      const videoEl = document.createElement('video');
      cameraService.init(videoEl);
      const camStats = await cameraService.startCamera();
      assert.equal(camStats.isActive, true);
      assert.ok(camStats.width > 0);
      cameraService.stopCamera();

      const micService = new MicrophoneService();
      const waveCanvas = document.createElement('canvas');
      const specCanvas = document.createElement('canvas');
      micService.init(null, waveCanvas, specCanvas);
      const micMetrics = await micService.startMicrophone();
      assert.equal(micMetrics.isActive, true);
      micService.stopMicrophone();

      const speakerService = new SpeakerService();
      speakerService.init();
      const toneRes = speakerService.playLeftChannelTone(440, 1000);
      assert.equal(toneRes.channel, 'left');
      speakerService.stopChannelTone();

      window.navigator.onLine = true; // restore
    });

    test('Static Network Audit: Zero external scripts, CDN stylesheets, fonts, or tracking pixels in index.html', () => {
      const htmlPath = path.join(WEB_APP_DIR, 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      // Check external HTTP/HTTPS resources in href/src
      const externalResourceRegex = /(src|href)=["'](https?:|\/\/)[^"']+["']/gi;
      const matches = html.match(externalResourceRegex) || [];

      // Only allow local relative resources
      assert.deepEqual(matches, [], `Found disallowed external network requests in index.html: ${JSON.stringify(matches)}`);

      // Check for common tracking/analytics patterns
      const trackingPatterns = [
        'google-analytics',
        'googletagmanager',
        'hotjar',
        'segment.io',
        'mixpanel',
        'sentry.io',
        'facebook.net',
        'clarity.ms'
      ];

      for (const pattern of trackingPatterns) {
        assert.equal(html.toLowerCase().includes(pattern), false, `Telemetry signature "${pattern}" found in index.html`);
      }
    });

    test('Static Script Audit: No fetch, XMLHttpRequest, sendBeacon, or WebSocket calls to remote telemetry servers in scripts/', () => {
      const scriptsDir = path.join(WEB_APP_DIR, 'scripts');
      const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));

      for (const file of scriptFiles) {
        const filePath = path.join(scriptsDir, file);
        const code = fs.readFileSync(filePath, 'utf-8');

        // Check for network telemetry calls
        assert.equal(/fetch\s*\(/.test(code), false, `Unauthorized fetch() call found in ${file}`);
        assert.equal(/XMLHttpRequest/.test(code), false, `Unauthorized XMLHttpRequest found in ${file}`);
        assert.equal(/sendBeacon/.test(code), false, `Unauthorized sendBeacon found in ${file}`);
        assert.equal(/WebSocket/.test(code), false, `Unauthorized WebSocket found in ${file}`);
        assert.equal(/EventSource/.test(code), false, `Unauthorized EventSource found in ${file}`);
      }
    });
  });

  /* =========================================================================
   * 4. HIGH-DPI CANVAS BACKING STORE SCALING & RESIZE STRESS
   * ========================================================================= */
  describe('4. High-DPI Canvas Backing Store Scaling & Resize Stress', () => {
    test('HiDPI Scaling: Backing store resolution accurately matches window.devicePixelRatio (1x, 2x, 3x, 3.5x)', () => {
      const dprValues = [1.0, 2.0, 3.0, 3.5, 0.75];
      const micService = new MicrophoneService();

      for (const dpr of dprValues) {
        window.devicePixelRatio = dpr;

        const canvas = document.createElement('canvas');
        canvas.style.width = '640px';
        canvas.style.height = '240px';

        const ctx = canvas.getContext('2d');
        micService._setupCanvasScale(canvas, ctx);

        assert.equal(canvas.width, 640 * dpr, `Canvas pixel width should equal CSS width * DPR for DPR=${dpr}`);
        assert.equal(canvas.height, 240 * dpr, `Canvas pixel height should equal CSS height * DPR for DPR=${dpr}`);
        assert.equal(canvas.style.width, '640px', 'Canvas CSS width must remain unchanged in layout');
        assert.equal(canvas.style.height, '240px', 'Canvas CSS height must remain unchanged in layout');

        // Check that scale was invoked on context
        const scaleCalls = ctx.calls.filter(c => c.method === 'scale');
        assert.ok(scaleCalls.length > 0, `scale() should be called on context for DPR=${dpr}`);
        const lastScale = scaleCalls[scaleCalls.length - 1];
        assert.deepEqual(lastScale.args, [dpr, dpr]);
      }

      window.devicePixelRatio = 1.0; // reset
    });

    test('Resize Stress: Rapid consecutive viewport resize cycles preserve canvas integrity without distortion', () => {
      const micService = new MicrophoneService();
      const waveCanvas = document.createElement('canvas');
      const specCanvas = document.createElement('canvas');
      micService.init(null, waveCanvas, specCanvas);

      const dimensions = [
        { w: 320, h: 100, dpr: 1 },
        { w: 480, h: 150, dpr: 2 },
        { w: 768, h: 200, dpr: 2 },
        { w: 1024, h: 250, dpr: 3 },
        { w: 1920, h: 400, dpr: 2 },
        { w: 2560, h: 500, dpr: 3.5 }
      ];

      for (const dim of dimensions) {
        window.devicePixelRatio = dim.dpr;
        waveCanvas.style.width = `${dim.w}px`;
        waveCanvas.style.height = `${dim.h}px`;
        specCanvas.style.width = `${dim.w}px`;
        specCanvas.style.height = `${dim.h}px`;

        micService._setupCanvasScale(waveCanvas, micService.waveformCtx);
        micService._setupCanvasScale(specCanvas, micService.spectrumCtx);

        micService._renderWaveform();
        micService._renderSpectrum();

        assert.equal(waveCanvas.width, dim.w * dim.dpr);
        assert.equal(waveCanvas.height, dim.h * dim.dpr);
        assert.equal(specCanvas.width, dim.w * dim.dpr);
        assert.equal(specCanvas.height, dim.h * dim.dpr);
      }

      window.devicePixelRatio = 1.0;
    });
  });

  /* =========================================================================
   * 5. TEST RUNNER PROCESS ISOLATION & EXIT CODE CORRECTNESS
   * ========================================================================= */
  describe('5. Test Runner Process Isolation & Exit Codes', () => {
    test('Process Isolation: Master runner configuration verifies isolated child process execution', () => {
      const runnerCode = fs.readFileSync(path.join(ROOT_DIR, 'tests/e2e_runner.mjs'), 'utf-8');

      // Verify spawn child_process is used
      assert.ok(runnerCode.includes('spawn('), 'Runner must spawn isolated child processes');
      assert.ok(runnerCode.includes('process.execPath'), 'Runner must invoke node executable');
      assert.ok(runnerCode.includes('--test'), 'Runner must invoke native node:test flag');
      assert.ok(runnerCode.includes('TOTAL_MIN_REQUIRED = 405') || runnerCode.includes('405'), 'Runner enforces >= 405 total tests');
    });

    test('Exit Code Verification: Isolated subprocess runner correctly captures exit codes on pass and fail', () => {
      // 1. Run a lightweight native test to verify clean exit code 0
      const passResult = spawnSync(process.execPath, ['--test', path.join(ROOT_DIR, 'tests/tier4_scenarios.test.mjs')], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        env: { PATH: process.env.PATH, HOME: process.env.HOME }
      });
      assert.equal(passResult.status, 0, `Isolated tier execution should exit with code 0. Stderr: ${passResult.stderr}`);

      // 2. Run a synthetic failing test script in isolated child process to verify exit code 1
      const failResult = spawnSync(process.execPath, ['-e', 'import assert from "node:assert"; assert.strictEqual(1, 2);'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8'
      });
      assert.equal(failResult.status, 1, 'Child process with failed assertion must return exit code 1');
    });
  });
});
