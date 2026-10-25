/**
 * Comprehensive DOM, Canvas, and Browser Environment Mock
 * Zero-dependency test harness for Node.js 22
 */

export class MockDOMTokenList {
  constructor(element) {
    this._element = element;
    this._tokens = new Set();
  }

  add(...tokens) {
    for (const t of tokens) {
      if (t) this._tokens.add(t);
    }
    this._sync();
  }

  remove(...tokens) {
    for (const t of tokens) {
      this._tokens.delete(t);
    }
    this._sync();
  }

  toggle(token, force) {
    if (force !== undefined) {
      if (force) this._tokens.add(token);
      else this._tokens.delete(token);
      this._sync();
      return force;
    }
    const exists = this._tokens.has(token);
    if (exists) this._tokens.delete(token);
    else this._tokens.add(token);
    this._sync();
    return !exists;
  }

  contains(token) {
    return this._tokens.has(token);
  }

  _sync() {
    this._element.attributes['class'] = Array.from(this._tokens).join(' ');
  }

  toString() {
    return Array.from(this._tokens).join(' ');
  }

  get length() {
    return this._tokens.size;
  }
}

export class MockCSSStyleDeclaration {
  constructor(element) {
    this._element = element;
    this._properties = new Map();
  }

  setProperty(property, value) {
    this._properties.set(property, String(value));
    const camel = property.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    this[camel] = String(value);
  }

  getPropertyValue(property) {
    return this._properties.get(property) || '';
  }

  removeProperty(property) {
    const val = this._properties.get(property) || '';
    this._properties.delete(property);
    const camel = property.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    delete this[camel];
    return val;
  }

  get cssText() {
    return Array.from(this._properties.entries())
      .map(([k, v]) => `${k}: ${v};`)
      .join(' ');
  }

  set cssText(val) {
    this._properties.clear();
    if (!val) return;
    val.split(';').forEach(pair => {
      const idx = pair.indexOf(':');
      if (idx !== -1) {
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        if (k && v) this.setProperty(k, v);
      }
    });
  }
}

export class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = !!options.bubbles;
    this.cancelable = !!options.cancelable;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.timeStamp = Date.now();
  }

  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }

  stopPropagation() {}
  stopImmediatePropagation() {}
}

export class MockCustomEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail !== undefined ? options.detail : null;
  }
}

export class MockEventTarget {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, callback, options = {}) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    const once = typeof options === 'object' && options.once;
    this._listeners.get(type).push({ callback, once });
  }

  removeEventListener(type, callback) {
    if (!this._listeners.has(type)) return;
    const list = this._listeners.get(type).filter(l => l.callback !== callback);
    this._listeners.set(type, list);
  }

  dispatchEvent(event) {
    if (!event.type) return true;
    event.target = this;
    event.currentTarget = this;

    const list = this._listeners.get(event.type);
    if (list) {
      const copy = [...list];
      for (const listener of copy) {
        try {
          listener.callback.call(this, event);
        } catch (err) {
          console.error(`Error in event listener for ${event.type}:`, err);
        }
        if (listener.once) {
          this.removeEventListener(event.type, listener.callback);
        }
      }
    }

    const onHandler = this[`on${event.type}`];
    if (typeof onHandler === 'function') {
      try {
        onHandler.call(this, event);
      } catch (err) {
        console.error(`Error in on${event.type} handler:`, err);
      }
    }

    return !event.defaultPrevented;
  }
}

export class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.shadowColor = 'transparent';
    this.shadowBlur = 0;
    this.font = '10px sans-serif';
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';
    this.globalAlpha = 1.0;
    
    // Call telemetry for assertions
    this.calls = [];
    this._stateStack = [];
  }

  _record(method, args) {
    this.calls.push({ method, args: Array.from(args) });
  }

  clearRect(x, y, w, h) {
    this._record('clearRect', [x, y, w, h]);
  }

  fillRect(x, y, w, h) {
    this._record('fillRect', [x, y, w, h]);
  }

  strokeRect(x, y, w, h) {
    this._record('strokeRect', [x, y, w, h]);
  }

  beginPath() {
    this._record('beginPath', []);
  }

  closePath() {
    this._record('closePath', []);
  }

  moveTo(x, y) {
    this._record('moveTo', [x, y]);
  }

  lineTo(x, y) {
    this._record('lineTo', [x, y]);
  }

  arc(x, y, radius, startAngle, endAngle, counterclockwise) {
    this._record('arc', [x, y, radius, startAngle, endAngle, counterclockwise]);
  }

  roundRect(x, y, w, h, radii) {
    this._record('roundRect', [x, y, w, h, radii]);
  }

  stroke() {
    this._record('stroke', []);
  }

  fill() {
    this._record('fill', []);
  }

  scale(x, y) {
    this._record('scale', [x, y]);
  }

  translate(x, y) {
    this._record('translate', [x, y]);
  }

  rotate(angle) {
    this._record('rotate', [angle]);
  }

  save() {
    this._stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      shadowColor: this.shadowColor,
      shadowBlur: this.shadowBlur,
      globalAlpha: this.globalAlpha
    });
    this._record('save', []);
  }

  restore() {
    if (this._stateStack.length > 0) {
      const state = this._stateStack.pop();
      Object.assign(this, state);
    }
    this._record('restore', []);
  }

  createLinearGradient(x0, y0, x1, y1) {
    this._record('createLinearGradient', [x0, y0, x1, y1]);
    const stops = [];
    return {
      addColorStop(offset, color) {
        stops.push({ offset, color });
      },
      _stops: stops
    };
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    this._record('createRadialGradient', [x0, y0, r0, x1, y1, r1]);
    return { addColorStop() {} };
  }

  drawImage(image, ...args) {
    this._record('drawImage', [image, ...args]);
  }

  measureText(text) {
    this._record('measureText', [text]);
    return { width: (String(text).length || 0) * 8 };
  }

  fillText(text, x, y, maxWidth) {
    this._record('fillText', [text, x, y, maxWidth]);
  }

  strokeText(text, x, y, maxWidth) {
    this._record('strokeText', [text, x, y, maxWidth]);
  }

  getImageData(x, y, w, h) {
    this._record('getImageData', [x, y, w, h]);
    return {
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4)
    };
  }

  putImageData(imageData, x, y) {
    this._record('putImageData', [imageData, x, y]);
  }
}

export class MockHTMLElement extends MockEventTarget {
  constructor(tagName = 'div', documentRef = null) {
    super();
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1;
    this.ownerDocument = documentRef;
    
    this.attributes = {};
    this.dataset = {};
    this.classList = new MockDOMTokenList(this);
    this.style = new MockCSSStyleDeclaration(this);
    
    this.children = [];
    this.childNodes = [];
    this.parentElement = null;
    this.parentNode = null;

    this._innerHTML = '';
    this._textContent = '';
    this._value = '';
    this.disabled = false;
    this.hidden = false;
    this.id = '';
    this.className = '';
  }

  get id() {
    return this.getAttribute('id') || '';
  }

  set id(val) {
    if (val) this.setAttribute('id', val);
    else this.removeAttribute('id');
  }

  get className() {
    return this.classList.toString();
  }

  set className(val) {
    this.classList._tokens.clear();
    if (val) {
      val.split(/\s+/).forEach(c => {
        if (c) this.classList._tokens.add(c);
      });
    }
    this.classList._sync();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = String(val);
  }

  contains(other) {
    if (!other) return false;
    if (this === other) return true;
    let curr = other.parentNode;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = String(html);
    this.children = [];
    this.childNodes = [];
    this._parseAndBuildChildren(this._innerHTML);
  }

  get textContent() {
    if (this.children.length === 0) return this._textContent;
    return this.children.map(c => c.textContent).join('');
  }

  set textContent(text) {
    this._textContent = String(text);
    this._innerHTML = String(text);
    this.children = [];
    this.childNodes = [];
  }

  setAttribute(name, value) {
    const strVal = String(value);
    this.attributes[name] = strVal;
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      this.dataset[key] = strVal;
    }
    if (name === 'class') {
      this.classList._tokens.clear();
      strVal.split(/\s+/).forEach(c => {
        if (c) this.classList._tokens.add(c);
      });
    }
    if (name === 'id') {
      this.attributes['id'] = strVal;
    }
    if (name === 'value') {
      this._value = strVal;
    }
    if (name === 'disabled') {
      this.disabled = true;
    }
  }

  getAttribute(name) {
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      if (this.dataset[key] !== undefined) return this.dataset[key];
    }
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      delete this.dataset[key];
    }
    if (name === 'class') {
      this.classList._tokens.clear();
    }
    if (name === 'disabled') {
      this.disabled = false;
    }
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  appendChild(child) {
    if (!child) return null;
    if (child.parentElement) {
      child.parentElement.removeChild(child);
    }
    child.parentElement = this;
    child.parentNode = this;
    if (this.ownerDocument) child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      const nodeIdx = this.childNodes.indexOf(child);
      if (nodeIdx !== -1) this.childNodes.splice(nodeIdx, 1);
      child.parentElement = null;
      child.parentNode = null;
      return child;
    }
    return null;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      if (newChild.parentElement) newChild.parentElement.removeChild(newChild);
      newChild.parentElement = this;
      newChild.parentNode = this;
      this.children[idx] = newChild;
      const nodeIdx = this.childNodes.indexOf(oldChild);
      if (nodeIdx !== -1) this.childNodes[nodeIdx] = newChild;
      oldChild.parentElement = null;
      oldChild.parentNode = null;
      return oldChild;
    }
    return null;
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    const idx = this.children.indexOf(refChild);
    if (idx !== -1) {
      if (newChild.parentElement) newChild.parentElement.removeChild(newChild);
      newChild.parentElement = this;
      newChild.parentNode = this;
      this.children.splice(idx, 0, newChild);
      const nodeIdx = this.childNodes.indexOf(refChild);
      this.childNodes.splice(nodeIdx !== -1 ? nodeIdx : idx, 0, newChild);
      return newChild;
    }
    return this.appendChild(newChild);
  }

  getBoundingClientRect() {
    const w = parseFloat(this.style.width) || 600;
    const h = parseFloat(this.style.height) || 200;
    return {
      width: w,
      height: h,
      top: 0,
      left: 0,
      right: w,
      bottom: h,
      x: 0,
      y: 0
    };
  }

  click() {
    if (this.disabled) return;
    const event = new MockEvent('click', { bubbles: true, cancelable: true });
    this.dispatchEvent(event);
  }

  focus() {
    const event = new MockEvent('focus', { bubbles: false, cancelable: false });
    this.dispatchEvent(event);
  }

  blur() {
    const event = new MockEvent('blur', { bubbles: false, cancelable: false });
    this.dispatchEvent(event);
  }

  querySelector(selector) {
    return this._matchSelector(selector, false);
  }

  querySelectorAll(selector) {
    const results = [];
    this._matchSelector(selector, true, results);
    return results;
  }

  _matchSelector(selector, multiple = false, acc = []) {
    selector = selector.trim();
    
    // Check direct children and descendants
    for (const child of this.children) {
      let match = false;

      if (selector.startsWith('#')) {
        const targetId = selector.slice(1);
        if (child.id === targetId || child.getAttribute('id') === targetId) match = true;
      } else if (selector.startsWith('.')) {
        const targetClass = selector.slice(1);
        if (child.classList.contains(targetClass)) match = true;
      } else if (selector.startsWith('[') && selector.endsWith(']')) {
        const attrExpr = selector.slice(1, -1);
        if (attrExpr.includes('=')) {
          const [name, valRaw] = attrExpr.split('=');
          const cleanVal = valRaw.replace(/['"]/g, '');
          if (child.getAttribute(name) === cleanVal) match = true;
        } else {
          if (child.hasAttribute(attrExpr)) match = true;
        }
      } else {
        if (child.tagName.toLowerCase() === selector.toLowerCase()) match = true;
      }

      if (match) {
        if (!multiple) return child;
        acc.push(child);
      }

      const sub = child._matchSelector(selector, multiple, acc);
      if (!multiple && sub) return sub;
    }

    return multiple ? acc : null;
  }

  _parseAndBuildChildren(html) {
    // Lightweight parser for IDs and classes in HTML templates
    const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9-]+)([^>]*)\/>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1] || match[4];
      const attrString = match[2] || match[5] || '';
      const inner = match[3] || '';

      const elem = this.ownerDocument ? this.ownerDocument.createElement(tagName) : new MockHTMLElement(tagName);
      
      // Parse attributes
      const attrRegex = /([a-zA-Z0-9_-]+)(?:=["']([^"']*)["'])?/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrString)) !== null) {
        const k = attrMatch[1];
        const v = attrMatch[2] !== undefined ? attrMatch[2] : '';
        elem.setAttribute(k, v);
      }

      if (inner) elem.innerHTML = inner;
      this.appendChild(elem);
    }
  }
}

export class MockHTMLVideoElement extends MockHTMLElement {
  constructor(documentRef) {
    super('video', documentRef);
    this.srcObject = null;
    this._videoWidth = 1920;
    this._videoHeight = 1080;
    this.paused = true;
    this.muted = true;
    this.autoplay = true;
    this.playsinline = true;
    this._rvfcCallbacks = new Map();
    this._nextRvfcId = 1;
  }

  get videoWidth() {
    if (this.srcObject && typeof this.srcObject.getVideoTracks === 'function') {
      const track = this.srcObject.getVideoTracks()[0];
      if (track && track.getSettings) {
        const s = track.getSettings();
        if (s.width) return s.width;
      }
    }
    return this._videoWidth !== undefined ? this._videoWidth : 1920;
  }

  set videoWidth(w) {
    this._videoWidth = w;
  }

  get videoHeight() {
    if (this.srcObject && typeof this.srcObject.getVideoTracks === 'function') {
      const track = this.srcObject.getVideoTracks()[0];
      if (track && track.getSettings) {
        const s = track.getSettings();
        if (s.height) return s.height;
      }
    }
    return this._videoHeight !== undefined ? this._videoHeight : 1080;
  }

  set videoHeight(h) {
    this._videoHeight = h;
  }

  async play() {
    this.paused = false;
    this.dispatchEvent(new MockEvent('play'));
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new MockEvent('pause'));
  }

  requestVideoFrameCallback(callback) {
    const id = this._nextRvfcId++;
    const timer = setTimeout(() => {
      if (this._rvfcCallbacks.has(id)) {
        this._rvfcCallbacks.delete(id);
        const now = Date.now();
        callback(now, {
          presentationTime: now,
          expectedDisplayTime: now + 16.6,
          width: this.videoWidth,
          height: this.videoHeight,
          mediaTime: 0.1,
          presentedFrames: id
        });
      }
    }, 16);
    this._rvfcCallbacks.set(id, timer);
    return id;
  }

  cancelVideoFrameCallback(id) {
    if (this._rvfcCallbacks.has(id)) {
      clearTimeout(this._rvfcCallbacks.get(id));
      this._rvfcCallbacks.delete(id);
    }
  }
}

export class MockHTMLCanvasElement extends MockHTMLElement {
  constructor(documentRef) {
    super('canvas', documentRef);
    this.width = 600;
    this.height = 200;
    this._ctx2d = new MockCanvasRenderingContext2D(this);
  }

  getContext(type) {
    if (type === '2d') return this._ctx2d;
    return null;
  }

  toDataURL(type = 'image/png') {
    return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
  }

  toBlob(callback, type = 'image/png') {
    const blob = new Blob(['mock-canvas-image'], { type });
    if (callback) setTimeout(() => callback(blob), 0);
  }
}

export class MockHTMLSelectElement extends MockHTMLElement {
  constructor(documentRef) {
    super('select', documentRef);
    this.options = [];
    this._selectedIndex = 0;
  }

  add(option) {
    this.appendChild(option);
  }

  appendChild(child) {
    super.appendChild(child);
    if (child.tagName === 'OPTION' && !this.options.includes(child)) {
      this.options.push(child);
    }
    return child;
  }

  removeChild(child) {
    super.removeChild(child);
    const idx = this.options.indexOf(child);
    if (idx !== -1) {
      this.options.splice(idx, 1);
    }
    return child;
  }

  set innerHTML(html) {
    this.options = [];
    super.innerHTML = html;
  }

  get innerHTML() {
    return super.innerHTML;
  }

  get selectedIndex() {
    const idx = this.options.findIndex(opt => opt.selected);
    if (idx !== -1) return idx;
    return this.options.length > 0 ? (this._selectedIndex < this.options.length ? this._selectedIndex : 0) : -1;
  }

  set selectedIndex(idx) {
    this._selectedIndex = idx;
    this.options.forEach((opt, i) => {
      opt.selected = (i === idx);
    });
  }

  get value() {
    if (this.options.length === 0) return '';
    const selected = this.options.find(opt => opt.selected) || this.options[this._selectedIndex] || this.options[0];
    return selected ? (selected.value !== undefined ? selected.value : selected.textContent) : '';
  }

  set value(val) {
    this._value = String(val);
    const idx = this.options.findIndex(opt => (opt.value !== undefined ? opt.value : opt.textContent) === String(val));
    if (idx !== -1) {
      this.selectedIndex = idx;
    }
  }
}

export class MockHTMLMediaElement extends MockHTMLElement {
  constructor(tagName = 'media', documentRef) {
    super(tagName, documentRef);
    this.src = '';
    this.paused = true;
    this.currentTime = 0;
    this.duration = 5.0;
    this.volume = 1.0;
    this.muted = false;
    this.sinkId = '';
  }

  async play() {
    this.paused = false;
    this.dispatchEvent(new MockEvent('play'));
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new MockEvent('pause'));
  }

  async setSinkId(sinkId) {
    this.sinkId = String(sinkId);
    return Promise.resolve();
  }
}

export class MockHTMLAudioElement extends MockHTMLMediaElement {
  constructor(documentRef) {
    super('audio', documentRef);
  }
}

export class MockDocument extends MockEventTarget {
  constructor() {
    super();
    this.readyState = 'complete';
    this.title = 'Mic & Cam Diagnostic Utility';
    this.documentElement = new MockHTMLElement('html', this);
    this.head = new MockHTMLElement('head', this);
    this.body = new MockHTMLElement('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName) {
    const tag = tagName.toLowerCase();
    if (tag === 'video') return new MockHTMLVideoElement(this);
    if (tag === 'canvas') return new MockHTMLCanvasElement(this);
    if (tag === 'select') return new MockHTMLSelectElement(this);
    if (tag === 'audio') return new MockHTMLAudioElement(this);
    return new MockHTMLElement(tag, this);
  }

  createElementNS(ns, tagName) {
    return this.createElement(tagName);
  }

  createTextNode(text) {
    const node = new MockHTMLElement('#text', this);
    node.textContent = String(text);
    return node;
  }

  createDocumentFragment() {
    return new MockHTMLElement('#fragment', this);
  }

  getElementById(id) {
    return this.documentElement.querySelector(`#${id}`);
  }

  querySelector(selector) {
    return this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.documentElement.querySelectorAll(selector);
  }
}

export class MockLocalStorage {
  constructor() {
    this._store = new Map();
  }

  getItem(key) {
    return this._store.has(String(key)) ? this._store.get(String(key)) : null;
  }

  setItem(key, value) {
    this._store.set(String(key), String(value));
  }

  removeItem(key) {
    this._store.delete(String(key));
  }

  clear() {
    this._store.clear();
  }

  get length() {
    return this._store.size;
  }

  key(index) {
    return Array.from(this._store.keys())[index] || null;
  }
}

/**
 * Setup global mock browser environment
 */
export function setupDomEnvironment(initialHtml = '') {
  const doc = new MockDocument();
  if (initialHtml) {
    doc.body.innerHTML = initialHtml;
  }

  const localStorage = new MockLocalStorage();
  const sessionStorage = new MockLocalStorage();

  const mockRafMap = new Map();
  let nextRafId = 1;

  const mockWindow = {
    document: doc,
    localStorage,
    sessionStorage,
    devicePixelRatio: 1,
    location: {
      hash: '',
      href: 'http://localhost:3000/',
      protocol: 'http:',
      host: 'localhost:3000',
      pathname: '/'
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      onLine: true,
      clipboard: {
        writeText: async (text) => Promise.resolve(text),
        readText: async () => Promise.resolve('')
      }
    },
    matchMedia: (query) => {
      const isDark = query.includes('prefers-color-scheme: dark');
      return {
        matches: isDark,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    },
    requestAnimationFrame: (cb) => {
      const id = nextRafId++;
      const timer = setTimeout(() => {
        if (mockRafMap.has(id)) {
          mockRafMap.delete(id);
          cb(performance.now());
        }
      }, 16);
      if (timer && typeof timer.unref === 'function') {
        timer.unref();
      }
      mockRafMap.set(id, timer);
      return id;
    },
    cancelAnimationFrame: (id) => {
      if (mockRafMap.has(id)) {
        clearTimeout(mockRafMap.get(id));
        mockRafMap.delete(id);
      }
    },
    addEventListener: doc.addEventListener.bind(doc),
    removeEventListener: doc.removeEventListener.bind(doc),
    dispatchEvent: doc.dispatchEvent.bind(doc),
    Audio: MockHTMLAudioElement,
    HTMLMediaElement: MockHTMLMediaElement,
    Event: MockEvent,
    CustomEvent: MockCustomEvent
  };

  // URL Object URL registry
  const objectUrls = new Map();
  const MockURL = {
    createObjectURL: (blob) => {
      const url = `blob:http://localhost:3000/${Math.random().toString(36).substring(2, 10)}`;
      objectUrls.set(url, blob);
      return url;
    },
    revokeObjectURL: (url) => {
      objectUrls.delete(url);
    },
    _registry: objectUrls
  };

  // Save original globals before applying mocks
  const savedGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
    navigator: globalThis.navigator,
    matchMedia: globalThis.matchMedia,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    CustomEvent: globalThis.CustomEvent,
    Event: globalThis.Event,
    Audio: globalThis.Audio,
    HTMLMediaElement: globalThis.HTMLMediaElement
  };

  // Apply to globalThis
  const def = (key, val) => {
    try {
      Object.defineProperty(globalThis, key, {
        value: val,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      globalThis[key] = val;
    }
  };

  def('window', mockWindow);
  def('document', doc);
  def('localStorage', localStorage);
  def('sessionStorage', sessionStorage);
  def('navigator', mockWindow.navigator);
  def('matchMedia', mockWindow.matchMedia);
  def('requestAnimationFrame', mockWindow.requestAnimationFrame);
  def('cancelAnimationFrame', mockWindow.cancelAnimationFrame);
  def('CustomEvent', MockCustomEvent);
  def('Event', MockEvent);
  def('Audio', MockHTMLAudioElement);
  def('HTMLMediaElement', MockHTMLMediaElement);

  if (globalThis.URL) {
    globalThis.URL.createObjectURL = MockURL.createObjectURL;
    globalThis.URL.revokeObjectURL = MockURL.revokeObjectURL;
  }

  return {
    window: mockWindow,
    document: doc,
    localStorage,
    sessionStorage,
    teardown: () => {
      for (const timer of mockRafMap.values()) clearTimeout(timer);
      mockRafMap.clear();
      objectUrls.clear();

      // Restore
      if (savedGlobals.window !== undefined) globalThis.window = savedGlobals.window;
      else delete globalThis.window;

      if (savedGlobals.document !== undefined) globalThis.document = savedGlobals.document;
      else delete globalThis.document;

      if (savedGlobals.localStorage !== undefined) globalThis.localStorage = savedGlobals.localStorage;
      else delete globalThis.localStorage;

      if (savedGlobals.sessionStorage !== undefined) globalThis.sessionStorage = savedGlobals.sessionStorage;
      else delete globalThis.sessionStorage;

      if (savedGlobals.navigator !== undefined) globalThis.navigator = savedGlobals.navigator;
      else delete globalThis.navigator;

      if (savedGlobals.matchMedia !== undefined) globalThis.matchMedia = savedGlobals.matchMedia;
      else delete globalThis.matchMedia;

      if (savedGlobals.requestAnimationFrame !== undefined) globalThis.requestAnimationFrame = savedGlobals.requestAnimationFrame;
      else delete globalThis.requestAnimationFrame;

      if (savedGlobals.cancelAnimationFrame !== undefined) globalThis.cancelAnimationFrame = savedGlobals.cancelAnimationFrame;
      else delete globalThis.cancelAnimationFrame;

      if (savedGlobals.CustomEvent !== undefined) globalThis.CustomEvent = savedGlobals.CustomEvent;
      else delete globalThis.CustomEvent;

      if (savedGlobals.Event !== undefined) globalThis.Event = savedGlobals.Event;
      else delete globalThis.Event;

      if (savedGlobals.Audio !== undefined) globalThis.Audio = savedGlobals.Audio;
      else delete globalThis.Audio;
    }
  };
}
