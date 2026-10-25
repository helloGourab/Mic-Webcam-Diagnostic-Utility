/**
 * UI Module - Theme Switcher, Tab Navigation, Toast Notifications & DOM Helpers
 * Features:
 * - Dark & Light mode toggle with system preference sync & localStorage persistence
 * - Tab navigation and view state switching
 * - High-contrast toast notification system with stacking
 * - DOM utility helpers for badges and device select elements
 */

export class UIService {
  constructor() {
    this.currentTheme = 'dark';
    this.currentTab = 'camera';
    this.toastContainer = null;
    this.onTabChanged = null;
  }

  /**
   * Initializes theme preference from localStorage or OS system preference
   */
  initTheme() {
    const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('mic_cam_tester_theme') : null;

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.setTheme('light');
    } else {
      this.setTheme('dark');
    }

    // Listen for OS system theme changes if user hasn't explicitly saved
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        try {
          if (typeof localStorage !== 'undefined' && !localStorage.getItem('mic_cam_tester_theme')) {
            this.setTheme(e.matches ? 'light' : 'dark');
          }
        } catch (err) {}
      });
    }

    return this.currentTheme;
  }

  /**
   * Sets current theme explicitly ('dark' | 'light')
   */
  setTheme(theme) {
    this.currentTheme = theme === 'light' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.currentTheme);
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('mic_cam_tester_theme', this.currentTheme);
      } catch (e) {}
    }
    this._updateThemeIcons();
    return this.currentTheme;
  }

  /**
   * Toggles between dark and light themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    return this.setTheme(newTheme);
  }

  /**
   * Switches active UI tab panel
   */
  showTab(tabId) {
    if (typeof document === 'undefined') return;

    this.currentTab = tabId;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const target = btn.getAttribute('data-tab');
      if (target === tabId) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Update tab content panels
    document.querySelectorAll('.tab-content').forEach(panel => {
      const panelId = panel.getAttribute('id');
      if (panelId === `tab-${tabId}`) {
        panel.classList.add('active');
        panel.removeAttribute('hidden');
      } else {
        panel.classList.remove('active');
        panel.setAttribute('hidden', 'true');
      }
    });

    if (this.onTabChanged) {
      this.onTabChanged(tabId);
    }
  }

  /**
   * Displays a toast notification
   */
  showNotification(message, type = 'info', durationMs = 4000) {
    if (typeof document === 'undefined') return;

    this._ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#ef4444"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#f59e0b"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#3b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-content" style="display: flex; align-items: center; gap: 0.6rem;">
        ${iconSvg}
      </div>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    const contentDiv = toast.querySelector('.toast-content');
    if (contentDiv) {
      const textSpan = document.createElement('span');
      textSpan.textContent = String(message);
      contentDiv.appendChild(textSpan);
    }

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => this._removeToast(toast);

    this.toastContainer.appendChild(toast);

    if (durationMs > 0) {
      setTimeout(() => {
        this._removeToast(toast);
      }, durationMs);
    }

    return toast;
  }

  /**
   * Helper to populate select dropdowns with device items
   */
  renderSelectOptions(selectElement, items, defaultVal = null, placeholder = 'Select Device...') {
    if (!selectElement) return;

    selectElement.innerHTML = '';

    if (items.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No devices found / Permission required';
      opt.disabled = true;
      opt.selected = true;
      selectElement.appendChild(opt);
      return;
    }

    items.forEach((item, index) => {
      const opt = document.createElement('option');
      opt.value = item.deviceId;
      opt.textContent = item.label || `Device ${index + 1}`;
      if (defaultVal && item.deviceId === defaultVal) {
        opt.selected = true;
      }
      selectElement.appendChild(opt);
    });
  }

  /* ---------------- Private Helpers ---------------- */

  _ensureToastContainer() {
    if (!this.toastContainer || !document.body.contains(this.toastContainer)) {
      this.toastContainer = document.getElementById('toast-container');
      if (!this.toastContainer) {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
      }
    }
  }

  _removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }

  _updateThemeIcons() {
    if (typeof document === 'undefined') return;
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (sunIcon && moonIcon) {
      if (this.currentTheme === 'light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
    }
  }
}

// Module singleton instance matching PROJECT.md interface contract
export const UIModule = new UIService();
export default UIModule;
