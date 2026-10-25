/**
 * Microphone Module - High-Precision Web Audio DSP & Loopback Diagnostic Engine
 * Features:
 * - Web Audio API (AudioContext & AnalyserNode)
 * - 32-bit floating point time-domain waveform oscilloscope (HiDPI Canvas)
 * - 64-band frequency spectrum (FFT) visualizer (HiDPI Canvas)
 * - True RMS volume meter calibrated in dBFS (-100 dBFS to 0 dBFS)
 * - Peak digital clipping indicator (|x| >= 0.99)
 * - Background ambient noise floor tracker
 * - Hardware audio pipeline latency estimator
 * - MediaRecorder interactive audio loopback recorder & playback
 */

export class MicrophoneService {
  constructor() {
    this.audioCtx = null;
    this.stream = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.isActive = false;
    this.currentDeviceId = null;

    // FFT & Analysis buffers
    this.fftSize = 2048;
    this.timeDomainBuffer = new Float32Array(this.fftSize);
    this.frequencyBuffer = new Uint8Array(this.fftSize / 2);

    // Canvas elements & contexts
    this.waveformCanvas = null;
    this.waveformCtx = null;
    this.spectrumCanvas = null;
    this.spectrumCtx = null;
    this.renderLoopId = null;

    // Real-time audio metrics
    this.currentRms = 0;
    this.currentDb = -100;
    this.peakDb = -100;
    this.peakDecayRate = 0.6; // dB decay per render frame
    this.isClipping = false;
    this.clipTimeoutId = null;
    this.noiseFloorDb = -80;
    this.noiseWindow = [];
    this.maxNoiseWindowSize = 80;

    // MediaRecorder Loopback state
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedBlob = null;
    this.recordedAudioUrl = null;
    this.playbackAudio = typeof Audio !== 'undefined' ? new Audio() : null;
    this.isRecording = false;
    this.isPlayingLoopback = false;
    this.recordingTimerId = null;

    // Callbacks
    this.onMetricsUpdate = null;
    this.onRecordingProgress = null;
    this.onRecordingComplete = null;
  }

  /**
   * Initializes audio context and canvas visualizer elements
   */
  init(audioCtx = null, waveformCanvas = null, spectrumCanvas = null, options = {}) {
    if (audioCtx) {
      this.audioCtx = audioCtx;
    }
    if (waveformCanvas) {
      this.waveformCanvas = waveformCanvas;
      this.waveformCtx = waveformCanvas.getContext('2d');
      this._setupCanvasScale(this.waveformCanvas, this.waveformCtx);
    }
    if (spectrumCanvas) {
      this.spectrumCanvas = spectrumCanvas;
      this.spectrumCtx = spectrumCanvas.getContext('2d');
      this._setupCanvasScale(this.spectrumCanvas, this.spectrumCtx);
    }

    if (options.onMetricsUpdate) this.onMetricsUpdate = options.onMetricsUpdate;
    if (options.onRecordingProgress) this.onRecordingProgress = options.onRecordingProgress;
    if (options.onRecordingComplete) this.onRecordingComplete = options.onRecordingComplete;

    const audio = this._ensurePlaybackAudio();
    if (audio) {
      audio.onended = () => {
        this.isPlayingLoopback = false;
      };
    }

    return this;
  }

  /**
   * Enumerates audio input devices
   */
  async enumerateDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
          groupId: d.groupId
        }));
    } catch (err) {
      console.warn('Failed to enumerate audio input devices:', err);
      return [];
    }
  }

  /**
   * Ensures an active, running AudioContext
   */
  _ensureAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(e => console.warn('AudioContext resume error:', e));
    }
    return this.audioCtx;
  }

  /**
   * Starts microphone capture and attaches DSP analyser node
   */
  async startMicrophone(deviceId = null, customConstraints = null) {
    this.stopMicrophone();
    this._ensureAudioContext();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices.getUserMedia is not supported');
    }

    const audioConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    };

    if (deviceId) {
      audioConstraints.deviceId = { exact: deviceId };
      this.currentDeviceId = deviceId;
    }

    const constraints = customConstraints || {
      audio: audioConstraints,
      video: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);

      // Create AnalyserNode
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = this.fftSize;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.analyserNode.minDecibels = -90;
      this.analyserNode.maxDecibels = -10;

      // Connect source to analyser only (NOT to destination, to prevent feedback)
      this.sourceNode.connect(this.analyserNode);

      this.isActive = true;
      this.noiseWindow = [];
      this._startVisualizerLoop();

      return this.getAudioMetrics();
    } catch (err) {
      this.stopMicrophone();
      throw err;
    }
  }

  /**
   * Stops microphone stream and terminates visualizer loops
   */
  stopMicrophone() {
    this._stopVisualizerLoop();

    if (this.isRecording) {
      this.stopRecording();
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch (e) {}
      this.analyserNode = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.stream = null;
    }

    this.isActive = false;
    this.currentRms = 0;
    this.currentDb = -100;
    this.peakDb = -100;
    this.isClipping = false;

    if (this.clipTimeoutId) {
      clearTimeout(this.clipTimeoutId);
      this.clipTimeoutId = null;
    }

    this._clearCanvases();

    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.getAudioMetrics());
    }
  }

  /**
   * Gets current audio pipeline latency metrics
   */
  getAudioLatency() {
    if (!this.audioCtx) {
      return {
        baseLatencyMs: 0,
        outputLatencyMs: 0,
        totalEstimatedLatencyMs: 0,
        sampleRate: '48000 Hz'
      };
    }

    const base = this.audioCtx.baseLatency || 0;
    const output = this.audioCtx.outputLatency || 0;
    const sampleRate = this.audioCtx.sampleRate || 48000;

    return {
      baseLatencyMs: Math.round(base * 1000 * 10) / 10,
      outputLatencyMs: Math.round(output * 1000 * 10) / 10,
      totalEstimatedLatencyMs: Math.round((base + output) * 1000 * 10) / 10,
      sampleRate: `${sampleRate} Hz`
    };
  }

  /**
   * Returns current audio DSP metrics snapshot
   */
  getAudioMetrics() {
    const latency = this.getAudioLatency();
    const activeTrack = this.stream ? this.stream.getAudioTracks()[0] : null;
    const settings = activeTrack && activeTrack.getSettings ? activeTrack.getSettings() : {};

    return {
      isActive: this.isActive,
      rms: this.currentRms,
      db: Math.round(this.currentDb * 10) / 10,
      peakDb: Math.round(this.peakDb * 10) / 10,
      isClipping: this.isClipping,
      noiseFloorDb: Math.round(this.noiseFloorDb * 10) / 10,
      channelCount: settings.channelCount || 1,
      sampleRate: latency.sampleRate,
      baseLatencyMs: latency.baseLatencyMs,
      outputLatencyMs: latency.outputLatencyMs,
      totalEstimatedLatencyMs: latency.totalEstimatedLatencyMs,
      label: activeTrack ? activeTrack.label : 'No active microphone',
      deviceId: settings.deviceId || this.currentDeviceId
    };
  }

  /**
   * Starts a timed audio recording for loopback testing
   */
  startRecording(durationMs = 5000, onTick = null, onComplete = null) {
    if (!this.isActive || !this.stream) {
      throw new Error('Microphone must be active to record');
    }

    this.recordedChunks = [];
    const mimeType = this._getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.isRecording = true;

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.isRecording = false;
      this.recordedBlob = new Blob(this.recordedChunks, { type: mimeType || 'audio/webm' });
      
      if (this.recordedAudioUrl) {
        URL.revokeObjectURL(this.recordedAudioUrl);
      }
      this.recordedAudioUrl = URL.createObjectURL(this.recordedBlob);
      const audio = this._ensurePlaybackAudio();
      if (audio) {
        audio.src = this.recordedAudioUrl;
      }

      if (onComplete) onComplete(this.recordedBlob, this.recordedAudioUrl);
      if (this.onRecordingComplete) this.onRecordingComplete(this.recordedBlob, this.recordedAudioUrl);
    };

    this.mediaRecorder.start(100);

    let remainingMs = durationMs;
    if (this.recordingTimerId) clearInterval(this.recordingTimerId);

    this.recordingTimerId = setInterval(() => {
      remainingMs -= 100;
      const progress = Math.max(0, remainingMs);
      if (onTick) onTick(progress, (durationMs - progress) / durationMs);
      if (this.onRecordingProgress) this.onRecordingProgress(progress, (durationMs - progress) / durationMs);

      if (remainingMs <= 0) {
        clearInterval(this.recordingTimerId);
        this.recordingTimerId = null;
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }
    }, 100);
  }

  /**
   * Stops recording early
   */
  stopRecording() {
    if (this.recordingTimerId) {
      clearInterval(this.recordingTimerId);
      this.recordingTimerId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
  }

  /**
   * Plays recorded loopback audio
   */
  playLoopback() {
    if (!this.recordedAudioUrl) {
      throw new Error('No recorded audio available to play');
    }
    const audio = this._ensurePlaybackAudio();
    if (!audio) {
      throw new Error('Audio playback is not supported in this environment');
    }
    this.isPlayingLoopback = true;
    return audio.play();
  }

  /**
   * Stops loopback playback
   */
  stopLoopback() {
    const audio = this._ensurePlaybackAudio();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.isPlayingLoopback = false;
  }

  _ensurePlaybackAudio() {
    if (!this.playbackAudio && typeof Audio !== 'undefined') {
      this.playbackAudio = new Audio();
      this.playbackAudio.onended = () => {
        this.isPlayingLoopback = false;
      };
    }
    return this.playbackAudio;
  }

  /**
   * Triggers browser download of the recorded audio loopback file
   */
  downloadRecording(filename = 'microphone-test-recording.webm') {
    if (!this.recordedAudioUrl) return;
    const a = document.createElement('a');
    a.href = this.recordedAudioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ---------------- Private Helper & Rendering Methods ---------------- */

  _startVisualizerLoop() {
    this._stopVisualizerLoop();

    let frameCount = 0;

    const render = () => {
      if (!this.isActive || !this.analyserNode) return;

      // 1. Extract audio data
      this.analyserNode.getFloatTimeDomainData(this.timeDomainBuffer);
      this.analyserNode.getByteFrequencyData(this.frequencyBuffer);

      // 2. Compute RMS & Clipping
      let sumSquares = 0;
      let clipped = false;
      const len = this.timeDomainBuffer.length;

      for (let i = 0; i < len; i++) {
        const sample = this.timeDomainBuffer[i];
        sumSquares += sample * sample;
        if (Math.abs(sample) >= 0.99) {
          clipped = true;
        }
      }

      this.currentRms = Math.sqrt(sumSquares / len);

      // Convert RMS to dBFS: 20 * log10(RMS), clamped [-100, 0]
      const clampedRms = Math.max(this.currentRms, 0.00001);
      const db = 20 * Math.log10(clampedRms);
      this.currentDb = Math.max(-100, Math.min(0, db));

      // Peak Hold Decay
      if (this.currentDb > this.peakDb) {
        this.peakDb = this.currentDb;
      } else {
        this.peakDb = Math.max(-100, this.peakDb - this.peakDecayRate);
      }

      // Clipping Alert Hold (500ms)
      if (clipped) {
        this.isClipping = true;
        if (this.clipTimeoutId) clearTimeout(this.clipTimeoutId);
        this.clipTimeoutId = setTimeout(() => {
          this.isClipping = false;
        }, 500);
      }

      // Noise Floor Tracking (10th percentile lowest dB in sliding window)
      this.noiseWindow.push(this.currentDb);
      if (this.noiseWindow.length > this.maxNoiseWindowSize) {
        this.noiseWindow.shift();
      }
      if (frameCount % 10 === 0 && this.noiseWindow.length > 5) {
        const sorted = [...this.noiseWindow].sort((a, b) => a - b);
        this.noiseFloorDb = sorted[Math.floor(sorted.length * 0.1)] || -80;
      }

      // 3. Render Canvases
      if (this.waveformCtx && this.waveformCanvas) {
        this._renderWaveform();
      }
      if (this.spectrumCtx && this.spectrumCanvas) {
        this._renderSpectrum();
      }

      // 4. Emit throttled metrics
      frameCount++;
      if (frameCount % 3 === 0 && this.onMetricsUpdate) {
        this.onMetricsUpdate(this.getAudioMetrics());
      }

      this.renderLoopId = requestAnimationFrame(render);
    };

    this.renderLoopId = requestAnimationFrame(render);
  }

  _stopVisualizerLoop() {
    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
  }

  _setupCanvasScale(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.width || 600;
    const h = rect.height || canvas.height || 180;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  _clearCanvases() {
    if (this.waveformCtx && this.waveformCanvas) {
      const rect = this.waveformCanvas.getBoundingClientRect();
      this.waveformCtx.clearRect(0, 0, rect.width, rect.height);
      this._drawGrid(this.waveformCtx, rect.width, rect.height);
    }
    if (this.spectrumCtx && this.spectrumCanvas) {
      const rect = this.spectrumCanvas.getBoundingClientRect();
      this.spectrumCtx.clearRect(0, 0, rect.width, rect.height);
      this._drawGrid(this.spectrumCtx, rect.width, rect.height);
    }
  }

  _drawGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.restore();
  }

  _renderWaveform() {
    const ctx = this.waveformCtx;
    const rect = this.waveformCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);
    this._drawGrid(ctx, width, height);

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3b82f6';
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const sliceWidth = width / this.timeDomainBuffer.length;
    let x = 0;

    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      const v = this.timeDomainBuffer[i];
      const y = (v * (height / 2) * 0.9) + (height / 2);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.restore();
  }

  _renderSpectrum() {
    const ctx = this.spectrumCtx;
    const rect = this.spectrumCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);
    this._drawGrid(ctx, width, height);

    ctx.save();
    const barCount = 64;
    const barSpacing = 2;
    const barWidth = (width - (barSpacing * (barCount - 1))) / barCount;
    const step = Math.floor(this.frequencyBuffer.length / barCount);

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(0.6, '#06b6d4');
    gradient.addColorStop(0.85, '#f59e0b');
    gradient.addColorStop(1.0, '#ef4444');

    ctx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += this.frequencyBuffer[i * step + j];
      }
      const avg = sum / step;
      const barHeight = Math.max(2, (avg / 255) * height * 0.95);
      const x = i * (barWidth + barSpacing);
      const y = height - barHeight;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  _getSupportedMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    for (const type of candidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }
}

// Module singleton instance matching PROJECT.md interface contract
export const MicrophoneModule = new MicrophoneService();
export default MicrophoneModule;
