/* ==========================================
   AGRISHIELD AI - DASHBOARD LOGIC & TELEMETRY
   ========================================== */

import { state, cropThresholds, showToast } from './app.js';

// DOM Elements
const sliders = {
  temp: document.getElementById('sim-temp'),
  moist: document.getElementById('sim-moist'),
  humid: document.getElementById('sim-humid'),
  sun: document.getElementById('sim-sun')
};

const displays = {
  tempVal: document.getElementById('sim-temp-val'),
  moistVal: document.getElementById('sim-moist-val'),
  humidVal: document.getElementById('sim-humid-val'),
  sunVal: document.getElementById('sim-sun-val'),
  healthVal: document.getElementById('health-value'),
  healthDesc: document.getElementById('health-desc'),
  advisoryFeed: document.getElementById('advisory-feed'),
  forecastContainer: document.getElementById('forecast-container'),
  locationFetchBtn: document.getElementById('location-fetch-btn'),
  weatherLoc: document.getElementById('weather-loc'),
  weatherTemp: document.getElementById('weather-temp'),
  weatherCond: document.getElementById('weather-cond'),
  tempOptMarker: document.getElementById('temp-opt-marker'),
  moistOptMarker: document.getElementById('moist-opt-marker'),
  healthRing: document.getElementById('health-progress-ring')
};

// Progress Ring Geometry Calculation
const radius = 50;
const circumference = 2 * Math.PI * radius;

// Initialize Progress Ring
if (displays.healthRing) {
  displays.healthRing.style.strokeDasharray = `${circumference} ${circumference}`;
  displays.healthRing.style.strokeDashoffset = circumference;
}

function setHealthProgress(percent) {
  if (!displays.healthRing) return;
  const offset = circumference - (percent / 100) * circumference;
  displays.healthRing.style.strokeDashoffset = offset;
  
  // Dynamic color transition based on health
  if (percent >= 80) {
    displays.healthRing.style.stroke = 'var(--primary)';
  } else if (percent >= 50) {
    displays.healthRing.style.stroke = 'var(--warning)';
  } else {
    displays.healthRing.style.stroke = 'var(--danger)';
  }
}

// Calculate Crop Health Score & Advisories
export function evaluateCropHealth() {
  const crop = cropThresholds[state.selectedCrop];
  const temp = state.environment.temperature;
  const moist = state.environment.moisture;
  const humid = state.environment.humidity;
  const sun = state.environment.sunlight;

  let health = 100;
  const alerts = [];

  // 1. Evaluate Temperature
  if (temp < crop.minTemp) {
    const deficit = crop.minTemp - temp;
    health -= deficit * 2;
    alerts.push({
      type: 'warning',
      icon: '❄️',
      title: 'Sub-optimal Temperature (Low)',
      message: `Current temp (${temp}°C) is below optimal range for ${crop.name} (${crop.minTemp}-${crop.maxTemp}°C). Growth rate will slow down.`
    });
  } else if (temp > crop.maxTemp) {
    const excess = temp - crop.maxTemp;
    health -= excess * 2.5;
    alerts.push({
      type: 'danger',
      icon: '🔥',
      title: 'Thermal Stress (High Temp)',
      message: `Current temp (${temp}°C) exceeds optimal limit (${crop.maxTemp}°C). Crop is losing water rapidly. Soil evaporative loss is heightened.`
    });
  }

  // 2. Evaluate Soil Moisture
  if (moist < crop.minMoist) {
    const deficit = crop.minMoist - moist;
    health -= deficit * 1.5;
    alerts.push({
      type: 'danger',
      icon: '🏜️',
      title: 'Soil Hydric Stress (Dry)',
      message: `Soil moisture (${moist}%) is dangerously low. Optimal is ${crop.minMoist}-${crop.maxMoist}%. Target a water release of approx 2.5L/plant.`
    });
  } else if (moist > crop.maxMoist) {
    const excess = moist - crop.maxMoist;
    health -= excess * 1.2;
    alerts.push({
      type: 'warning',
      icon: '🌊',
      title: 'Waterlogging Risk (High Moisture)',
      message: `Soil moisture (${moist}%) exceeds optimal aeration threshold. Risk of root rot and late blight increases in waterlogged soil.`
    });
  }

  // 3. Evaluate Humidity + Temp combinations (Fungal Infection risks)
  if (humid > 80 && temp >= 18 && temp <= 26) {
    health -= 10;
    alerts.push({
      type: 'warning',
      icon: '🦠',
      title: 'High Pathogen Germination Risk',
      message: `Combination of high relative humidity (${humid}%) and cool temp (${temp}°C) creates ideal conditions for Late Blight (Phytophthora infestans). Inspect leaves for spots.`
    });
  }

  // Ensure health score limits
  health = Math.max(0, Math.min(100, Math.round(health)));

  // Update DOM Health UI
  displays.healthVal.textContent = `${health}%`;
  setHealthProgress(health);

  if (health >= 85) {
    displays.healthDesc.textContent = 'Excellent Condition';
    displays.healthDesc.style.color = 'var(--primary)';
  } else if (health >= 60) {
    displays.healthDesc.textContent = 'Moderate Stress';
    displays.healthDesc.style.color = 'var(--warning)';
  } else {
    displays.healthDesc.textContent = 'Critical Health Alert';
    displays.healthDesc.style.color = 'var(--danger)';
  }

  // If no negative alerts, push optimal advice card
  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      icon: '❇️',
      title: 'Ideal Crop Conditions',
      message: `All simulated telemetry (Temp: ${temp}°C, Soil Moist: ${moist}%) fall inside the optimal boundaries for ${crop.name}. Keep up the current maintenance schedule!`
    });
  }

  renderAdvisories(alerts);
}

// Render dynamic advisory items to sidebar list
function renderAdvisories(alerts) {
  displays.advisoryFeed.innerHTML = '';
  
  alerts.forEach(alert => {
    const item = document.createElement('div');
    item.className = `advisory-item ${alert.type}`;
    
    item.innerHTML = `
      <div class="advisory-icon">${alert.icon}</div>
      <div class="advisory-content">
        <h4>${alert.title}</h4>
        <p>${alert.message}</p>
      </div>
    `;
    displays.advisoryFeed.appendChild(item);
  });
}

// Generate weather forecast grid
function generateForecast() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const weatherIcons = ['☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️'];
  const weatherConds = ['Sunny', 'Mostly Sunny', 'Partly Cloudy', 'Showers', 'Rainy', 'Thunderstorm'];
  
  displays.forecastContainer.innerHTML = '';

  for (let i = 1; i <= 5; i++) {
    const dayName = days[(today + i) % 7];
    const randIndex = Math.floor(Math.random() * weatherIcons.length);
    const mockTemp = 24 + Math.floor(Math.random() * 8);
    
    const card = document.createElement('div');
    card.className = 'forecast-day-card';
    card.innerHTML = `
      <span class="day">${dayName}</span>
      <span class="icon" title="${weatherConds[randIndex]}">${weatherIcons[randIndex]}</span>
      <span class="temp">${mockTemp}°C</span>
    `;
    displays.forecastContainer.appendChild(card);
  }
}

// Handle Geolocation API Fetch
function initLocationFetch() {
  displays.locationFetchBtn.addEventListener('click', () => {
    displays.locationFetchBtn.textContent = 'Locating...';
    
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      displays.locationFetchBtn.textContent = '📍 Get Geolocation';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(2);
        const lon = position.coords.longitude.toFixed(2);
        
        showToast(`Location retrieved successfully!`, 'success');
        displays.weatherLoc.textContent = `Lat: ${lat}, Lon: ${lon} (Local)`;
        displays.locationFetchBtn.textContent = '📍 Location Updated';
        
        // Slightly vary simulated weather based on actual coordinates
        const localTemp = Math.round(22 + (Math.sin(lat) * 8));
        displays.weatherTemp.textContent = `${localTemp}°C`;
        displays.weatherCond.textContent = 'Cloudy / Humid';
        
        // Synchronize simulator with local temp
        sliders.temp.value = localTemp;
        displays.tempVal.textContent = `${localTemp}°C`;
        state.environment.temperature = localTemp;
        evaluateCropHealth();
      },
      (error) => {
        console.error('Geolocation Error:', error);
        showToast('Unable to fetch location. Using simulated local station.', 'warn');
        displays.locationFetchBtn.textContent = '📍 Get Geolocation';
      }
    );
  });
}

// Bind sliders to model values
function setupSimulators() {
  const updateCropMarkers = () => {
    const crop = cropThresholds[state.selectedCrop];
    displays.tempOptMarker.textContent = `Optimal Temp: ${crop.minTemp}-${crop.maxTemp}°C`;
    displays.moistOptMarker.textContent = `Optimal Soil Moisture: ${crop.minMoist}-${crop.maxMoist}%`;
  };

  sliders.temp.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    displays.tempVal.textContent = `${val}°C`;
    state.environment.temperature = val;
    evaluateCropHealth();
  });

  sliders.moist.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    displays.moistVal.textContent = `${val}%`;
    state.environment.moisture = val;
    evaluateCropHealth();
  });

  sliders.humid.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    displays.humidVal.textContent = `${val}%`;
    state.environment.humidity = val;
    evaluateCropHealth();
  });

  sliders.sun.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    let text = 'Moderate';
    if (val === 1) text = 'Low';
    if (val === 3) text = 'High';
    
    displays.sunVal.textContent = text;
    state.environment.sunlight = text.toLowerCase();
    evaluateCropHealth();
  });

  // Listen for crop selection changes to re-evaluate health & markers
  document.addEventListener('cropChanged', () => {
    updateCropMarkers();
    evaluateCropHealth();
  });

  // Settings Reset Handler
  document.addEventListener('DOMContentLoaded', () => {
    const btnReset = document.getElementById('btn-reset-simulation');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        sliders.temp.value = 26;
        sliders.moist.value = 65;
        sliders.humid.value = 68;
        sliders.sun.value = 2;
        
        displays.tempVal.textContent = '26°C';
        displays.moistVal.textContent = '65%';
        displays.humidVal.textContent = '68%';
        displays.sunVal.textContent = 'Moderate';
        
        state.environment = { temperature: 26, moisture: 65, humidity: 68, sunlight: 'moderate' };
        evaluateCropHealth();
        showToast('Telemetry parameters reset to defaults.', 'info');
      });
    }
  });

  // Run initial calculations
  updateCropMarkers();
  evaluateCropHealth();
}

// Initialize Dashboard Module
document.addEventListener('DOMContentLoaded', () => {
  setupSimulators();
  generateForecast();
  initLocationFetch();
});
