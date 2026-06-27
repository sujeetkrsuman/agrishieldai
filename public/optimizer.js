/* ==========================================
   AGRISHIELD AI - SOIL & WATER OPTIMIZER
   ========================================== */

import { state, cropThresholds, showToast } from './app.js';

// DOM Elements
const elements = {
  soilN: document.getElementById('soil-n'),
  soilP: document.getElementById('soil-p'),
  soilK: document.getElementById('soil-k'),
  soilPh: document.getElementById('soil-ph'),
  soilPhVal: document.getElementById('soil-ph-val'),
  btnCalculateSoil: document.getElementById('btn-calculate-soil'),
  soilReport: document.getElementById('soil-report'),

  optMoistDisplay: document.getElementById('opt-moist-display'),
  optTempDisplay: document.getElementById('opt-temp-display'),
  cropStage: document.getElementById('crop-stage'),
  btnCalculateWater: document.getElementById('btn-calculate-water'),
  waterReport: document.getElementById('water-report')
};

// Ideal N-P-K Values for Crops (mg/kg in soil)
const idealNutrients = {
  tomato: { n: [100, 150], p: [40, 60], k: [150, 250], ph: [6.0, 6.8] },
  potato: { n: [120, 160], p: [50, 70], k: [180, 280], ph: [5.0, 6.0] },
  corn:   { n: [140, 180], p: [30, 50], k: [120, 180], ph: [5.8, 7.0] },
  wheat:  { n: [90, 130],  p: [25, 45], k: [100, 150], ph: [6.0, 7.0] },
  rice:   { n: [100, 140], p: [20, 40], k: [80, 120],  ph: [5.5, 6.5] }
};

// Crop Stage Coefficients (Kc)
const stageCoefficients = {
  seedling: 0.45,
  vegetative: 0.85,
  flowering: 1.15,
  maturity: 0.60
};

// 1. SOIL OPTIMIZER ENGINE
function calculateNutrientBalance() {
  const cropKey = state.selectedCrop;
  const ideals = idealNutrients[cropKey];
  const cropName = cropThresholds[cropKey].name;

  const n = parseInt(elements.soilN.value) || 0;
  const p = parseInt(elements.soilP.value) || 0;
  const k = parseInt(elements.soilK.value) || 0;
  const ph = parseFloat(elements.soilPh.value) || 7.0;

  // Determine status for N, P, K
  const checkStatus = (val, range) => {
    if (val < range[0]) return 'Low';
    if (val > range[1]) return 'High';
    return 'Optimal';
  };

  const nStatus = checkStatus(n, ideals.n);
  const pStatus = checkStatus(p, ideals.p);
  const kStatus = checkStatus(k, ideals.k);

  let phStatus = 'Optimal';
  if (ph < ideals.ph[0]) phStatus = 'Acidic';
  if (ph > ideals.ph[1]) phStatus = 'Alkaline';

  // Build report HTML
  elements.soilReport.style.display = 'block';
  elements.soilReport.innerHTML = `
    <div class="soil-report-header">Soil Balance Report for ${cropName}</div>
    
    <div class="soil-indicator-row">
      <span>Nitrogen (N): <strong>${n} mg/kg</strong></span>
      <span class="badge ${getBadgeClass(nStatus)}">${nStatus}</span>
    </div>
    <div class="soil-indicator-row">
      <span>Phosphorus (P): <strong>${p} mg/kg</strong></span>
      <span class="badge ${getBadgeClass(pStatus)}">${pStatus}</span>
    </div>
    <div class="soil-indicator-row">
      <span>Potassium (K): <strong>${k} mg/kg</strong></span>
      <span class="badge ${getBadgeClass(kStatus)}">${kStatus}</span>
    </div>
    <div class="soil-indicator-row">
      <span>Soil pH level: <strong>${ph}</strong></span>
      <span class="badge ${getBadgeClass(phStatus)}">${phStatus}</span>
    </div>

    <div class="advisory-text-block">
      <h4>🌱 AgriShield Soil Stabilization Advice:</h4>
      <p style="margin-top: 6px;">${getNutrientAdvice(nStatus, pStatus, kStatus, phStatus, cropKey)}</p>
    </div>
  `;

  showToast('Soil chemistry calculations updated!', 'success');
}

function getBadgeClass(status) {
  if (status === 'Optimal') return 'badge-success';
  if (status === 'High' || status === 'Alkaline') return 'badge-warn';
  return 'badge-warn'; // Default warning badge style
}

function getNutrientAdvice(nStatus, pStatus, kStatus, phStatus, crop) {
  let advice = [];
  
  // Nitrogen adjustments
  if (nStatus === 'Low') {
    advice.push("Add organic compost, well-rotted manure, or organic nitrogen amendments (e.g., blood meal or fish emulsion) to boost vegetative foliage growth.");
  } else if (nStatus === 'High') {
    advice.push("Avoid additional nitrogen fertilizers; excessive nitrogen will trigger fast vine growth but delay flowering and yield.");
  }

  // Phosphorus adjustments
  if (pStatus === 'Low') {
    advice.push("Amend soil with bone meal or rock phosphate to support robust root systems and bloom initiation.");
  }

  // Potassium adjustments
  if (kStatus === 'Low') {
    advice.push("Apply organic potash, wood ash, or kelp meal to improve crop disease resilience and fruit size.");
  }

  // pH adjustments
  const ideals = idealNutrients[crop];
  if (phStatus === 'Acidic') {
    advice.push(`Your soil pH is too acidic. Apply agricultural lime (calcium carbonate) or dolomite lime to raise pH to target (${ideals.ph[0]}-${ideals.ph[1]}).`);
  } else if (phStatus === 'Alkaline') {
    advice.push(`Your soil pH is too alkaline. Apply agricultural elemental sulfur or organic peat moss to lower pH to target (${ideals.ph[0]}-${ideals.ph[1]}).`);
  }

  if (advice.length === 0) {
    return "All soil chemical inputs look excellent! No amendments are required at this time. Maintain healthy organic mulching.";
  }

  return advice.map((item, idx) => `${idx + 1}. ${item}`).join('<br><br>');
}

// 2. IRRIGATION CALCULATOR ENGINE
function calculateWaterBudget() {
  const cropKey = state.selectedCrop;
  const crop = cropThresholds[cropKey];
  
  // Inputs from simulated environment state
  const temp = state.environment.temperature;
  const moist = state.environment.moisture;
  const stage = elements.cropStage.value;
  const Kc = stageCoefficients[stage] || 0.8;

  // Evapotranspiration formula (mocked for simplicity and responsiveness)
  // ET0 = Temp * 0.15 (mm/day water loss)
  const ET0 = temp * 0.15;
  const ETc = ET0 * Kc; // Crop water need in mm/day

  // Convert mm/day to Liters needed per plant (assuming typical 0.5 sq meter canopy size)
  // 1 mm water over 1 sq meter = 1 liter. So canopy volume = ETc * 0.5 liters.
  let baseVolume = ETc * 0.5;

  let moistureStatus = 'Optimal';
  let adjustmentFactor = 1.0;

  if (moist < crop.minMoist) {
    moistureStatus = 'Dry';
    // Increase water to restore moisture deficit
    const moistureDeficit = crop.minMoist - moist;
    adjustmentFactor = 1.5 + (moistureDeficit / 15);
  } else if (moist > crop.maxMoist) {
    moistureStatus = 'Wet (Waterlogged)';
    adjustmentFactor = 0.0; // No watering needed
  } else {
    // Optimal moisture, just provide base maintenance water
    adjustmentFactor = 0.5;
  }

  const finalVolume = (baseVolume * adjustmentFactor).toFixed(2);
  
  // Calculate drip irrigation runtime
  // Assuming a standard drip emitter outputs 2.0 Liters per Hour (L/h)
  const runtimeMin = finalVolume > 0 ? Math.round((finalVolume / 2.0) * 60) : 0;

  // Build report HTML
  elements.waterReport.style.display = 'block';
  elements.waterReport.innerHTML = `
    <div class="water-report-header">Watering Advisor Result</div>
    
    <div class="info-row">
      <span>Soil Hydration Status:</span>
      <strong style="color: ${moistureStatus === 'Dry' ? 'var(--danger)' : 'var(--primary)'}">${moistureStatus}</strong>
    </div>
    
    <div class="info-row">
      <span>Calculated Evapotranspiration (ETc):</span>
      <strong>${ETc.toFixed(2)} mm/day</strong>
    </div>

    <div class="info-row" style="margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
      <span>Water Needed Today:</span>
      <strong style="font-size: 1.2rem; color: var(--primary);">${finalVolume} Liters / Plant</strong>
    </div>

    <div class="info-row">
      <span>Drip Emitter Runtime (2L/h):</span>
      <strong>${runtimeMin} minutes</strong>
    </div>

    <div class="advisory-text-block">
      <h4>💧 Scheduling Warning:</h4>
      <p style="margin-top: 4px;">
        ${getWateringAdvice(moistureStatus, temp, finalVolume)}
      </p>
    </div>
  `;

  showToast('Water requirements calculated!', 'success');
}

function getWateringAdvice(status, temp, volume) {
  if (volume === '0.00') {
    return "Soil moisture exceeds maximum optimal threshold. Turn off automatic watering valves to avoid root rot, damping-off, and fungal sporulation.";
  }
  
  let advice = `Apply the ${volume} liters of water early in the morning (5:00 AM - 8:00 AM) to minimize leaf surface wetness and evaporative loss.`;
  
  if (temp > 32) {
    advice += " High ambient temperatures detected. Consider split-application: 60% early morning and 40% late evening to lower root zone stress.";
  }

  if (status === 'Dry') {
    advice += " The soil is currently depleted. A deep watering is required to saturate the root zone. Check soil compaction before irrigating.";
  }

  return advice;
}

// Synchronize optimizer displays with active environment simulation values
function syncTelemetryDisplays() {
  elements.optMoistDisplay.textContent = `${state.environment.moisture}%`;
  elements.optTempDisplay.textContent = `${state.environment.temperature}°C`;
}

// Bind Events
function setupEvents() {
  elements.soilPh.addEventListener('input', (e) => {
    elements.soilPhVal.textContent = parseFloat(e.target.value).toFixed(1);
  });

  elements.btnCalculateSoil.addEventListener('click', calculateNutrientBalance);
  elements.btnCalculateWater.addEventListener('click', calculateWaterBudget);

  // Sync displays on tab switch to soil/optimizer
  document.addEventListener('tabSwitched', (e) => {
    if (e.detail === 'optimizer') {
      syncTelemetryDisplays();
    }
  });

  // Sync displays if crop is changed
  document.addEventListener('cropChanged', () => {
    if (state.activeTab === 'optimizer') {
      syncTelemetryDisplays();
      // Auto-recalculate if report already showing
      if (elements.soilReport.style.display === 'block') calculateNutrientBalance();
      if (elements.waterReport.style.display === 'block') calculateWaterBudget();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
});
