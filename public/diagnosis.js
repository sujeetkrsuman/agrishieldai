/* ==========================================
   AGRISHIELD AI - PLANT DIAGNOSIS CONTROLLER
   ========================================== */

import { state, showToast, switchTab } from './app.js';

// DOM Elements
const elements = {
  btnModeUpload: document.getElementById('btn-mode-upload'),
  btnModeCamera: document.getElementById('btn-mode-camera'),
  dropZone: document.getElementById('drop-zone'),
  cameraZone: document.getElementById('camera-zone'),
  previewZone: document.getElementById('preview-zone'),
  fileInput: document.getElementById('file-input'),
  imagePreview: document.getElementById('image-preview'),
  webcamVideo: document.getElementById('webcam-video'),
  photoCanvas: document.getElementById('photo-canvas'),
  btnCapture: document.getElementById('btn-capture'),
  btnStopCamera: document.getElementById('btn-stop-camera'),
  btnResetPreview: document.getElementById('btn-reset-preview'),
  btnRunDiagnosis: document.getElementById('btn-run-diagnosis'),
  
  resultPlaceholder: document.getElementById('result-placeholder'),
  resultLoading: document.getElementById('result-loading'),
  diagnosticReport: document.getElementById('diagnostic-report'),
  
  // Report fields
  reportCrop: document.getElementById('report-crop'),
  reportDisease: document.getElementById('report-disease'),
  reportScientific: document.getElementById('report-scientific'),
  reportConfidence: document.getElementById('report-confidence'),
  reportSeverity: document.getElementById('report-severity'),
  reportDescription: document.getElementById('report-description'),
  reportOrganicList: document.getElementById('report-organic-list'),
  reportChemicalList: document.getElementById('report-chemical-list'),
  reportPreventionList: document.getElementById('report-prevention-list'),
  
  btnExportPdf: document.getElementById('btn-export-pdf'),
  btnChatWithAdvisor: document.getElementById('btn-chat-with-advisor'),
  
  sampleCards: document.querySelectorAll('.sample-card')
};

let selectedImageFile = null;
let selectedImageName = null;
let cameraStream = null;
let diagnosticReportData = null; // Stores last diagnosis data

// 1. INPUT MODE SWITCHING (UPLOAD VS CAMERA)
function initInputModeSelectors() {
  elements.btnModeUpload.addEventListener('click', () => {
    elements.btnModeUpload.classList.add('active');
    elements.btnModeCamera.classList.remove('active');
    elements.dropZone.style.display = 'flex';
    elements.cameraZone.style.display = 'none';
    elements.previewZone.style.display = 'none';
    stopCamera();
  });

  elements.btnModeCamera.addEventListener('click', () => {
    elements.btnModeCamera.classList.add('active');
    elements.btnModeUpload.classList.remove('active');
    elements.dropZone.style.display = 'none';
    elements.cameraZone.style.display = 'flex';
    elements.previewZone.style.display = 'none';
    startCamera();
  });
}

// 2. CAMERA FLOWS
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: 640, height: 480 },
      audio: false
    });
    elements.webcamVideo.srcObject = cameraStream;
    showToast('Webcam turned on', 'info');
  } catch (error) {
    console.error('Camera Access Error:', error);
    showToast('Unable to open camera. Falling back to File Upload mode.', 'error');
    elements.btnModeUpload.click();
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

if (elements.btnStopCamera) {
  elements.btnStopCamera.addEventListener('click', () => {
    stopCamera();
    elements.btnModeUpload.click();
  });
}

elements.btnCapture.addEventListener('click', () => {
  if (!cameraStream) return;
  
  const width = elements.webcamVideo.videoWidth;
  const height = elements.webcamVideo.videoHeight;
  elements.photoCanvas.width = width;
  elements.photoCanvas.height = height;
  
  const ctx = elements.photoCanvas.getContext('2d');
  ctx.drawImage(elements.webcamVideo, 0, 0, width, height);
  
  // Convert canvas to blob
  elements.photoCanvas.toBlob((blob) => {
    selectedImageFile = blob;
    selectedImageName = `captured_leaf_${Date.now()}.jpg`;
    
    // Display preview
    const dataUrl = elements.photoCanvas.toDataURL('image/jpeg');
    elements.imagePreview.src = dataUrl;
    
    elements.cameraZone.style.display = 'none';
    elements.previewZone.style.display = 'flex';
    stopCamera();
  }, 'image/jpeg');
});

// 3. FILE UPLOAD DRAG/DROP FLOWS
function initDragAndDrop() {
  elements.dropZone.addEventListener('click', () => elements.fileInput.click());

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageSelection(e.target.files[0]);
    }
  });

  elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.style.borderColor = 'var(--primary)';
  });

  elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.style.borderColor = 'var(--border-color)';
  });

  elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length > 0) {
      handleImageSelection(e.dataTransfer.files[0]);
    }
  });
}

function handleImageSelection(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Invalid file format. Please upload an image.', 'error');
    return;
  }

  selectedImageFile = file;
  selectedImageName = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    elements.imagePreview.src = e.target.result;
    elements.dropZone.style.display = 'none';
    elements.previewZone.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

// Reset preview and revert to original input layout
elements.btnResetPreview.addEventListener('click', () => {
  selectedImageFile = null;
  selectedImageName = null;
  elements.fileInput.value = '';
  elements.previewZone.style.display = 'none';
  
  if (elements.btnModeCamera.classList.contains('active')) {
    elements.cameraZone.style.display = 'flex';
    startCamera();
  } else {
    elements.dropZone.style.display = 'flex';
  }
});

// 4. SAMPLE IMAGES CAROUSEL FLOW
function initSampleCarousel() {
  elements.sampleCards.forEach(card => {
    card.addEventListener('click', () => {
      const sampleType = card.getAttribute('data-sample');
      const imgEl = card.querySelector('img');
      
      // Load sample image as dummy blob/file
      fetch(imgEl.src)
        .then(res => res.blob())
        .then(blob => {
          selectedImageFile = blob;
          selectedImageName = `sample_${sampleType}_leaf.jpg`;
          elements.imagePreview.src = imgEl.src;
          
          elements.btnModeUpload.classList.add('active');
          elements.btnModeCamera.classList.remove('active');
          elements.cameraZone.style.display = 'none';
          elements.dropZone.style.display = 'none';
          elements.previewZone.style.display = 'flex';
          stopCamera();
          
          showToast(`Loaded ${sampleType} leaf sample image!`, 'info');
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to fetch sample image.', 'error');
        });
    });
  });
}

// 5. SERVER API DIAGNOSIS EXECUTION
elements.btnRunDiagnosis.addEventListener('click', async () => {
  if (!selectedImageFile) {
    showToast('Please upload or capture a leaf image first', 'warn');
    return;
  }

  // Toggle Loading Screen
  elements.resultPlaceholder.style.display = 'none';
  elements.diagnosticReport.style.display = 'none';
  elements.resultLoading.style.display = 'flex';
  
  try {
    const formData = new FormData();
    formData.append('image', selectedImageFile);
    formData.append('crop', state.selectedCrop);
    formData.append('imageName', selectedImageName);

    const headers = {};
    if (state.apiKey) {
      headers['Authorization'] = `Bearer ${state.apiKey}`;
    }

    const response = await fetch('/api/diagnose', {
      method: 'POST',
      body: formData,
      headers: headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server diagnostic execution error');
    }

    const report = await response.json();
    diagnosticReportData = report; // cache data
    renderDiagnosticReport(report);
    showToast('Diagnosis completed successfully!', 'success');
  } catch (error) {
    console.error('Diagnosis request failed:', error);
    showToast(`Diagnostic failed: ${error.message}`, 'error');
    
    // Reset back to placeholder
    elements.resultLoading.style.display = 'none';
    elements.resultPlaceholder.style.display = 'flex';
  }
});

// 6. RENDER THE STRUCTURED REPORT ON THE RIGHT CARD
function renderDiagnosticReport(data) {
  elements.resultLoading.style.display = 'none';
  elements.diagnosticReport.style.display = 'flex';

  // Core properties
  elements.reportCrop.textContent = data.crop || 'Unknown Crop';
  elements.reportDisease.textContent = data.disease || 'Healthy Leaf';
  elements.reportScientific.textContent = data.scientificName || 'N/A';
  
  // Confidence score formatting
  const confPercent = Math.round((data.confidence || 0.85) * 100);
  elements.reportConfidence.textContent = `${confPercent}%`;
  
  // Severity classes
  const sev = (data.severity || 'None').toLowerCase();
  elements.reportSeverity.textContent = data.severity || 'None';
  elements.reportSeverity.className = `severity-badge ${sev}`;
  
  elements.reportDescription.textContent = data.description || '';

  // Remedies lists
  elements.reportOrganicList.innerHTML = '';
  if (data.remedies && data.remedies.organic) {
    data.remedies.organic.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      elements.reportOrganicList.appendChild(li);
    });
  }

  elements.reportChemicalList.innerHTML = '';
  if (data.remedies && data.remedies.chemical) {
    data.remedies.chemical.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      elements.reportChemicalList.appendChild(li);
    });
  }

  // Prevention list
  elements.reportPreventionList.innerHTML = '';
  if (data.prevention) {
    data.prevention.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      elements.reportPreventionList.appendChild(li);
    });
  }
}

// 7. ADDITIONAL UTILITIES (PDF EXPORT & DISCUSS CHAT WIDGET)
elements.btnExportPdf.addEventListener('click', () => {
  if (!diagnosticReportData) return;
  
  const reportWindow = window.open('', '_blank');
  const dateStr = new Date().toLocaleDateString();
  
  const reportHtml = `
    <html>
      <head>
        <title>AgriShield AI Diagnostic Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
          .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #10b981; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; background: #f3f4f6; padding: 15px; border-radius: 8px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 16px; font-weight: bold; color: #059669; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 6px; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge.high { background: #fee2e2; color: #ef4444; }
          .badge.medium { background: #fef3c7; color: #f59e0b; }
          .badge.low { background: #d1fae5; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">AgriShield AI - Pathology Diagnostic Report</div>
          <div style="font-size: 12px; color: #6b7280;">Generated on: ${dateStr}</div>
          <div class="meta-grid">
            <div><strong>Active Crop:</strong> ${diagnosticReportData.crop}</div>
            <div><strong>Pathogen Diagnosis:</strong> ${diagnosticReportData.disease}</div>
            <div><strong>Scientific Classification:</strong> ${diagnosticReportData.scientificName}</div>
            <div><strong>Confidence Score:</strong> ${Math.round(diagnosticReportData.confidence * 100)}%</div>
            <div><strong>Severity Rating:</strong> <span class="badge ${diagnosticReportData.severity.toLowerCase()}">${diagnosticReportData.severity}</span></div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Pathology Description & Symptoms</div>
          <p>${diagnosticReportData.description}</p>
        </div>

        <div class="section">
          <div class="section-title">Organic Remediation Remedies</div>
          <ul>
            ${diagnosticReportData.remedies.organic.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <div class="section-title">Chemical Pesticide Application</div>
          <ul>
            ${diagnosticReportData.remedies.chemical.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <div class="section">
          <div class="section-title">Agricultural Prevention Strategies</div>
          <ul>
            ${diagnosticReportData.prevention.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-top: 50px; font-size: 11px; color: #9ca3af; text-align: center;">
          AgriShield Agentic Agriculture System • Powered by Google Gemini AI
        </div>
      </body>
    </html>
  `;
  
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
  reportWindow.print();
});

// Links diagnostic report into chat agent tab
elements.btnChatWithAdvisor.addEventListener('click', () => {
  if (!diagnosticReportData) return;
  
  const customQuery = `My ${diagnosticReportData.crop} crop has been diagnosed with ${diagnosticReportData.disease}. What are the next steps for treatment?`;
  
  // Switch to chat tab
  switchTab('chat');
  
  // Inject text query into chat controller input box and trigger event
  const chatInput = document.getElementById('chat-text-input');
  if (chatInput) {
    chatInput.value = customQuery;
    showToast('Injected query into chat advisor!', 'info');
  }
});

// Initialize module
document.addEventListener('DOMContentLoaded', () => {
  initInputModeSelectors();
  initDragAndDrop();
  initSampleCarousel();
});
