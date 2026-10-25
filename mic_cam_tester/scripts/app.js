/**
 * Application Bootstrap & Coordinator Module
 * Orchestrates CameraModule, MicrophoneModule, SpeakerModule, PermissionsModule, UIModule
 */

import { CameraModule } from './camera.js';
import { MicrophoneModule } from './microphone.js';
import { SpeakerModule } from './speaker.js';
import { PermissionsModule } from './permissions.js';
import { UIModule } from './ui.js';

export class AppCoordinator {
  constructor() {
    this.camera = CameraModule;
    this.microphone = MicrophoneModule;
    this.speaker = SpeakerModule;
    this.permissions = PermissionsModule;
    this.ui = UIModule;
    this.isInitialized = false;
  }

  /**
   * Initializes full application, DOM event listeners, and media interfaces
   */
  async init() {
    if (this.isInitialized) return;

    // 1. Initialize Theme
    this.ui.initTheme();

    // 2. Initialize UI Event Listeners
    this._bindUIEvents();

    // 3. Initialize Media Modules
    this._initCameraModule();
    this._initMicrophoneModule();
    this._initSpeakerModule();

    // 4. Initial Device Enumeration
    await this.refreshDevices();

    // 5. Check Initial Permissions
    this._checkInitialPermissions();

    // 6. Setup Device Hotplugging Listener
    this._setupHotplugListener();

    // 7. Render initial troubleshooting guide
    this.permissions.renderTroubleshootingGuide('troubleshooting-container');

    this.isInitialized = true;
    console.log('Mic & Cam Diagnostic Utility initialized successfully.');
  }

  /**
   * Refreshes all device select dropdowns
   */
  async refreshDevices() {
    try {
      const [cameras, mics, speakers] = await Promise.all([
        this.camera.enumerateDevices(),
        this.microphone.enumerateDevices(),
        this.speaker.enumerateOutputDevices()
      ]);

      const cameraSelect = document.getElementById('camera-select');
      const micSelect = document.getElementById('mic-select');
      const speakerSelect = document.getElementById('speaker-select');

      if (cameraSelect) this.ui.renderSelectOptions(cameraSelect, cameras);
      if (micSelect) this.ui.renderSelectOptions(micSelect, mics);
      if (speakerSelect) this.ui.renderSelectOptions(speakerSelect, speakers);

      // Check sinkId support
      const sinkBadge = document.getElementById('sink-id-badge');
      if (sinkBadge) {
        const isSinkSupported = 'setSinkId' in HTMLMediaElement.prototype || (window.AudioContext && 'setSinkId' in window.AudioContext.prototype);
        sinkBadge.textContent = isSinkSupported ? 'Output Switching Supported' : 'Default Output Only (Browser restriction)';
        sinkBadge.className = isSinkSupported ? 'badge badge-success' : 'badge badge-warning';
      }
    } catch (err) {
      console.warn('Error enumerating devices:', err);
    }
  }

  /* ---------------- Private Module Bindings ---------------- */

  _bindUIEvents() {
    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.ui.toggleTheme();
      });
    }

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.ui.showTab(tabId);
      });
    });

    this.ui.onTabChanged = (tabId) => {
      // Teardown or adjust when switching away
      if (tabId !== 'camera' && this.camera.isActive) {
        // Optional keep-alive or notification
      }
      if (tabId === 'troubleshooting') {
        this._checkInitialPermissions();
      }
    };

    // Platform Filter buttons in Troubleshooting Hub
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.getAttribute('data-filter');
        this.permissions.renderTroubleshootingGuide('troubleshooting-container', null, filter);
      });
    });

    // Teardown on page unload
    window.addEventListener('beforeunload', () => {
      this.camera.stopCamera();
      this.microphone.stopMicrophone();
      this.speaker.stopChannelTone();
      this.speaker.stopFrequencySweep();
    });
  }

  _initCameraModule() {
    const videoEl = document.getElementById('camera-video');
    const startBtn = document.getElementById('btn-start-camera');
    const stopBtn = document.getElementById('btn-stop-camera');
    const cameraSelect = document.getElementById('camera-select');
    const probeBtn = document.getElementById('btn-probe-resolutions');
    const placeholder = document.getElementById('video-placeholder');

    this.camera.init(videoEl, {
      onStatsUpdate: (stats) => this._updateCameraStatsUI(stats),
      onFpsUpdate: (fps) => {
        const fpsPill = document.getElementById('hud-fps-pill');
        if (fpsPill) fpsPill.textContent = `${fps} FPS`;
      }
    });

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        try {
          const deviceId = cameraSelect ? cameraSelect.value : null;
          startBtn.disabled = true;
          await this.camera.startCamera(deviceId);
          if (placeholder) placeholder.classList.add('hidden');
          if (stopBtn) stopBtn.disabled = false;
          if (probeBtn) probeBtn.disabled = false;
          this.ui.showNotification('Camera started successfully', 'success');
          await this.refreshDevices();
        } catch (err) {
          const classified = this.permissions.classifyError(err);
          this.ui.showNotification(`${classified.title}: ${classified.message}`, 'error', 6000);
          this.permissions.renderTroubleshootingGuide('troubleshooting-container', err);
          this.ui.showTab('troubleshooting');
        } finally {
          startBtn.disabled = false;
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.camera.stopCamera();
        if (placeholder) placeholder.classList.remove('hidden');
        stopBtn.disabled = true;
        this.ui.showNotification('Camera stopped', 'info');
      });
    }

    if (cameraSelect) {
      cameraSelect.addEventListener('change', async () => {
        if (this.camera.isActive) {
          try {
            await this.camera.startCamera(cameraSelect.value);
            this.ui.showNotification('Switched camera source', 'info');
          } catch (err) {
            this.ui.showNotification(`Failed to switch camera: ${err.message}`, 'error');
          }
        }
      });
    }

    // Direct Resolution buttons
    document.querySelectorAll('[data-res-target]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this.camera.isActive) {
          this.ui.showNotification('Start camera first to change resolution', 'warning');
          return;
        }
        const [w, h] = btn.getAttribute('data-res-target').split('x').map(Number);
        try {
          await this.camera.setResolution(w, h);
          this.ui.showNotification(`Target resolution set to ${w}x${h}`, 'success');
        } catch (err) {
          this.ui.showNotification(`Could not set resolution: ${err.message}`, 'error');
        }
      });
    });

    // Probe Resolutions
    if (probeBtn) {
      probeBtn.addEventListener('click', async () => {
        const grid = document.getElementById('probe-results-grid');
        if (!grid) return;

        probeBtn.disabled = true;
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--accent-primary); font-weight: 600;">Probing camera hardware for supported resolutions...</div>';

        const deviceId = cameraSelect ? cameraSelect.value : null;

        const results = await this.camera.probeResolutions(deviceId, (result, progressRatio, current, total) => {
          // Live probe progress
        });

        // Render probe results
        grid.innerHTML = results.map(r => `
          <div class="probe-card ${r.supported ? 'supported' : 'unsupported'}">
            <div class="probe-info">
              <span class="probe-name">${r.name}</span>
              <span class="probe-res">${r.target}</span>
            </div>
            <span class="badge ${r.supported ? 'badge-success' : 'badge-danger'}">
              ${r.supported ? 'Supported' : 'No'}
            </span>
          </div>
        `).join('');

        probeBtn.disabled = false;
        this.ui.showNotification('Resolution probing complete', 'success');
      });
    }
  }

  _updateCameraStatsUI(stats) {
    const statWidth = document.getElementById('stat-cam-width');
    const statHeight = document.getElementById('stat-cam-height');
    const statAspect = document.getElementById('stat-cam-aspect');
    const statFps = document.getElementById('stat-cam-fps');
    const statFacing = document.getElementById('stat-cam-facing');
    const hudRes = document.getElementById('hud-res-pill');
    const hudLiveDot = document.getElementById('hud-live-dot');

    if (statWidth) statWidth.textContent = stats.width ? `${stats.width}px` : '0px';
    if (statHeight) statHeight.textContent = stats.height ? `${stats.height}px` : '0px';
    if (statAspect) statAspect.textContent = stats.aspectRatioLabel || 'N/A';
    if (statFps) statFps.textContent = `${stats.fps} FPS`;
    if (statFacing) statFacing.textContent = stats.facingMode;

    if (hudRes) hudRes.textContent = stats.width ? `${stats.width}x${stats.height} (${stats.aspectRatio})` : '0x0';
    if (hudLiveDot) {
      if (stats.isActive) {
        hudLiveDot.classList.add('live');
      } else {
        hudLiveDot.classList.remove('live');
      }
    }
  }

  _initMicrophoneModule() {
    const waveCanvas = document.getElementById('canvas-waveform');
    const specCanvas = document.getElementById('canvas-spectrum');
    const startBtn = document.getElementById('btn-start-mic');
    const stopBtn = document.getElementById('btn-stop-mic');
    const micSelect = document.getElementById('mic-select');
    const recordBtn = document.getElementById('btn-record-loopback');
    const playBtn = document.getElementById('btn-play-loopback');
    const downloadBtn = document.getElementById('btn-download-loopback');
    const recordingStatus = document.getElementById('recording-status');

    this.microphone.init(null, waveCanvas, specCanvas, {
      onMetricsUpdate: (metrics) => this._updateMicrophoneMetricsUI(metrics),
      onRecordingProgress: (remainingMs, ratio) => {
        if (recordingStatus) {
          recordingStatus.textContent = `Recording... ${(remainingMs / 1000).toFixed(1)}s`;
        }
        const progFill = document.getElementById('loopback-progress-fill');
        if (progFill) progFill.style.width = `${ratio * 100}%`;
      },
      onRecordingComplete: (blob, url) => {
        if (recordingStatus) recordingStatus.textContent = 'Recording complete (Ready to play)';
        if (playBtn) playBtn.disabled = false;
        if (downloadBtn) downloadBtn.disabled = false;
        if (recordBtn) recordBtn.disabled = false;
        this.ui.showNotification('Audio recorded! Click "Play Loopback" to listen.', 'success');
      }
    });

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        try {
          const deviceId = micSelect ? micSelect.value : null;
          startBtn.disabled = true;
          await this.microphone.startMicrophone(deviceId);
          if (stopBtn) stopBtn.disabled = false;
          if (recordBtn) recordBtn.disabled = false;
          this.ui.showNotification('Microphone active', 'success');
          await this.refreshDevices();
        } catch (err) {
          const classified = this.permissions.classifyError(err);
          this.ui.showNotification(`${classified.title}: ${classified.message}`, 'error', 6000);
          this.permissions.renderTroubleshootingGuide('troubleshooting-container', err);
          this.ui.showTab('troubleshooting');
        } finally {
          startBtn.disabled = false;
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.microphone.stopMicrophone();
        stopBtn.disabled = true;
        if (recordBtn) recordBtn.disabled = true;
        this.ui.showNotification('Microphone stopped', 'info');
      });
    }

    if (micSelect) {
      micSelect.addEventListener('change', async () => {
        if (this.microphone.isActive) {
          try {
            await this.microphone.startMicrophone(micSelect.value);
            this.ui.showNotification('Switched microphone source', 'info');
          } catch (err) {
            this.ui.showNotification(`Failed to switch mic: ${err.message}`, 'error');
          }
        }
      });
    }

    // Loopback Recording
    if (recordBtn) {
      recordBtn.addEventListener('click', () => {
        try {
          recordBtn.disabled = true;
          this.microphone.startRecording(5000);
          if (playBtn) playBtn.disabled = true;
          if (downloadBtn) downloadBtn.disabled = true;
        } catch (err) {
          this.ui.showNotification(err.message, 'error');
          recordBtn.disabled = false;
        }
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        try {
          this.microphone.playLoopback();
          this.ui.showNotification('Playing loopback audio', 'info');
        } catch (err) {
          this.ui.showNotification(err.message, 'error');
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.microphone.downloadRecording();
      });
    }
  }

  _updateMicrophoneMetricsUI(metrics) {
    const dbValue = document.getElementById('meter-db-value');
    const peakValue = document.getElementById('meter-peak-value');
    const barFill = document.getElementById('meter-bar-fill');
    const peakNeedle = document.getElementById('meter-peak-needle');
    const clipBadge = document.getElementById('clipping-badge');
    const noiseBadge = document.getElementById('stat-noise-floor');
    const latencyBase = document.getElementById('stat-latency-base');
    const latencyTotal = document.getElementById('stat-latency-total');
    const sampleRate = document.getElementById('stat-sample-rate');

    if (dbValue) dbValue.textContent = `${metrics.db} dBFS`;
    if (peakValue) peakValue.textContent = `Peak: ${metrics.peakDb} dBFS`;

    // Map -100 dBFS -> 0%, 0 dBFS -> 100%
    const normalizedPercent = Math.max(0, Math.min(100, ((metrics.db + 100) / 100) * 100));
    const peakPercent = Math.max(0, Math.min(100, ((metrics.peakDb + 100) / 100) * 100));

    if (barFill) barFill.style.width = `${normalizedPercent}%`;
    if (peakNeedle) peakNeedle.style.left = `${peakPercent}%`;

    if (clipBadge) {
      if (metrics.isClipping) {
        clipBadge.classList.add('active');
        clipBadge.textContent = 'CLIPPING DETECTED';
      } else {
        clipBadge.classList.remove('active');
        clipBadge.textContent = 'NO CLIPPING';
      }
    }

    if (noiseBadge) noiseBadge.textContent = `${metrics.noiseFloorDb} dBFS`;
    if (latencyBase) latencyBase.textContent = `${metrics.baseLatencyMs} ms`;
    if (latencyTotal) latencyTotal.textContent = `${metrics.totalEstimatedLatencyMs} ms`;
    if (sampleRate) sampleRate.textContent = metrics.sampleRate;
  }

  _initSpeakerModule() {
    this.speaker.init();

    const speakerSelect = document.getElementById('speaker-select');
    const btnLeft = document.getElementById('btn-play-left');
    const btnRight = document.getElementById('btn-play-right');
    const btnBoth = document.getElementById('btn-play-both');
    const btnStopTone = document.getElementById('btn-stop-tone');
    const btnStartSweep = document.getElementById('btn-start-sweep');
    const btnStopSweep = document.getElementById('btn-stop-sweep');

    const leftBox = document.getElementById('box-speaker-left');
    const rightBox = document.getElementById('box-speaker-right');

    this.speaker.onToneStateChange = (status) => {
      if (leftBox) {
        if (status.isPlayingTone && (status.currentChannel === 'left' || status.currentChannel === 'both')) {
          leftBox.classList.add('active');
        } else {
          leftBox.classList.remove('active');
        }
      }

      if (rightBox) {
        if (status.isPlayingTone && (status.currentChannel === 'right' || status.currentChannel === 'both')) {
          rightBox.classList.add('active');
        } else {
          rightBox.classList.remove('active');
        }
      }

      if (btnStopTone) {
        btnStopTone.disabled = !status.isPlayingTone;
      }
    };

    if (btnLeft) {
      btnLeft.addEventListener('click', () => {
        this.speaker.playLeftChannelTone(440, 2000);
        this.ui.showNotification('Playing 440Hz tone on LEFT channel only', 'info');
      });
    }

    if (btnRight) {
      btnRight.addEventListener('click', () => {
        this.speaker.playRightChannelTone(440, 2000);
        this.ui.showNotification('Playing 440Hz tone on RIGHT channel only', 'info');
      });
    }

    if (btnBoth) {
      btnBoth.addEventListener('click', () => {
        this.speaker.playBothChannelsTone(440, 2000);
        this.ui.showNotification('Playing 440Hz tone on BOTH channels', 'info');
      });
    }

    if (btnStopTone) {
      btnStopTone.addEventListener('click', () => {
        this.speaker.stopChannelTone();
      });
    }

    // Sweep controls
    const sweepFreqDisplay = document.getElementById('sweep-freq-display');
    const sweepProgressBar = document.getElementById('sweep-progress-bar');

    this.speaker.onSweepProgress = (hz, progressRatio) => {
      if (sweepFreqDisplay) {
        sweepFreqDisplay.textContent = hz > 0 ? `${hz.toLocaleString()} Hz` : '20 Hz';
      }
      if (sweepProgressBar) {
        sweepProgressBar.style.width = `${progressRatio * 100}%`;
      }
      if (btnStopSweep) {
        btnStopSweep.disabled = !this.speaker.isSweeping;
      }
    };

    if (btnStartSweep) {
      btnStartSweep.addEventListener('click', () => {
        this.speaker.startFrequencySweep(20, 20000, 10);
        if (btnStopSweep) btnStopSweep.disabled = false;
        this.ui.showNotification('Running 20Hz - 20,000Hz continuous logarithmic sweep', 'info');
      });
    }

    if (btnStopSweep) {
      btnStopSweep.addEventListener('click', () => {
        this.speaker.stopFrequencySweep();
      });
    }

    if (speakerSelect) {
      speakerSelect.addEventListener('change', async () => {
        const sinkId = speakerSelect.value;
        if (sinkId) {
          const res = await this.speaker.setOutputDevice(sinkId);
          if (res.success) {
            this.ui.showNotification('Audio output device switched', 'success');
          } else {
            this.ui.showNotification(`Output switch note: ${res.error}`, 'warning');
          }
        }
      });
    }
  }

  async _checkInitialPermissions() {
    const status = await this.permissions.checkPermissions();
    const camBadge = document.getElementById('perm-status-cam');
    const micBadge = document.getElementById('perm-status-mic');

    const formatState = (state) => {
      if (state === 'granted') return { text: 'Granted', cls: 'badge-success' };
      if (state === 'denied') return { text: 'Blocked', cls: 'badge-danger' };
      if (state === 'prompt') return { text: 'Ask on Test', cls: 'badge-info' };
      return { text: 'Test to Request', cls: 'badge-info' };
    };

    if (camBadge) {
      const f = formatState(status.camera);
      camBadge.textContent = f.text;
      camBadge.className = `badge ${f.cls}`;
    }

    if (micBadge) {
      const f = formatState(status.microphone);
      micBadge.textContent = f.text;
      micBadge.className = `badge ${f.cls}`;
    }
  }

  _setupHotplugListener() {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        this.ui.showNotification('Hardware change detected (device plugged/unplugged)', 'info');
        await this.refreshDevices();
      });
    }
  }
}

// Instantiate and bootstrap
export const App = new AppCoordinator();

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
}

export default App;
