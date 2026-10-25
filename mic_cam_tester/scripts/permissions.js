/**
 * Permissions & Troubleshooting Module
 * Features:
 * - navigator.permissions.query state prober
 * - Comprehensive WebRTC error classifier (NotAllowed, NotFound, NotReadable, Overconstrained, Security)
 * - Interactive step-by-step browser & OS troubleshooting guides
 * - Platform detection (OS & Browser)
 */

export const ERROR_TYPES = {
  NOT_ALLOWED: 'NotAllowedError',
  NOT_FOUND: 'NotFoundError',
  NOT_READABLE: 'NotReadableError',
  OVERCONSTRAINED: 'OverconstrainedError',
  SECURITY: 'SecurityError',
  ABORT: 'AbortError',
  UNKNOWN: 'UnknownError'
};

export class PermissionsService {
  constructor() {
    this.platformInfo = this.detectPlatform();
  }

  /**
   * Detects user's operating system and browser
   */
  detectPlatform() {
    if (typeof navigator === 'undefined') {
      return { browser: 'Chrome', os: 'Linux' };
    }

    const ua = navigator.userAgent || '';
    let browser = 'Chrome';
    let os = 'Windows';

    // Browser detection
    if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Brave/i.test(ua)) browser = 'Brave';
    else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

    // OS detection (check mobile identifiers before desktop fallbacks)
    if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Linux/i.test(ua)) os = 'Linux';

    return { browser, os, ua };
  }

  /**
   * Queries navigator.permissions for camera and microphone
   */
  async checkPermissions() {
    const result = {
      camera: 'unknown',
      microphone: 'unknown',
      supported: false
    };

    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
      return result;
    }

    result.supported = true;

    try {
      const camStatus = await navigator.permissions.query({ name: 'camera' });
      result.camera = camStatus.state; // 'granted' | 'prompt' | 'denied'
    } catch (e) {
      // Firefox & Safari throw for camera in permissions.query
      result.camera = 'unsupported_query';
    }

    try {
      const micStatus = await navigator.permissions.query({ name: 'microphone' });
      result.microphone = micStatus.state;
    } catch (e) {
      result.microphone = 'unsupported_query';
    }

    return result;
  }

  /**
   * Classifies an error into a structured diagnostic report with actionable advice
   */
  classifyError(error) {
    if (!error) {
      return {
        type: ERROR_TYPES.UNKNOWN,
        title: 'Unknown State',
        message: 'No error reported.',
        solution: 'Your device is ready to test.'
      };
    }

    const name = error.name || (typeof error === 'string' ? error : 'Error');
    const message = error.message || '';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'PermissionDismissedError') {
      return {
        type: ERROR_TYPES.NOT_ALLOWED,
        name: 'NotAllowedError',
        title: 'Permission Denied',
        severity: 'danger',
        message: 'Access to your camera or microphone was blocked by the browser or your operating system.',
        technicalDetail: message || 'User or OS permissions policy blocked access.',
        solution: 'Click the Lock / Permissions icon in your browser URL bar and change Camera and Microphone to "Allow", then reload the page.'
      };
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        type: ERROR_TYPES.NOT_FOUND,
        name: 'NotFoundError',
        title: 'Device Not Found',
        severity: 'warning',
        message: 'No physical camera or microphone hardware was detected by your system.',
        technicalDetail: message || 'No matching media input device found.',
        solution: 'Ensure your webcam or microphone USB cable is firmly plugged in, or check if your laptop has a physical privacy shutter / hardware switch.'
      };
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        type: ERROR_TYPES.NOT_READABLE,
        name: 'NotReadableError',
        title: 'Device Already in Use',
        severity: 'danger',
        message: 'The device is currently locked or in use by another application.',
        technicalDetail: message || 'Concurrent hardware lock prevented stream acquisition.',
        solution: 'Close competing video or calling software (Zoom, Microsoft Teams, OBS Studio, Discord, Google Meet, Skype) and refresh this page.'
      };
    }

    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return {
        type: ERROR_TYPES.OVERCONSTRAINED,
        name: 'OverconstrainedError',
        title: 'Hardware Constraints Not Supported',
        severity: 'warning',
        message: 'The requested resolution or framerate is not supported by your hardware.',
        technicalDetail: message || 'Requested constraints cannot be satisfied.',
        solution: 'Try selecting a lower resolution standard (e.g. 720p or 480p) or use default automatic constraints.'
      };
    }

    const isInsecure = (typeof window !== 'undefined' && !window.isSecureContext && typeof location !== 'undefined' && location.protocol !== 'https:' && location.hostname !== 'localhost');
    if (name === 'SecurityError' || name === 'TypeError' || isInsecure) {
      return {
        type: ERROR_TYPES.SECURITY,
        name: 'SecurityError',
        title: 'Insecure Context (HTTPS Required)',
        severity: 'danger',
        message: 'Modern web browsers strictly require HTTPS encryption or localhost to access cameras and microphones.',
        technicalDetail: message || 'Insecure origin blocked navigator.mediaDevices.',
        solution: 'Ensure you are accessing this site via HTTPS or localhost.'
      };
    }

    if (name === 'AbortError') {
      return {
        type: ERROR_TYPES.ABORT,
        name: 'AbortError',
        title: 'Operation Aborted',
        severity: 'warning',
        message: 'The hardware connection handshake was aborted or interrupted by the system.',
        technicalDetail: message || 'Hardware request aborted.',
        solution: 'Click the test button again to initiate a fresh connection session.'
      };
    }

    return {
      type: ERROR_TYPES.UNKNOWN,
      name,
      title: `Error: ${name}`,
      severity: 'danger',
      message: message || 'An unexpected hardware error occurred.',
      technicalDetail: message,
      solution: 'Check your browser console and system device manager for hardware driver status.'
    };
  }

  /**
   * Browser-specific troubleshooting recovery steps
   */
  getGuideForBrowser(browserName = null) {
    const target = (browserName || this.platformInfo.browser).toLowerCase();

    if (target.includes('chrome') || target.includes('brave') || target.includes('opera')) {
      return {
        browser: 'Google Chrome / Chromium / Brave',
        steps: [
          'Click the **Tune / Sliders (or Lock)** icon located on the far left side of the address bar.',
          'Find **Camera** and **Microphone** in the dropdown list and toggle them to **Allow / On**.',
          'If the options are greyed out, click **Site settings** and manually set Camera and Microphone to **Allow**.',
          'Reload the webpage to apply changes.'
        ]
      };
    }

    if (target.includes('firefox')) {
      return {
        browser: 'Mozilla Firefox',
        steps: [
          'Click the **Permissions badge icon** on the left side of the URL bar (crossed-out camera or microphone icon).',
          'Click the **"X"** button next to *Blocked Temporarily* or *Blocked*.',
          'Refresh the page.',
          'When prompted again, check **"Remember this decision"** and click **Allow**.'
        ]
      };
    }

    if (target.includes('safari')) {
      return {
        browser: 'Apple Safari',
        steps: [
          'In the macOS top menu bar, click **Safari -> Settings (or Preferences)**.',
          'Navigate to the **Websites** tab and select **Camera** and **Microphone** from the left sidebar.',
          'Find this website in the list and change the permission dropdown to **Allow**.',
          'Also check **System Settings -> Privacy & Security -> Camera / Microphone** to ensure Safari is allowed.'
        ]
      };
    }

    if (target.includes('edge')) {
      return {
        browser: 'Microsoft Edge',
        steps: [
          'Click the **Lock** icon in the address bar on the left side.',
          'Select **Permissions for this site** from the popup menu.',
          'Change both **Camera** and **Microphone** dropdowns to **Allow**.',
          'Return to the tab and click **Refresh**.'
        ]
      };
    }

    return {
      browser: 'Standard Web Browser',
      steps: [
        'Look for the padlock or settings icon in your browser address bar.',
        'Ensure Camera and Microphone permissions are set to Allow.',
        'Reload the web page.'
      ]
    };
  }

  /**
   * OS-specific troubleshooting recovery steps
   */
  getGuideForOS(osName = null) {
    const target = (osName || this.platformInfo.os).toLowerCase();

    if (target.includes('win')) {
      return {
        os: 'Windows 11 / 10',
        steps: [
          'Open **Start Menu -> Settings (Win + I) -> Privacy & Security -> Camera** (and Microphone).',
          'Verify that **Camera access** and **Microphone access** master toggles are switched **ON**.',
          'Scroll down and verify that **"Let apps access your camera"** and **"Let desktop apps access your camera"** are both turned **ON**.',
          'If using a laptop, ensure the physical privacy shutter slider or F-key camera lock (Fn + F10/F6) is disabled.'
        ]
      };
    }

    if (target.includes('mac')) {
      return {
        os: 'macOS (Sonoma, Ventura, Monterey)',
        steps: [
          'Open **Apple Menu -> System Settings -> Privacy & Security**.',
          'Click on **Camera** in the list and ensure your browser has a checkmark next to it.',
          'Click on **Microphone** in the list and ensure your browser has a checkmark next to it.',
          'If the device is locked, open **Terminal** and run `sudo killall VDCAssistant` (webcam daemon restart) or `sudo killall coreaudiod`.'
        ]
      };
    }

    if (target.includes('linux')) {
      return {
        os: 'Linux (Ubuntu, Debian, Fedora, Arch)',
        steps: [
          'Verify your user account is in the `video` and `audio` groups by running: `sudo usermod -a -G video,audio $USER` (re-login required).',
          'Check if video device nodes exist: `ls -l /dev/video*` and verify read/write permissions.',
          'For PipeWire / PulseAudio microphone inputs, verify sources in `pavucontrol` or run `pactl list sources short`.',
          'Check system logs for hardware disconnects: `dmesg | grep -i uvcvideo`.'
        ]
      };
    }

    return {
      os: 'Operating System',
      steps: [
        'Check system privacy settings to ensure web browsers have permission to use camera and microphone hardware.',
        'Ensure no other open applications are locking the media devices.'
      ]
    };
  }

  /**
   * Renders interactive troubleshooting guide into DOM container
   */
  renderTroubleshootingGuide(containerElementOrId, errorType = null, platformFilter = null) {
    const container = typeof containerElementOrId === 'string'
      ? document.getElementById(containerElementOrId)
      : containerElementOrId;

    if (!container) return;

    const browserGuide = this.getGuideForBrowser(platformFilter);
    const osGuide = this.getGuideForOS(platformFilter);
    const errorInfo = errorType ? this.classifyError(errorType) : null;

    let bannerHtml = '';
    if (errorInfo && errorInfo.type !== ERROR_TYPES.UNKNOWN) {
      bannerHtml = `
        <div class="permission-banner ${errorInfo.severity === 'danger' ? 'error' : ''}">
          <div class="permission-banner-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="${errorInfo.severity === 'danger' ? '#ef4444' : '#f59e0b'}">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <div>
            <h4 style="font-weight: 700; margin-bottom: 0.25rem;">${errorInfo.title}</h4>
            <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">${errorInfo.message}</p>
            <p style="font-size: 0.85rem; opacity: 0.9;"><strong>Quick Fix:</strong> ${errorInfo.solution}</p>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      ${bannerHtml}
      <div class="accordion">
        <div class="accordion-item open">
          <div class="accordion-header" data-toggle="accordion">
            <div class="accordion-header-title">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <span>Browser Permissions: ${browserGuide.browser}</span>
            </div>
            <svg class="accordion-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          <div class="accordion-content">
            <div class="step-list">
              ${browserGuide.steps.map((step, idx) => `
                <div class="step-item">
                  <div class="step-number">${idx + 1}</div>
                  <div class="step-text">${step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="accordion-item open">
          <div class="accordion-header" data-toggle="accordion">
            <div class="accordion-header-title">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M4 6h16v10H4z M20 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z M10 20h4v2h-4z"/>
              </svg>
              <span>Operating System Hardware Privacy: ${osGuide.os}</span>
            </div>
            <svg class="accordion-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          <div class="accordion-content">
            <div class="step-list">
              ${osGuide.steps.map((step, idx) => `
                <div class="step-item">
                  <div class="step-number">${idx + 1}</div>
                  <div class="step-text">${step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code class="code-snippet">$1</code>')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach accordion toggles
    container.querySelectorAll('[data-toggle="accordion"]').forEach(header => {
      header.onclick = () => {
        const item = header.closest('.accordion-item');
        item.classList.toggle('open');
      };
    });
  }
}

// Module singleton instance matching PROJECT.md interface contract
export const PermissionsModule = new PermissionsService();
export default PermissionsModule;
