/**
 * Speaker Module - Stereo Balance Verification & 20Hz-20kHz Frequency Sweeper
 * Features:
 * - Isolated Left-only and Right-only channel test tone synthesis (StereoPannerNode & ChannelMerger fallback)
 * - Anti-click exponential gain envelope shaping (50ms attack/release)
 * - Continuous logarithmic frequency sweep generator (20Hz - 20,000Hz)
 * - Output device selector via setSinkId API
 * - Real-time frequency progression telemetry
 */

export class SpeakerService {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.pannerNode = null;
    this.isPlayingTone = false;
    this.currentChannel = null; // 'left' | 'right' | 'both'

    // Sweep state
    this.sweepOscillator = null;
    this.sweepGain = null;
    this.isSweeping = false;
    this.sweepAnimId = null;
    this.currentFrequency = 0;
    this.sweepProgress = 0;

    // Callbacks
    this.onToneStateChange = null;
    this.onSweepProgress = null;
  }

  /**
   * Initializes audio context
   */
  init(audioCtx = null, options = {}) {
    if (audioCtx) {
      this.audioCtx = audioCtx;
    }
    if (options.onToneStateChange) this.onToneStateChange = options.onToneStateChange;
    if (options.onSweepProgress) this.onSweepProgress = options.onSweepProgress;
    return this;
  }

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
   * Enumerates available audio output devices (speakers/headphones)
   */
  async enumerateOutputDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audiooutput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker/Headphones ${i + 1}`,
          groupId: d.groupId
        }));
    } catch (err) {
      console.warn('Failed to enumerate audio output devices:', err);
      return [];
    }
  }

  /**
   * Routes audio output to specific sink ID if supported by browser
   */
  async setOutputDevice(deviceId, mediaElement = null) {
    const results = {
      audioCtxSupported: false,
      mediaElementSupported: false,
      success: false,
      error: null
    };

    // 1. AudioContext setSinkId (W3C Working Draft / Chromium)
    if (this.audioCtx && typeof this.audioCtx.setSinkId === 'function') {
      try {
        await this.audioCtx.setSinkId(deviceId);
        results.audioCtxSupported = true;
        results.success = true;
      } catch (err) {
        results.error = err.message;
      }
    }

    // 2. MediaElement setSinkId
    if (mediaElement && typeof mediaElement.setSinkId === 'function') {
      try {
        await mediaElement.setSinkId(deviceId);
        results.mediaElementSupported = true;
        results.success = true;
      } catch (err) {
        results.error = err.message;
      }
    }

    if (!results.audioCtxSupported && !results.mediaElementSupported) {
      results.error = 'setSinkId is not supported in this browser';
    }

    return results;
  }

  /**
   * Plays test tone isolated strictly to Left channel (440Hz standard)
   */
  playLeftChannelTone(frequency = 440, durationMs = 2000) {
    return this._playChannelTone('left', frequency, durationMs);
  }

  /**
   * Plays test tone isolated strictly to Right channel (440Hz standard)
   */
  playRightChannelTone(frequency = 440, durationMs = 2000) {
    return this._playChannelTone('right', frequency, durationMs);
  }

  /**
   * Plays test tone balanced across both channels
   */
  playBothChannelsTone(frequency = 440, durationMs = 2000) {
    return this._playChannelTone('both', frequency, durationMs);
  }

  /**
   * Internal tone generator with smooth 50ms attack/release and stereo panning
   */
  _playChannelTone(channel = 'both', frequency = 440, durationMs = 2000) {
    this.stopChannelTone();
    this._ensureAudioContext();

    const now = this.audioCtx.currentTime;
    const durSec = durationMs / 1000;

    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(frequency, now);

    // Anti-click envelope: 50ms smooth ramp up, hold, 50ms smooth ramp down
    this.gainNode.gain.setValueAtTime(0.0001, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.45, now + 0.05);
    this.gainNode.gain.setValueAtTime(0.45, now + durSec - 0.05);
    this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

    // Stereo routing strategy
    if (typeof this.audioCtx.createStereoPanner === 'function') {
      this.pannerNode = this.audioCtx.createStereoPanner();
      let pan = 0; // Center
      if (channel === 'left') pan = -1.0;
      if (channel === 'right') pan = 1.0;

      this.pannerNode.pan.setValueAtTime(pan, now);
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.pannerNode);
      this.pannerNode.connect(this.audioCtx.destination);
    } else {
      // Fallback: ChannelMerger explicit Left/Right output matrix routing
      const merger = this.audioCtx.createChannelMerger(2);
      this.oscillator.connect(this.gainNode);

      if (channel === 'left' || channel === 'both') {
        this.gainNode.connect(merger, 0, 0); // Output to Left channel
      }
      if (channel === 'right' || channel === 'both') {
        this.gainNode.connect(merger, 0, 1); // Output to Right channel
      }
      merger.connect(this.audioCtx.destination);
    }

    this.oscillator.start(now);
    this.oscillator.stop(now + durSec);
    this.isPlayingTone = true;
    this.currentChannel = channel;

    this._emitToneState();

    this.oscillator.onended = () => {
      this.stopChannelTone();
    };

    return { channel, frequency, durationMs };
  }

  /**
   * Stops active channel tone immediately
   */
  stopChannelTone() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {}
      this.oscillator = null;
    }

    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch (e) {}
      this.gainNode = null;
    }

    if (this.pannerNode) {
      try { this.pannerNode.disconnect(); } catch (e) {}
      this.pannerNode = null;
    }

    this.isPlayingTone = false;
    this.currentChannel = null;
    this._emitToneState();
  }

  /**
   * Starts a 20Hz - 20,000Hz continuous logarithmic frequency sweep
   */
  startFrequencySweep(startFreq = 20, endFreq = 20000, durationSeconds = 10, onProgress = null) {
    this.stopFrequencySweep();
    this.stopChannelTone();
    this._ensureAudioContext();

    const now = this.audioCtx.currentTime;
    const endTime = now + durationSeconds;

    this.sweepOscillator = this.audioCtx.createOscillator();
    this.sweepGain = this.audioCtx.createGain();

    this.sweepOscillator.type = 'sine';

    // Logarithmic pitch glide
    this.sweepOscillator.frequency.setValueAtTime(Math.max(1, startFreq), now);
    this.sweepOscillator.frequency.exponentialRampToValueAtTime(endFreq, endTime);

    // Smooth master gain
    this.sweepGain.gain.setValueAtTime(0.0001, now);
    this.sweepGain.gain.exponentialRampToValueAtTime(0.35, now + 0.1);
    this.sweepGain.gain.setValueAtTime(0.35, endTime - 0.1);
    this.sweepGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    this.sweepOscillator.connect(this.sweepGain);
    this.sweepGain.connect(this.audioCtx.destination);

    this.sweepOscillator.start(now);
    this.sweepOscillator.stop(endTime);
    this.isSweeping = true;

    const startTimePerf = performance.now();
    const totalMs = durationSeconds * 1000;

    const updateLoop = () => {
      if (!this.isSweeping) return;

      const elapsed = performance.now() - startTimePerf;
      const progress = Math.min(1.0, elapsed / totalMs);

      // Instantaneous frequency on logarithmic curve: f(t) = f0 * (f1/f0)^progress
      const currentHz = Math.round(startFreq * Math.pow(endFreq / startFreq, progress));
      this.currentFrequency = currentHz;
      this.sweepProgress = progress;

      if (onProgress) {
        onProgress(currentHz, progress);
      }
      if (this.onSweepProgress) {
        this.onSweepProgress(currentHz, progress);
      }

      if (progress < 1.0) {
        this.sweepAnimId = requestAnimationFrame(updateLoop);
      } else {
        this.stopFrequencySweep();
      }
    };

    this.sweepAnimId = requestAnimationFrame(updateLoop);

    this.sweepOscillator.onended = () => {
      this.stopFrequencySweep();
    };
  }

  /**
   * Stops active frequency sweep immediately
   */
  stopFrequencySweep() {
    this.isSweeping = false;

    if (this.sweepAnimId) {
      cancelAnimationFrame(this.sweepAnimId);
      this.sweepAnimId = null;
    }

    if (this.sweepOscillator) {
      try {
        this.sweepOscillator.stop();
        this.sweepOscillator.disconnect();
      } catch (e) {}
      this.sweepOscillator = null;
    }

    if (this.sweepGain) {
      try { this.sweepGain.disconnect(); } catch (e) {}
      this.sweepGain = null;
    }

    this.currentFrequency = 0;
    this.sweepProgress = 0;

    if (this.onSweepProgress) {
      this.onSweepProgress(0, 0);
    }
  }

  /**
   * Retrieves current status
   */
  getStatus() {
    return {
      isPlayingTone: this.isPlayingTone,
      currentChannel: this.currentChannel,
      isSweeping: this.isSweeping,
      currentFrequency: this.currentFrequency,
      sweepProgress: this.sweepProgress
    };
  }

  _emitToneState() {
    if (this.onToneStateChange) {
      this.onToneStateChange(this.getStatus());
    }
  }
}

// Module singleton instance matching PROJECT.md interface contract
export const SpeakerModule = new SpeakerService();
export default SpeakerModule;
