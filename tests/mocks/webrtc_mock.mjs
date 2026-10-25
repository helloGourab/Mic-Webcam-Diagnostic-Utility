/**
 * Comprehensive WebRTC, MediaDevices, and Permissions API Mock
 * Zero-dependency test harness for Node.js 22
 */

import { MockEventTarget, MockEvent } from './dom_mock.mjs';

export class MockDOMException extends Error {
  constructor(message, name = 'Error') {
    super(message);
    this.name = name;
  }
}

export class MockOverconstrainedError extends MockDOMException {
  constructor(constraint, message = `Constraint ${constraint} not satisfied`) {
    super(message, 'OverconstrainedError');
    this.constraint = constraint;
  }
}

export class MockMediaStreamTrack extends MockEventTarget {
  constructor(kind = 'video', options = {}) {
    super();
    this.kind = kind; // 'video' | 'audio'
    this.id = options.id || `track-${kind}-${Math.random().toString(36).substring(2, 9)}`;
    this.label = options.label || (kind === 'video' ? 'Mock HD Webcam' : 'Mock Studio Microphone');
    this.enabled = true;
    this.muted = false;
    this.readyState = 'live'; // 'live' | 'ended'

    if (kind === 'video') {
      this._settings = {
        deviceId: options.deviceId || 'mock-video-dev-0',
        groupId: options.groupId || 'mock-group-0',
        width: options.width || 1920,
        height: options.height || 1080,
        frameRate: options.frameRate || 30,
        facingMode: options.facingMode || 'user',
        aspectRatio: (options.width || 1920) / (options.height || 1080)
      };
      this._capabilities = {
        deviceId: options.deviceId || 'mock-video-dev-0',
        groupId: options.groupId || 'mock-group-0',
        width: { min: 320, max: 3840 },
        height: { min: 240, max: 2160 },
        frameRate: { min: 1, max: 60 },
        facingMode: ['user', 'environment'],
        zoom: { min: 1, max: 5, step: 0.1 },
        torch: true,
        whiteBalanceMode: ['continuous', 'manual'],
        exposureMode: ['continuous', 'manual']
      };
    } else {
      this._settings = {
        deviceId: options.deviceId || 'mock-audio-dev-0',
        groupId: options.groupId || 'mock-group-0',
        sampleRate: options.sampleRate || 48000,
        sampleSize: 16,
        channelCount: options.channelCount || 2,
        latency: 0.005,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true
      };
      this._capabilities = {
        deviceId: options.deviceId || 'mock-audio-dev-0',
        groupId: options.groupId || 'mock-group-0',
        sampleRate: { min: 8000, max: 96000 },
        sampleSize: { min: 16, max: 24 },
        channelCount: { min: 1, max: 2 },
        latency: { min: 0.002, max: 0.05 },
        echoCancellation: [true, false],
        autoGainControl: [true, false],
        noiseSuppression: [true, false]
      };
    }
  }

  getSettings() {
    return { ...this._settings };
  }

  getCapabilities() {
    return { ...this._capabilities };
  }

  async applyConstraints(constraints = {}) {
    if (this.readyState === 'ended') {
      throw new MockDOMException('Track is ended', 'InvalidStateError');
    }

    if (this.kind === 'video') {
      if (constraints.width) {
        const w = typeof constraints.width === 'object' 
          ? (constraints.width.exact || constraints.width.ideal) 
          : constraints.width;
        if (w && (w < this._capabilities.width.min || w > this._capabilities.width.max)) {
          throw new MockOverconstrainedError('width');
        }
        if (w) this._settings.width = w;
      }

      if (constraints.height) {
        const h = typeof constraints.height === 'object' 
          ? (constraints.height.exact || constraints.height.ideal) 
          : constraints.height;
        if (h && (h < this._capabilities.height.min || h > this._capabilities.height.max)) {
          throw new MockOverconstrainedError('height');
        }
        if (h) this._settings.height = h;
      }

      if (constraints.frameRate) {
        const fps = typeof constraints.frameRate === 'object'
          ? (constraints.frameRate.exact || constraints.frameRate.ideal)
          : constraints.frameRate;
        if (fps && (fps < this._capabilities.frameRate.min || fps > this._capabilities.frameRate.max)) {
          throw new MockOverconstrainedError('frameRate');
        }
        if (fps) this._settings.frameRate = fps;
      }

      if (constraints.facingMode) {
        const fm = typeof constraints.facingMode === 'object'
          ? (constraints.facingMode.exact || constraints.facingMode.ideal)
          : constraints.facingMode;
        if (fm) this._settings.facingMode = fm;
      }

      if (constraints.advanced && Array.isArray(constraints.advanced)) {
        for (const adv of constraints.advanced) {
          if (adv.zoom !== undefined) this._settings.zoom = adv.zoom;
          if (adv.torch !== undefined) this._settings.torch = adv.torch;
        }
      }
    }

    return Promise.resolve();
  }

  stop() {
    if (this.readyState !== 'ended') {
      this.readyState = 'ended';
      this.dispatchEvent(new MockEvent('ended'));
    }
  }

  clone() {
    const cloned = new MockMediaStreamTrack(this.kind, {
      id: `${this.id}-clone`,
      label: this.label,
      ...this._settings
    });
    return cloned;
  }
}

export class MockMediaStream extends MockEventTarget {
  constructor(tracks = []) {
    super();
    this.id = `stream-${Math.random().toString(36).substring(2, 9)}`;
    this._tracks = [];
    if (Array.isArray(tracks)) {
      tracks.forEach(t => this.addTrack(t));
    } else if (tracks instanceof MockMediaStream) {
      tracks.getTracks().forEach(t => this.addTrack(t.clone()));
    }
  }

  get active() {
    return this._tracks.some(t => t.readyState === 'live');
  }

  getTracks() {
    return [...this._tracks];
  }

  getVideoTracks() {
    return this._tracks.filter(t => t.kind === 'video');
  }

  getAudioTracks() {
    return this._tracks.filter(t => t.kind === 'audio');
  }

  getTrackById(id) {
    return this._tracks.find(t => t.id === id) || null;
  }

  addTrack(track) {
    if (track && !this._tracks.includes(track)) {
      this._tracks.push(track);
      const ev = new MockEvent('addtrack');
      ev.track = track;
      this.dispatchEvent(ev);
    }
  }

  removeTrack(track) {
    const idx = this._tracks.indexOf(track);
    if (idx !== -1) {
      this._tracks.splice(idx, 1);
      const ev = new MockEvent('removetrack');
      ev.track = track;
      this.dispatchEvent(ev);
    }
  }

  clone() {
    return new MockMediaStream(this._tracks.map(t => t.clone()));
  }
}

export class MockPermissionStatus extends MockEventTarget {
  constructor(name, state = 'granted') {
    super();
    this.name = name;
    this.state = state; // 'granted' | 'prompt' | 'denied'
    this.onchange = null;
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      const ev = new MockEvent('change');
      this.dispatchEvent(ev);
    }
  }
}

export class MockPermissions {
  constructor() {
    this._statusMap = new Map([
      ['camera', new MockPermissionStatus('camera', 'granted')],
      ['microphone', new MockPermissionStatus('microphone', 'granted')]
    ]);
  }

  async query({ name }) {
    if (!name || (name !== 'camera' && name !== 'microphone')) {
      throw new TypeError(`Failed to execute 'query' on 'Permissions': The provided value '${name}' is not a valid PermissionName.`);
    }
    return this._statusMap.get(name);
  }

  setPermission(name, state) {
    if (this._statusMap.has(name)) {
      this._statusMap.get(name).setState(state);
    } else {
      this._statusMap.set(name, new MockPermissionStatus(name, state));
    }
  }
}

export class MockMediaDevices extends MockEventTarget {
  constructor() {
    super();
    this.ondevicechange = null;
    this._permissions = new MockPermissions();

    this._devices = [
      {
        deviceId: 'default-cam-1',
        kind: 'videoinput',
        label: 'FaceTime HD Camera (Built-in)',
        groupId: 'built-in-group'
      },
      {
        deviceId: 'usb-cam-2',
        kind: 'videoinput',
        label: 'Logitech Brio 4K Pro Webcam',
        groupId: 'usb-group-1'
      },
      {
        deviceId: 'default-mic-1',
        kind: 'audioinput',
        label: 'MacBook Pro Microphone (Built-in)',
        groupId: 'built-in-group'
      },
      {
        deviceId: 'usb-mic-2',
        kind: 'audioinput',
        label: 'Shure MV7+ USB Podcast Microphone',
        groupId: 'usb-group-2'
      },
      {
        deviceId: 'default-speaker-1',
        kind: 'audiooutput',
        label: 'MacBook Pro Speakers (Built-in)',
        groupId: 'built-in-group'
      },
      {
        deviceId: 'headphones-2',
        kind: 'audiooutput',
        label: 'Sony WH-1000XM5 Stereo Headphones',
        groupId: 'bluetooth-group'
      }
    ];

    // Fault injection hooks
    this.faults = {
      getUserMediaError: null, // Error instance to throw
      emptyDevices: false,
      blockedResolutions: new Set()
    };
  }

  async getUserMedia(constraints = {}) {
    if (this.faults.getUserMediaError) {
      const err = this.faults.getUserMediaError;
      if (typeof err === 'string') {
        throw new MockDOMException(`Simulated error: ${err}`, err);
      }
      throw err;
    }

    const videoReq = constraints.video;
    const audioReq = constraints.audio;

    if (!videoReq && !audioReq) {
      throw new TypeError('At least one of video and audio must be requested');
    }

    const tracks = [];

    if (videoReq) {
      // Check camera permission
      const camPerm = await this._permissions.query({ name: 'camera' });
      if (camPerm.state === 'denied') {
        throw new MockDOMException('Permission denied by user', 'NotAllowedError');
      }

      const videoDevs = this._devices.filter(d => d.kind === 'videoinput');
      if (videoDevs.length === 0 || this.faults.emptyDevices) {
        throw new MockDOMException('No camera devices found', 'NotFoundError');
      }

      let deviceId = videoDevs[0].deviceId;
      let label = videoDevs[0].label;
      let targetWidth = 1920;
      let targetHeight = 1080;
      let targetFps = 30;

      if (typeof videoReq === 'object') {
        if (videoReq.deviceId) {
          const reqId = typeof videoReq.deviceId === 'object' ? videoReq.deviceId.exact : videoReq.deviceId;
          const found = videoDevs.find(d => d.deviceId === reqId);
          if (found) {
            deviceId = found.deviceId;
            label = found.label;
          } else if (videoReq.deviceId.exact) {
            throw new MockOverconstrainedError('deviceId');
          }
        }

        if (videoReq.width) {
          const w = typeof videoReq.width === 'object' ? (videoReq.width.exact || videoReq.width.ideal) : videoReq.width;
          if (w) targetWidth = w;
          if (videoReq.width.exact && this.faults.blockedResolutions.has(`${targetWidth}x${videoReq.height?.exact || targetHeight}`)) {
            throw new MockOverconstrainedError('width');
          }
        }

        if (videoReq.height) {
          const h = typeof videoReq.height === 'object' ? (videoReq.height.exact || videoReq.height.ideal) : videoReq.height;
          if (h) targetHeight = h;
        }

        if (videoReq.frameRate) {
          const fps = typeof videoReq.frameRate === 'object' ? (videoReq.frameRate.exact || videoReq.frameRate.ideal) : videoReq.frameRate;
          if (fps) targetFps = fps;
        }
      }

      const vTrack = new MockMediaStreamTrack('video', {
        deviceId,
        label,
        width: targetWidth,
        height: targetHeight,
        frameRate: targetFps
      });
      tracks.push(vTrack);
    }

    if (audioReq) {
      // Check mic permission
      const micPerm = await this._permissions.query({ name: 'microphone' });
      if (micPerm.state === 'denied') {
        throw new MockDOMException('Permission denied by user', 'NotAllowedError');
      }

      const audioDevs = this._devices.filter(d => d.kind === 'audioinput');
      if (audioDevs.length === 0 || this.faults.emptyDevices) {
        throw new MockDOMException('No microphone devices found', 'NotFoundError');
      }

      let deviceId = audioDevs[0].deviceId;
      let label = audioDevs[0].label;

      if (typeof audioReq === 'object' && audioReq.deviceId) {
        const reqId = typeof audioReq.deviceId === 'object' ? audioReq.deviceId.exact : audioReq.deviceId;
        const found = audioDevs.find(d => d.deviceId === reqId);
        if (found) {
          deviceId = found.deviceId;
          label = found.label;
        } else if (audioReq.deviceId.exact) {
          throw new MockOverconstrainedError('deviceId');
        }
      }

      const aTrack = new MockMediaStreamTrack('audio', {
        deviceId,
        label
      });
      tracks.push(aTrack);
    }

    return new MockMediaStream(tracks);
  }

  async enumerateDevices() {
    if (this.faults.emptyDevices) return [];
    return this._devices.map(d => ({
      deviceId: d.deviceId,
      kind: d.kind,
      label: d.label,
      groupId: d.groupId,
      toJSON: () => ({ ...d })
    }));
  }

  dispatchDeviceChange(newDevices = null) {
    if (newDevices) {
      this._devices = newDevices;
    }
    const ev = new MockEvent('devicechange');
    this.dispatchEvent(ev);
  }

  setDevices(devices) {
    this._devices = [...devices];
  }

  resetDevices() {
    this._devices = [
      {
        deviceId: 'default-cam-1',
        kind: 'videoinput',
        label: 'FaceTime HD Camera (Built-in)',
        groupId: 'built-in-group'
      },
      {
        deviceId: 'usb-cam-2',
        kind: 'videoinput',
        label: 'Logitech Brio 4K Pro Webcam',
        groupId: 'usb-group-1'
      },
      {
        deviceId: 'default-mic-1',
        kind: 'audioinput',
        label: 'MacBook Pro Microphone (Built-in)',
        groupId: 'built-in-group'
      },
      {
        deviceId: 'usb-mic-2',
        kind: 'audioinput',
        label: 'Shure MV7+ USB Podcast Microphone',
        groupId: 'usb-group-2'
      },
      {
        deviceId: 'default-speaker-1',
        kind: 'audiooutput',
        label: 'MacBook Pro Speakers (Built-in)',
        groupId: 'built-in-group'
      },
      {
        deviceId: 'headphones-2',
        kind: 'audiooutput',
        label: 'Sony WH-1000XM5 Stereo Headphones',
        groupId: 'bluetooth-group'
      }
    ];
  }

  addDevice(device) {
    this._devices.push(device);
    this.dispatchDeviceChange();
  }

  removeDevice(deviceId) {
    this._devices = this._devices.filter(d => d.deviceId !== deviceId);
    this.dispatchDeviceChange();
  }
}

/**
 * Setup WebRTC & MediaDevices mocks on window / navigator
 */
export function setupWebRtcMock() {
  const mediaDevices = new MockMediaDevices();
  const permissions = mediaDevices._permissions;

  if (globalThis.navigator) {
    globalThis.navigator.mediaDevices = mediaDevices;
    globalThis.navigator.permissions = permissions;
  }
  if (globalThis.window) {
    globalThis.window.MediaStream = MockMediaStream;
    globalThis.window.MediaStreamTrack = MockMediaStreamTrack;
  }

  globalThis.MediaStream = MockMediaStream;
  globalThis.MediaStreamTrack = MockMediaStreamTrack;
  globalThis.DOMException = MockDOMException;
  globalThis.OverconstrainedError = MockOverconstrainedError;

  return {
    mediaDevices,
    permissions,
    teardown: () => {
      // cleanup
    }
  };
}
