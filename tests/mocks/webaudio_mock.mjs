/**
 * Comprehensive Web Audio API and MediaRecorder Mock
 * Zero-dependency test harness for Node.js 22
 */

import { MockEventTarget, MockEvent } from './dom_mock.mjs';

export class MockAudioParam {
  constructor(defaultValue = 1.0, minValue = -3.4028235e38, maxValue = 3.4028235e38) {
    this._value = defaultValue;
    this.defaultValue = defaultValue;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.events = [];
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this._value = Math.max(this.minValue, Math.min(this.maxValue, Number(v)));
  }

  setValueAtTime(value, time) {
    this.value = value;
    this.events.push({ type: 'setValueAtTime', value, time });
    return this;
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push({ type: 'linearRampToValueAtTime', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push({ type: 'exponentialRampToValueAtTime', value, time });
    return this;
  }

  setTargetAtTime(target, startTime, timeConstant) {
    this.value = target;
    this.events.push({ type: 'setTargetAtTime', target, startTime, timeConstant });
    return this;
  }

  setValueCurveAtTime(values, startTime, duration) {
    if (values && values.length > 0) {
      this.value = values[values.length - 1];
    }
    this.events.push({ type: 'setValueCurveAtTime', values, startTime, duration });
    return this;
  }

  cancelScheduledValues(startTime) {
    this.events = this.events.filter(e => e.time < startTime);
    return this;
  }
}

export class MockAudioNode extends MockEventTarget {
  constructor(context, numberOfInputs = 1, numberOfOutputs = 1) {
    super();
    this.context = context;
    this.numberOfInputs = numberOfInputs;
    this.numberOfOutputs = numberOfOutputs;
    this.channelCount = 2;
    this.channelCountMode = 'max';
    this.channelInterpretation = 'speakers';
    this._connections = [];
  }

  connect(destination, outputIndex = 0, inputIndex = 0) {
    this._connections.push({ destination, outputIndex, inputIndex });
    return destination;
  }

  disconnect(destination, outputIndex, inputIndex) {
    if (!destination) {
      this._connections = [];
    } else {
      this._connections = this._connections.filter(c => c.destination !== destination);
    }
  }
}

export class MockAnalyserNode extends MockAudioNode {
  constructor(context) {
    super(context, 1, 1);
    this._fftSize = 2048;
    this.minDecibels = -90;
    this.maxDecibels = -10;
    this.smoothingTimeConstant = 0.8;
    
    // Injectable test audio signal
    this.signal = {
      type: 'sine', // 'sine' | 'silence' | 'clipping' | 'noise' | 'custom'
      frequency: 440,
      amplitude: 0.5,
      noiseFloor: 0.001,
      customTimeData: null
    };
  }

  get fftSize() {
    return this._fftSize;
  }

  set fftSize(size) {
    const validSizes = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
    if (!validSizes.includes(size)) {
      throw new DOMException(`IndexSizeError: fftSize ${size} is not a valid power of 2 between 32 and 32768`);
    }
    this._fftSize = size;
  }

  get frequencyBinCount() {
    return this._fftSize / 2;
  }

  getFloatTimeDomainData(array) {
    const len = array.length;
    if (this.signal.customTimeData) {
      for (let i = 0; i < len; i++) {
        array[i] = this.signal.customTimeData[i % this.signal.customTimeData.length];
      }
      return;
    }

    if (this.signal.type === 'silence') {
      array.fill(0);
      return;
    }

    if (this.signal.type === 'clipping') {
      for (let i = 0; i < len; i++) {
        array[i] = Math.sin(2 * Math.PI * (this.signal.frequency || 440) * (i / 48000)) >= 0 ? 1.0 : -1.0;
      }
      return;
    }

    if (this.signal.type === 'noise') {
      const amp = this.signal.amplitude || 0.1;
      for (let i = 0; i < len; i++) {
        array[i] = (Math.random() * 2 - 1) * amp;
      }
      return;
    }

    // Default: sine wave with optional baseline noise floor
    const freq = this.signal.frequency || 440;
    const amp = this.signal.amplitude !== undefined ? this.signal.amplitude : 0.5;
    const noise = this.signal.noiseFloor || 0.0001;

    for (let i = 0; i < len; i++) {
      const s = Math.sin(2 * Math.PI * freq * (i / 48000)) * amp;
      const n = (Math.random() * 2 - 1) * noise;
      array[i] = Math.max(-1.0, Math.min(1.0, s + n));
    }
  }

  getByteTimeDomainData(array) {
    const floatArr = new Float32Array(array.length);
    this.getFloatTimeDomainData(floatArr);
    for (let i = 0; i < array.length; i++) {
      // Map [-1.0, 1.0] -> [0, 255]
      array[i] = Math.round(((floatArr[i] + 1.0) / 2.0) * 255);
    }
  }

  getByteFrequencyData(array) {
    const len = array.length;
    if (this.signal.type === 'silence') {
      array.fill(0);
      return;
    }

    // Calculate bin corresponding to signal frequency
    const sampleRate = this.context.sampleRate || 48000;
    const binSize = (sampleRate / 2) / len;
    const targetBin = Math.min(len - 1, Math.max(0, Math.floor((this.signal.frequency || 440) / binSize)));
    const amp = this.signal.amplitude !== undefined ? this.signal.amplitude : 0.5;

    for (let i = 0; i < len; i++) {
      if (this.signal.type === 'noise') {
        array[i] = Math.floor(Math.random() * 128 * amp);
      } else if (i === targetBin) {
        array[i] = Math.min(255, Math.floor(255 * amp));
      } else {
        const dist = Math.abs(i - targetBin);
        const falloff = Math.max(0, 1 - dist * 0.2);
        array[i] = Math.floor(255 * amp * falloff * 0.8);
      }
    }
  }

  getFloatFrequencyData(array) {
    const byteArr = new Uint8Array(array.length);
    this.getByteFrequencyData(byteArr);
    for (let i = 0; i < array.length; i++) {
      // Map [0, 255] -> [minDecibels, maxDecibels]
      const fraction = byteArr[i] / 255;
      array[i] = this.minDecibels + fraction * (this.maxDecibels - this.minDecibels);
    }
  }
}

export class MockStereoPannerNode extends MockAudioNode {
  constructor(context) {
    super(context, 1, 1);
    this.pan = new MockAudioParam(0, -1.0, 1.0);
  }
}

export class MockGainNode extends MockAudioNode {
  constructor(context) {
    super(context, 1, 1);
    this.gain = new MockAudioParam(1.0, -3.4e38, 3.4e38);
  }
}

export class MockOscillatorNode extends MockAudioNode {
  constructor(context) {
    super(context, 0, 1);
    this.type = 'sine';
    this.frequency = new MockAudioParam(440, - context.sampleRate / 2, context.sampleRate / 2);
    this.detune = new MockAudioParam(0, -153600, 153600);
    this._started = false;
    this._stopped = false;
    this.onended = null;
    this._stopTimer = null;
  }

  start(when = 0) {
    if (this._started) throw new DOMException('InvalidStateError: Oscillator already started');
    this._started = true;
  }

  stop(when = 0) {
    if (!this._started) throw new DOMException('InvalidStateError: Oscillator cannot be stopped before starting');
    if (this._stopped) throw new DOMException('InvalidStateError: Oscillator already stopped');
    this._stopped = true;
    
    // Trigger onended asynchronously or at scheduled time
    const delay = Math.max(0, (when - this.context.currentTime) * 1000);
    this._stopTimer = setTimeout(() => {
      const ev = new MockEvent('ended');
      this.dispatchEvent(ev);
    }, delay > 0 ? delay : 10);
  }
}

export class MockChannelSplitterNode extends MockAudioNode {
  constructor(context, numberOfOutputs = 2) {
    super(context, 1, numberOfOutputs);
  }
}

export class MockChannelMergerNode extends MockAudioNode {
  constructor(context, numberOfInputs = 2) {
    super(context, numberOfInputs, 1);
  }
}

export class MockMediaStreamAudioSourceNode extends MockAudioNode {
  constructor(context, options = {}) {
    super(context, 0, 1);
    this.mediaStream = options.mediaStream || null;
  }
}

export class MockAudioDestinationNode extends MockAudioNode {
  constructor(context) {
    super(context, 1, 0);
    this.maxChannelCount = 2;
  }
}

export class MockAudioBuffer {
  constructor(options = {}) {
    this.numberOfChannels = options.numberOfChannels || 2;
    this.length = options.length !== undefined ? options.length : 48000;
    if (this.length <= 0) {
      throw new DOMException('IndexSizeError: buffer length must be greater than 0', 'IndexSizeError');
    }
    this.sampleRate = options.sampleRate || 48000;
    this.duration = this.length / this.sampleRate;
    this._channels = [];
    for (let i = 0; i < this.numberOfChannels; i++) {
      this._channels.push(new Float32Array(this.length));
    }
  }

  getChannelData(channelIndex) {
    if (channelIndex < 0 || channelIndex >= this.numberOfChannels) {
      throw new DOMException('IndexSizeError: Channel index out of bounds', 'IndexSizeError');
    }
    return this._channels[channelIndex];
  }

  copyFromChannel(destination, channelNumber, startInChannel = 0) {
    const src = this.getChannelData(channelNumber);
    destination.set(src.subarray(startInChannel, startInChannel + destination.length));
  }

  copyToChannel(source, channelNumber, startInChannel = 0) {
    const dest = this.getChannelData(channelNumber);
    dest.set(source, startInChannel);
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  constructor(context) {
    super(context, 0, 1);
    this.buffer = null;
    this.playbackRate = new MockAudioParam(1.0);
    this.detune = new MockAudioParam(0);
    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this._started = false;
    this._stopped = false;
    this.onended = null;
  }

  start(when = 0, offset = 0, duration) {
    if (this._started) {
      throw new DOMException('Cannot call start more than once', 'InvalidStateError');
    }
    this._started = true;
  }

  stop(when = 0) {
    this._stopped = true;
    setTimeout(() => {
      const ev = new MockEvent('ended');
      this.dispatchEvent(ev);
    }, 10);
  }
}

export class MockAudioContext extends MockEventTarget {
  static instances = new Set();

  static cleanupAll() {
    for (const ctx of MockAudioContext.instances) {
      if (ctx._timer) {
        clearInterval(ctx._timer);
        ctx._timer = null;
      }
      ctx.state = 'closed';
    }
    MockAudioContext.instances.clear();
  }

  constructor(options = {}) {
    super();
    MockAudioContext.instances.add(this);
    this.state = options.state || 'running'; // 'suspended' | 'running' | 'closed'
    this.sampleRate = options.sampleRate || 48000;
    this.currentTime = 0;
    this.baseLatency = 0.0051; // 5.1 ms
    this.outputLatency = 0.0082; // 8.2 ms
    this.destination = new MockAudioDestinationNode(this);
    this.sinkId = '';
    this.listener = {
      positionX: new MockAudioParam(0),
      positionY: new MockAudioParam(0),
      positionZ: new MockAudioParam(0),
      forwardX: new MockAudioParam(0),
      forwardY: new MockAudioParam(0),
      forwardZ: new MockAudioParam(-1),
      upX: new MockAudioParam(0),
      upY: new MockAudioParam(1),
      upZ: new MockAudioParam(0)
    };

    // Increment currentTime slightly in background
    this._timer = setInterval(() => {
      if (this.state === 'running') {
        this.currentTime += 0.016;
      }
    }, 16);
    if (this._timer && typeof this._timer.unref === 'function') {
      this._timer.unref();
    }
  }

  createAnalyser() {
    return new MockAnalyserNode(this);
  }

  createStereoPanner() {
    return new MockStereoPannerNode(this);
  }

  createGain() {
    return new MockGainNode(this);
  }

  createOscillator() {
    return new MockOscillatorNode(this);
  }

  createChannelSplitter(numberOfOutputs = 2) {
    return new MockChannelSplitterNode(this, numberOfOutputs);
  }

  createChannelMerger(numberOfInputs = 2) {
    return new MockChannelMergerNode(this, numberOfInputs);
  }

  createMediaStreamSource(mediaStream) {
    return new MockMediaStreamAudioSourceNode(this, { mediaStream });
  }

  createBuffer(numberOfChannels, length, sampleRate) {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode(this);
  }

  async resume() {
    this.state = 'running';
    this.dispatchEvent(new MockEvent('statechange'));
    return Promise.resolve();
  }

  async suspend() {
    this.state = 'suspended';
    this.dispatchEvent(new MockEvent('statechange'));
    return Promise.resolve();
  }

  async close() {
    this.state = 'closed';
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    MockAudioContext.instances.delete(this);
    this.dispatchEvent(new MockEvent('statechange'));
    return Promise.resolve();
  }

  async setSinkId(sinkId) {
    this.sinkId = String(sinkId);
    return Promise.resolve();
  }
}

export class MockMediaRecorder extends MockEventTarget {
  static instances = new Set();

  static cleanupAll() {
    for (const rec of MockMediaRecorder.instances) {
      if (rec._sliceTimer) {
        clearInterval(rec._sliceTimer);
        rec._sliceTimer = null;
      }
      rec.state = 'inactive';
    }
    MockMediaRecorder.instances.clear();
  }

  constructor(stream, options = {}) {
    super();
    MockMediaRecorder.instances.add(this);
    this.stream = stream;
    this.mimeType = options.mimeType || 'audio/webm;codecs=opus';
    this.state = 'inactive'; // 'inactive' | 'recording' | 'paused'
    this.ondataavailable = null;
    this.onstop = null;
    this.onstart = null;
    this.onerror = null;
    this._sliceTimer = null;
  }

  static isTypeSupported(mimeType) {
    const supported = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    return supported.some(s => mimeType && mimeType.toLowerCase().startsWith(s));
  }

  start(timeslice = 100) {
    if (this.state !== 'inactive') {
      throw new DOMException('InvalidStateError: MediaRecorder is already recording');
    }
    this.state = 'recording';
    this.dispatchEvent(new MockEvent('start'));

    this._sliceTimer = setInterval(() => {
      if (this.state === 'recording') {
        const dummyChunk = new Blob(['mock-audio-pcm-chunk'], { type: this.mimeType });
        const ev = new MockEvent('dataavailable');
        ev.data = dummyChunk;
        this.dispatchEvent(ev);
      }
    }, timeslice);
    if (this._sliceTimer && typeof this._sliceTimer.unref === 'function') {
      this._sliceTimer.unref();
    }
  }

  stop() {
    if (this.state === 'inactive') {
      throw new DOMException('InvalidStateError: MediaRecorder is not active');
    }
    this.state = 'inactive';
    if (this._sliceTimer) {
      clearInterval(this._sliceTimer);
      this._sliceTimer = null;
    }
    MockMediaRecorder.instances.delete(this);
    
    // Final data available
    const finalChunk = new Blob(['mock-final-audio-chunk'], { type: this.mimeType });
    const evData = new MockEvent('dataavailable');
    evData.data = finalChunk;
    this.dispatchEvent(evData);

    const evStop = new MockEvent('stop');
    this.dispatchEvent(evStop);
  }

  pause() {
    if (this.state === 'recording') {
      this.state = 'paused';
      this.dispatchEvent(new MockEvent('pause'));
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'recording';
      this.dispatchEvent(new MockEvent('resume'));
    }
  }

  requestData() {
    if (this.state !== 'inactive') {
      const chunk = new Blob(['mock-requested-chunk'], { type: this.mimeType });
      const ev = new MockEvent('dataavailable');
      ev.data = chunk;
      this.dispatchEvent(ev);
    }
  }
}

/**
 * Setup Web Audio API and MediaRecorder mocks on window / globalThis
 */
export function setupWebAudioMock() {
  globalThis.AudioContext = MockAudioContext;
  globalThis.webkitAudioContext = MockAudioContext;
  globalThis.MediaRecorder = MockMediaRecorder;

  if (globalThis.window) {
    globalThis.window.AudioContext = MockAudioContext;
    globalThis.window.webkitAudioContext = MockAudioContext;
    globalThis.window.MediaRecorder = MockMediaRecorder;
  }

  return {
    AudioContext: MockAudioContext,
    MediaRecorder: MockMediaRecorder,
    teardown: () => {
      MockAudioContext.cleanupAll();
      MockMediaRecorder.cleanupAll();
    }
  };
}
