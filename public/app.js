/* ==========================================
   AGRISHIELD AI - MAIN APP STATE CONTROLLER
   ========================================== */

export const state = {
  activeTab: 'dashboard',
  selectedCrop: 'tomato',
  apiConnected: false,
  demoMode: true,
  theme: 'dark',
  apiKey: localStorage.getItem('agrishield_gemini_key') || '',
  environment: {
    temperature: 26,
    moisture: 65,
    humidity: 68,
    sunlight: 'moderate' // low, moderate, high
  }
};

// Global DOM references
const elements = {
  body: document.body,
  navItems: document.querySelectorAll('.nav-item'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  cropSelect: document.getElementById('crop-select'),
  themeToggle: document.getElementById('theme-toggle'),
  modeStatus: document.getElementById('mode-status'),
  apiStatusBadge: document.getElementById('api-status-badge'),
  inputApiKey: document.getElementById('input-api-key'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  dateDisplay: document.getElementById('date-display'),
  toastContainer: document.getElementById('toast-container'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  sidebar: document.querySelector('.sidebar')
};

// Crop Threshold Definitions
export const cropThresholds = {
  tomato: { name: 'Tomato', minTemp: 20, maxTemp: 30, minMoist: 60, maxMoist: 80 },
  potato: { name: 'Potato', minTemp: 15, maxTemp: 25, minMoist: 50, maxMoist: 70 },
  corn: { name: 'Corn / Maize', minTemp: 18, maxTemp: 32, minMoist: 55, maxMoist: 75 },
  wheat: { name: 'Wheat', minTemp: 12, maxTemp: 25, minMoist: 45, maxMoist: 65 },
  rice: { name: 'Rice', minTemp: 22, maxTemp: 35, minMoist: 75, maxMoist: 95 }
};

// Toast Notification Engine
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warn') icon = '⚠️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  // Trigger Slide In
  setTimeout(() => {
    toast.classList.add('fade-in');
  }, 10);

  // Fade out and remove
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

// Check backend API connection
export async function checkApiHealth() {
  try {
    const headers = {};
    if (state.apiKey) {
      headers['Authorization'] = `Bearer ${state.apiKey}`;
    }

    const response = await fetch('/api/health', { headers });
    if (!response.ok) throw new Error('Health check request failed');
    
    const data = await response.json();
    state.demoMode = data.demoMode;
    
    // If a custom API key is validated, reflect in status
    if (state.apiKey) {
      state.demoMode = false;
    }

    updateApiUI();
  } catch (error) {
    console.error('API connection failed:', error);
    state.demoMode = true;
    updateApiUI(true);
  }
}

// Update API indicator tags
function updateApiUI(connectionFailed = false) {
  if (connectionFailed) {
    elements.modeStatus.textContent = 'Connection Fail';
    elements.modeStatus.className = 'mode-badge';
    elements.modeStatus.style.backgroundColor = 'var(--danger-bg)';
    elements.modeStatus.style.color = 'var(--danger)';
    
    if (elements.apiStatusBadge) {
      elements.apiStatusBadge.textContent = 'Server Unreachable';
      elements.apiStatusBadge.className = 'badge badge-warn';
    }
    return;
  }

  if (state.demoMode) {
    elements.modeStatus.textContent = 'Demo Mode';
    elements.modeStatus.className = 'mode-badge';
    elements.modeStatus.style.backgroundColor = 'var(--warning-bg)';
    elements.modeStatus.style.color = 'var(--warning)';
    
    if (elements.apiStatusBadge) {
      elements.apiStatusBadge.textContent = 'Mock Engine Active';
      elements.apiStatusBadge.className = 'badge badge-warn';
    }
  } else {
    elements.modeStatus.textContent = 'Live AI Mode';
    elements.modeStatus.className = 'mode-badge live';
    elements.modeStatus.style.backgroundColor = 'var(--success-bg)';
    elements.modeStatus.style.color = 'var(--success)';
    
    if (elements.apiStatusBadge) {
      elements.apiStatusBadge.textContent = 'Connected (Gemini)';
      elements.apiStatusBadge.className = 'badge badge-success';
    }
  }
}

// Set up UI Event Handlers
function setupUI() {
  // Navigation Tab Toggles
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
      
      // Close sidebar drawer on mobile after selection
      if (elements.sidebar && elements.sidebar.classList.contains('open')) {
        elements.sidebar.classList.remove('open');
        elements.sidebarOverlay.classList.remove('active');
      }
    });
  });

  // Mobile Sidebar Toggle Controllers
  if (elements.sidebarToggle) {
    elements.sidebarToggle.addEventListener('click', () => {
      if (elements.sidebar) elements.sidebar.classList.toggle('open');
      if (elements.sidebarOverlay) elements.sidebarOverlay.classList.toggle('active');
    });
  }

  if (elements.sidebarOverlay) {
    elements.sidebarOverlay.addEventListener('click', () => {
      if (elements.sidebar) elements.sidebar.classList.remove('open');
      if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('active');
    });
  }

  // Active Crop selection
  elements.cropSelect.addEventListener('change', (e) => {
    state.selectedCrop = e.target.value;
    showToast(`Active crop changed to ${cropThresholds[state.selectedCrop].name}`, 'success');
    
    // Dispatch custom event to let other files know crop updated
    document.dispatchEvent(new CustomEvent('cropChanged', { detail: state.selectedCrop }));
  });

  // Dark/Light Theme Switch
  elements.themeToggle.addEventListener('click', () => {
    if (state.theme === 'dark') {
      state.theme = 'light';
      elements.body.classList.remove('dark-mode');
      elements.body.classList.add('light-mode');
      showToast('Switched to Light Mode', 'info');
    } else {
      state.theme = 'dark';
      elements.body.classList.remove('light-mode');
      elements.body.classList.add('dark-mode');
      showToast('Switched to Dark Mode', 'info');
    }
  });

  // API Key Saving (Settings Page)
  if (elements.btnSaveSettings) {
    elements.btnSaveSettings.addEventListener('click', () => {
      const key = elements.inputApiKey.value.trim();
      state.apiKey = key;
      localStorage.setItem('agrishield_gemini_key', key);
      
      if (key) {
        showToast('Gemini API Key saved locally!', 'success');
      } else {
        showToast('Gemini API Key removed. Reverting to Demo Mode.', 'warn');
      }
      
      checkApiHealth();
    });
  }

  // Pre-load saved API key into settings text box
  if (elements.inputApiKey && state.apiKey) {
    elements.inputApiKey.value = state.apiKey;
  }

  // Render current date
  const now = new Date();
  elements.dateDisplay.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Route navigation between tabs
export function switchTab(tabId) {
  state.activeTab = tabId;
  
  elements.navItems.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  elements.tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  // Custom event trigger
  document.dispatchEvent(new CustomEvent('tabSwitched', { detail: tabId }));
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  checkApiHealth();
});
