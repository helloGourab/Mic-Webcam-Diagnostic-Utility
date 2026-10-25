/**
 * Camera Module - Real-Time Webcam Diagnostics & Resolution Prober
 * Features:
 * - Live WebRTC video stream preview
 * - Active resolution & GCD aspect ratio detection
 * - Supported resolution prober (4K, 1080p, 720p, 480p, 360p)
 * - Real-time FPS counter via requestVideoFrameCallback / requestAnimationFrame
 * - Multi-camera enumeration and dynamic switching
 */

export const COMMON_RESOLUTIONS = [
  { name: '4K Ultra HD', width: 3840, height: 2160, label: '3840x2160 (4K UHD)' },
  { name: '2K QHD', width: 2560, height: 1440, label: '2560x1440 (1440p)' },
  { name: '1080p Full HD', width: 1920, height: 1080, label: '1920x1080 (1080p FHD)' },
  { name: '720p HD', width: 1280, height: 720, label: '1280x720 (720p HD)' },
  { name: '480p SD', width: 854, height: 480, label: '854x480 (480p SD)' },
  { name: '360p Low', width: 640, height: 360, label: '640x360 (360p)' },
  { name: '240p Min', width: 320, height: 240, label: '320x240 (240p)' }
];

/**
 * Calculates greatest common divisor (GCD) using Euclidean algorithm
 */
export function gcd(a, b) {
  if (!b) return a;
  return gcd(b, a % b);
}

/**
 * Calculates simplified aspect ratio string and human-friendly label
 */
export function calculateAspectRatio(width, height) {
  if (!width || !height || width <= 0 || height <= 0) {
    return { ratio: 'N/A', label: 'Unknown' };
  }

  const divisor = gcd(Math.round(width), Math.round(height));
  const wRatio = Math.round(width) / divisor;
  const hRatio = Math.round(height) / divisor;
  const ratioStr = `${wRatio}:${hRatio}`;

  const decimal = width / height;
  let label = `${ratioStr} (Custom)`;

  if (Math.abs(decimal - 16 / 9) < 0.04) {
    label = '16:9 (Widescreen)';
  } else if (Math.abs(decimal - 4 / 3) < 0.04) {
    label = '4:3 (Standard)';
  } else if (Math.abs(decimal - 1.0) < 0.04) {
    label = '1:1 (Square)';
  } else if (Math.abs(decimal - 21 / 9) < 0.05) {
    label = '21:9 (Ultrawide)';
  } else if (Math.abs(decimal - 9 / 16) < 0.04) {
    label = '9:16 (Portrait / Story)';
  }

  return { ratio: ratioStr, label };
}

/**
 * Formats resolution dimensions into standard marketing & display string
 */
export function formatResolutionLabel(width, height) {
  if (!width || !height) return 'N/A';
  if (width >= 3840 && height >= 2160) return `${width}x${height} (4K UHD)`;
  if (width >= 2560 && height >= 1440) return `${width}x${height} (2K QHD)`;
  if (width >= 1920 && height >= 1080) return `${width}x${height} (1080p Full HD)`;
  if (width >= 1280 && height >= 720) return `${width}x${height} (720p HD)`;
  if (width >= 854 && height >= 480) return `${width}x${height} (480p SD)`;
  return `${width}x${height}`;
}

export class CameraService {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.currentTrack = null;
    this.currentDeviceId = null;
    this.isActive = false;

    // FPS Tracker state
    this.fps = 0;
    this.smoothedFps = 0;
    this.fpsAlpha = 0.2; // Exponential Moving Average smoothing factor
    this.lastFpsTimestamp = 0;
    this.lastPresentedFrames = 0;
    this.vfcCallbackId = null;
    this.rafCallbackId = null;
    this.frameCount = 0;

    // Callbacks
    this.onStatsUpdate = null;
    this.onFpsUpdate = null;
  }

  /**
   * Initializes video element target and optional callbacks
   */
  init(videoElement, options = {}) {
    this.videoElement = videoElement;
    if (options.onStatsUpdate) this.onStatsUpdate = options.onStatsUpdate;
    if (options.onFpsUpdate) this.onFpsUpdate = options.onFpsUpdate;
    return this;
  }

  /**
   * Enumerates available video input devices
   */
  async enumerateDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
          groupId: d.groupId
        }));
    } catch (err) {
      console.warn('Failed to enumerate video devices:', err);
      return [];
    }
  }

  /**
   * Starts camera stream with requested device ID and constraints
   */
  async startCamera(deviceId = null, customConstraints = null) {
    this.stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices.getUserMedia is not supported by your browser or secure context');
    }

    const videoConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 60, max: 60 }
    };

    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
      this.currentDeviceId = deviceId;
    } else {
      videoConstraints.facingMode = 'user';
    }

    const constraints = customConstraints || {
      video: videoConstraints,
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentTrack = this.stream.getVideoTracks()[0];
      this.isActive = true;

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play().catch(e => {
          console.warn('Video play was interrupted:', e);
        });
      }

      this._startFpsTracking();
      this._emitStats();

      // Listen for track ending
      if (this.currentTrack) {
        this.currentTrack.onended = () => {
          this.stopCamera();
        };
      }

      return this.getStats();
    } catch (err) {
      this.stopCamera();
      throw err;
    }
  }

  /**
   * Stops active camera stream and cleans up resources
   */
  stopCamera() {
    this._stopFpsTracking();

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.currentTrack = null;
    this.isActive = false;
    this.fps = 0;
    this.smoothedFps = 0;

    if (this.onFpsUpdate) {
      this.onFpsUpdate(0);
    }
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats());
    }
  }

  /**
   * Dynamically changes active video track resolution constraints
   */
  async setResolution(width, height) {
    if (!this.isActive || !this.currentTrack) {
      throw new Error('Camera is not active');
    }

    const constraints = {
      width: { ideal: width },
      height: { ideal: height }
    };

    if (typeof this.currentTrack.applyConstraints === 'function') {
      try {
        await this.currentTrack.applyConstraints(constraints);
        this._emitStats();
        return this.getStats();
      } catch (err) {
        console.warn('applyConstraints failed, restarting with new constraints:', err);
      }
    }

    // Fallback: restart stream with new constraints
    return await this.startCamera(this.currentDeviceId, {
      video: {
        deviceId: this.currentDeviceId ? { exact: this.currentDeviceId } : undefined,
        width: { ideal: width },
        height: { ideal: height }
      },
      audio: false
    });
  }

  /**
   * Probes camera hardware against standard resolutions
   */
  async probeResolutions(deviceId = null, onProgress = null) {
    const targetDeviceId = deviceId || this.currentDeviceId;
    const probeResults = [];
    const total = COMMON_RESOLUTIONS.length;

    for (let i = 0; i < total; i++) {
      const res = COMMON_RESOLUTIONS[i];
      let supported = false;
      let actualWidth = 0;
      let actualHeight = 0;
      let testStream = null;

      try {
        const testConstraints = {
          video: {
            deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
            width: { exact: res.width },
            height: { exact: res.height }
          },
          audio: false
        };

        testStream = await navigator.mediaDevices.getUserMedia(testConstraints);
        const track = testStream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings ? track.getSettings() : {};
          actualWidth = settings.width || 0;
          actualHeight = settings.height || 0;

          if (actualWidth === res.width && actualHeight === res.height) {
            supported = true;
          }
        }
      } catch (err) {
        supported = false;
      } finally {
        if (testStream) {
          testStream.getTracks().forEach(t => {
            try { t.stop(); } catch (e) {}
          });
        }
      }

      const result = {
        name: res.name,
        targetWidth: res.width,
        targetHeight: res.height,
        target: `${res.width}x${res.height}`,
        actual: supported ? `${actualWidth}x${actualHeight}` : 'Not Supported',
        supported
      };

      probeResults.push(result);
      if (onProgress) {
        onProgress(result, (i + 1) / total, i + 1, total);
      }
    }

    return probeResults;
  }

  /**
   * Retrieves live diagnostic statistics for current video stream
   */
  getStats() {
    if (!this.isActive || !this.currentTrack) {
      return {
        isActive: false,
        width: 0,
        height: 0,
        aspectRatio: 'N/A',
        aspectRatioLabel: 'None',
        fps: 0,
        facingMode: 'None',
        label: 'No active camera',
        deviceId: null,
        capabilities: {}
      };
    }

    const settings = this.currentTrack.getSettings ? this.currentTrack.getSettings() : {};
    const capabilities = this.currentTrack.getCapabilities ? this.currentTrack.getCapabilities() : {};

    const width = (this.videoElement && this.videoElement.videoWidth) || settings.width || 0;
    const height = (this.videoElement && this.videoElement.videoHeight) || settings.height || 0;
    const aspect = calculateAspectRatio(width, height);

    return {
      isActive: true,
      width,
      height,
      resolutionLabel: formatResolutionLabel(width, height),
      aspectRatio: aspect.ratio,
      aspectRatioLabel: aspect.label,
      fps: this.fps,
      frameRateSetting: settings.frameRate || 'Auto',
      facingMode: settings.facingMode || 'Unspecified',
      label: this.currentTrack.label || 'Default Camera',
      deviceId: settings.deviceId || this.currentDeviceId,
      capabilities
    };
  }

  /* ---------------- Private Helper Methods ---------------- */

  _startFpsTracking() {
    this._stopFpsTracking();
    this.lastFpsTimestamp = performance.now();
    this.lastPresentedFrames = 0;
    this.frameCount = 0;

    if (this.videoElement && 'requestVideoFrameCallback' in this.videoElement) {
      this._runVfcLoop();
    } else {
      this._runRafLoop();
    }
  }

  _runVfcLoop() {
    if (!this.isActive || !this.videoElement) return;

    this.vfcCallbackId = this.videoElement.requestVideoFrameCallback((now, metadata) => {
      if (!this.isActive) return;

      if (this.lastFpsTimestamp === 0) {
        this.lastFpsTimestamp = now;
        this.lastPresentedFrames = metadata.presentedFrames;
      } else {
        const elapsed = now - this.lastFpsTimestamp;
        if (elapsed >= 500) { // Refresh every 500ms
          const framesDelta = metadata.presentedFrames - this.lastPresentedFrames;
          const instantFps = (framesDelta / elapsed) * 1000;
          
          this.smoothedFps = this.smoothedFps === 0
            ? instantFps
            : this.smoothedFps * (1 - this.fpsAlpha) + instantFps * this.fpsAlpha;

          this.fps = Math.round(this.smoothedFps * 10) / 10;

          if (this.onFpsUpdate) {
            this.onFpsUpdate(this.fps, {
              presentedFrames: metadata.presentedFrames,
              width: metadata.width,
              height: metadata.height,
              mediaTime: metadata.mediaTime
            });
          }

          this.lastFpsTimestamp = now;
          this.lastPresentedFrames = metadata.presentedFrames;
          this._emitStats();
        }
      }

      this._runVfcLoop();
    });
  }

  _runRafLoop() {
    if (!this.isActive) return;

    const rafLoop = (now) => {
      if (!this.isActive) return;

      this.frameCount++;
      const elapsed = now - this.lastFpsTimestamp;

      if (elapsed >= 500) {
        const instantFps = (this.frameCount / elapsed) * 1000;
        this.smoothedFps = this.smoothedFps === 0
          ? instantFps
          : this.smoothedFps * (1 - this.fpsAlpha) + instantFps * this.fpsAlpha;

        this.fps = Math.round(this.smoothedFps * 10) / 10;

        if (this.onFpsUpdate) {
          this.onFpsUpdate(this.fps, { fallback: true });
        }

        this.frameCount = 0;
        this.lastFpsTimestamp = now;
        this._emitStats();
      }

      this.rafCallbackId = requestAnimationFrame(rafLoop);
    };

    this.rafCallbackId = requestAnimationFrame(rafLoop);
  }

  _stopFpsTracking() {
    if (this.vfcCallbackId !== null && this.videoElement && 'cancelVideoFrameCallback' in this.videoElement) {
      try {
        this.videoElement.cancelVideoFrameCallback(this.vfcCallbackId);
      } catch (e) {}
      this.vfcCallbackId = null;
    }

    if (this.rafCallbackId !== null) {
      try {
        cancelAnimationFrame(this.rafCallbackId);
      } catch (e) {}
      this.rafCallbackId = null;
    }
  }

  _emitStats() {
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats());
    }
  }
}

// Module singleton instance matching PROJECT.md interface contract
export const CameraModule = new CameraService();
export default CameraModule;
