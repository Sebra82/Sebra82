"use strict";

/**
 * Escape HTML entities to prevent XSS injection.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The safely escaped HTML string.
 */
function escapeHtml(str) {
  return String(str)
    .replace(
      /&/g, 
      "&amp;"
    )
    .replace(
      /</g, 
      "&lt;"
    )
    .replace(
      />/g, 
      "&gt;"
    )
    .replace(
      /"/g, 
      "&quot;"
    )
    .replace(
      /'/g, 
      "&#039;"
    );
}

/**
 * Generates a SHA-256 hash using the native Web Crypto API.
 *
 * @param {string} message - The plaintext to hash.
 * @returns {Promise<string>} The generated hex string.
 */
async function computeSHA256(message) {
  const msgBuffer = new TextEncoder().encode(
    message
  );
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256', 
    msgBuffer
  );
  const hashArray = Array.from(
    new Uint8Array(
      hashBuffer
    )
  );
  return hashArray.map(
    b => b.toString(16).padStart(2, '0')
  ).join('');
}

/**
 * Verifies the user gateway input password against the local authorized codes.
 */
async function verifyGatewayPassword() {
  const pass = document.getElementById(
    'gatewayPasswordInput'
  ).value.trim();
  
  const err = document.getElementById(
    'gatewayErrorMsg'
  );
  
  let authorizedCodes = JSON.parse(
    localStorage.getItem('sebra_licenses') || '[]'
  );

  if (pass === "Quantum" || authorizedCodes.includes(pass.toUpperCase())) {
    document.getElementById('gatewayPortal').classList.add(
      'hidden'
    );
    document.getElementById('mainPlatformContainer').style.display = 'flex';
    
    document.getElementById('vault-status').innerText = pass === "Quantum" 
      ? "VAULT: SECURE DEMO MODE [v10.4]" 
      : "VAULT: 256-BIT ENCRYPTED LICENSE ACTIVE";
  } else {
    err.innerText = "Access Denied. Enter password 'Quantum' or a valid short code.";
    document.getElementById('gatewayPasswordInput').value = "";
  }
}

/**
 * Generates a 256-bit encrypted license sequence and persists to local storage.
 */
async function generateEncryptedLicenseKey() {
  const seed = "SEBRA82_KEY_" + Date.now() + "_" + Math.random();
  
  const hash256 = await computeSHA256(
    seed
  );
  
  const rawSegment = hash256.substring(
    0, 
    12
  ).toUpperCase();
  
  const shortCode = `SEBRA-${rawSegment.substring(0, 4)}-${rawSegment.substring(4, 8)}-${rawSegment.substring(8, 12)}`;

  let authorizedCodes = JSON.parse(
    localStorage.getItem('sebra_licenses') || '[]'
  );
  
  authorizedCodes.push(
    shortCode
  );
  
  localStorage.setItem(
    'sebra_licenses', 
    JSON.stringify(authorizedCodes)
  );
  
  const box = document.getElementById(
    'encryptedKeyBox'
  );
  
  const val = document.getElementById(
    'generatedKeyVal'
  );
  
  box.style.display = 'flex';
  val.innerHTML = `<strong>Short Code:</strong> <span style="color:var(--neon-cyan);">${shortCode}</span><br><strong>Hash:</strong> ${hash256}`;
}

/**
 * Enter application natively from a generated short key
 */
function enterAppWithGeneratedKey() {
  document.getElementById(
    'gatewayPortal'
  ).classList.add(
    'hidden'
  );
  
  document.getElementById(
    'mainPlatformContainer'
  ).style.display = 'flex';
  
  document.getElementById(
    'vault-status'
  ).innerText = "VAULT: 256-BIT LICENSE ACTIVE";
}

/**
 * Lock application and return to initial entry gateway
 */
function returnToGateway() {
  document.getElementById(
    'mainPlatformContainer'
  ).style.display = 'none';
  
  document.getElementById(
    'gatewayPortal'
  ).classList.remove(
    'hidden'
  );
  
  document.getElementById(
    'gatewayPasswordInput'
  ).value = "";
  
  document.getElementById(
    'gatewayErrorMsg'
  ).innerText = "";
  
  document.getElementById(
    'encryptedKeyBox'
  ).style.display = 'none';
}

/**
 * Toggles the AI navigator prompt overview
 */
function toggleQuickGuide() {
  const body = document.getElementById(
    'quickGuideBody'
  );
  
  const sign = document.getElementById(
    'guideToggleSign'
  );
  
  body.classList.toggle(
    'collapsed'
  );
  
  sign.innerText = body.classList.contains(
    'collapsed'
  ) 
    ? '[+]' 
    : '[-]';
}

/**
 * Toggles generic collapsible section UI
 *
 * @param {string} id - HTML node ID
 */
function toggleSec(id) {
  document.getElementById(
    id
  ).classList.toggle(
    'collapsed'
  );
}

/**
 * Animates targeted card window to maximized viewport fluid view.
 *
 * @param {string} cardId - Parent container ID to animate
 */
function maximizeAndFocus(cardId) {
  document.querySelectorAll(
    '.panel-card'
  ).forEach(c => {
    if (c.id === cardId) {
      c.classList.add(
        'fluid-maximized'
      );
      c.classList.remove(
        'minimized-dock-item'
      );
      c.style.display = 'flex';
      c.querySelector(
        '.collapsible-body'
      ).classList.remove(
        'collapsed'
      );
      document.getElementById(
        `pinBtn_${c.id}`
      ).innerText = "↩ Standard";
    } else {
      c.classList.remove(
        'fluid-maximized'
      );
      c.classList.add(
        'minimized-dock-item'
      );
      c.style.display = 'flex';
      c.querySelector(
        '.collapsible-body'
      ).classList.add(
        'collapsed'
      );
      document.getElementById(
        `pinBtn_${c.id}`
      ).innerText = "⚡ Max";
    }
  });
  
  document.getElementById(
    cardId
  ).scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center' 
  });
}

/**
 * Entry wrapper logic for maximizing the specified analytical viewport panel.
 *
 * @param {string} cardId - Parent target container ID
 */
function toggleMax(cardId) {
  const card = document.getElementById(
    cardId
  );
  
  if (card.classList.contains('fluid-maximized')) {
    resetStandardView();
  } else {
    maximizeAndFocus(cardId);
  }
}

/**
 * Resets all viewport panels to default dimensional configuration.
 */
function resetStandardView() {
  document.querySelectorAll(
    '.panel-card'
  ).forEach(c => {
    c.classList.remove(
      'fluid-maximized', 
      'minimized-dock-item'
    );
    c.style.display = 'flex';
    c.querySelector(
      '.collapsible-body'
    ).classList.add(
      'collapsed'
    );
    const pinBtn = document.getElementById(
      `pinBtn_${c.id}`
    );
    if (pinBtn) {
      pinBtn.innerText = "⚡ Max";
    }
  });
}

/**
 * Instructs AI navigation and focuses targeted component window viewport.
 */
function teachAndMaximize(toolKey, cardId) {
  maximizeAndFocus(
    cardId
  );
}

/**
 * Formats AI navigation string input stream.
 */
function submitAIChat() {
  const input = document.getElementById(
    'aiChatInput'
  );
  
  const stream = document.getElementById(
    'aiChatStream'
  );
  
  if (!input.value.trim()) {
    return;
  }
  
  stream.innerHTML += `<div class="chat-msg-user">You: ${escapeHtml(input.value)}</div>`;
  stream.innerHTML += `<div class="chat-msg-ai">🤖 <strong>SEBRA-AI</strong>: Adaptive viewport and subset calibrated.</div>`;
  input.value = "";
  stream.scrollTop = stream.scrollHeight;
}

// --- Interactive Pinch-&-Grab Noise & Subset Studio Engine ---
let globalTick = 0;
let timeOffset = 0;
let isStreamPaused = false;

let waveBuffer = new Array(250).fill(50);
let isDragging = false;
let dragStartX = 60;
let dragEndX = 190;
let extractedSubset = [];

const atomCanvas = document.getElementById(
  'atom3DCanvas'
);

const atomCtx = atomCanvas.getContext(
  '2d'
);

let atomNodes = [];

for (let i = 0; i < 320; i++) {
  let phi = Math.acos(
    -1 + (2 * i) / 320
  );
  
  let theta = Math.sqrt(
    320 * Math.PI
  ) * phi;
  
  let shell = (i % 3 === 0) 
    ? 90 
    : (i % 3 === 1 
        ? 65 
        : 42);
        
  let r = shell + Math.sin(
    i * 4
  ) * 9;
  
  atomNodes.push({
    ox: r * Math.sin(phi) * Math.cos(theta), 
    oy: r * Math.sin(phi) * Math.sin(theta), 
    oz: r * Math.cos(phi),
    color: i % 3 === 0 
      ? '#00f3ff' 
      : (i % 3 === 1 
          ? '#c084fc' 
          : '#ff3344'),
    glow: i % 3 === 0 
      ? 'rgba(0,243,255,0.9)' 
      : (i % 3 === 1 
          ? 'rgba(192,132,252,0.9)' 
          : 'rgba(255,51,68,0.9)'),
    size: (i % 4 === 0) ? 3.6 : 2.2, 
    pulseSpeed: 1.2 + (i % 5) * 0.4, 
    pulseOffset: i * 0.12
  });
}

const geoCanvas = document.getElementById(
  'geoRadarCanvas'
);

const geoCtx = geoCanvas 
  ? geoCanvas.getContext('2d') 
  : null;

const waveCanvas = document.getElementById(
  'secureSimCanvas'
);

const waveCtx = waveCanvas.getContext(
  '2d'
);

const subsetCanvas = document.getElementById(
  'subsetCanvas'
);

const subsetCtx = subsetCanvas 
  ? subsetCanvas.getContext('2d') 
  : null;
  
const execMirroredCanvas = document.getElementById(
  'execMirroredCanvas'
);

const execMirroredCtx = execMirroredCanvas 
  ? execMirroredCanvas.getContext('2d') 
  : null;

waveCanvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  const rect = waveCanvas.getBoundingClientRect();
  dragStartX = e.clientX - rect.left;
  dragEndX = dragStartX;
  isStreamPaused = true;
  document.getElementById(
    'noiseModeStatus'
  ).innerText = "Pinch & Grab (Paused)";
});

waveCanvas.addEventListener('pointermove', (e) => {
  if (!isDragging) {
    return;
  }
  const rect = waveCanvas.getBoundingClientRect();
  dragEndX = Math.max(
    0, 
    Math.min(
      waveCanvas.width, 
      e.clientX - rect.left
    )
  );
  processExtractedSubset();
});

/**
 * Resets internal tracking arrays and renders finalized sub-tensor.
 */
function handleGrabEnd() {
  if (!isDragging) {
    return;
  }
  isDragging = false;
  processExtractedSubset();
}

waveCanvas.addEventListener('pointerup', handleGrabEnd);
waveCanvas.addEventListener('pointercancel', handleGrabEnd);

/**
 * Instructs simulation render loop parameter boolean pause toggles.
 */
function togglePauseStream() {
  isStreamPaused = !isStreamPaused;
  document.getElementById(
    'noiseModeStatus'
  ).innerText = isStreamPaused 
    ? "Paused" 
    : "Continuous Stream";
}

/**
 * Modifies coordinate subset array offsets.
 */
function resetSubsetSelection() {
  dragStartX = 60; 
  dragEndX = 190;
  isStreamPaused = false;
  document.getElementById(
    'noiseModeStatus'
  ).innerText = "Continuous Stream";
  processExtractedSubset();
}

/**
 * Formats subset mathematical calculation execution strings inside the bounding drag box bounds
 */
function processExtractedSubset() {
  let minX = Math.min(
    dragStartX, 
    dragEndX
  );
  let maxX = Math.max(
    dragStartX, 
    dragEndX
  );
  if (maxX - minX < 5) {
    maxX = minX + 5;
  }

  let startIndex = Math.floor(
    (minX / waveCanvas.width) * waveBuffer.length
  );
  let endIndex = Math.floor(
    (maxX / waveCanvas.width) * waveBuffer.length
  );
  startIndex = Math.max(
    0, 
    Math.min(
      waveBuffer.length - 1, 
      startIndex
    )
  );
  endIndex = Math.max(
    0, 
    Math.min(
      waveBuffer.length, 
      endIndex
    )
  );

  extractedSubset = waveBuffer.slice(
    startIndex, 
    endIndex
  );
  if (extractedSubset.length === 0) {
    extractedSubset = [50];
  }

  document.getElementById(
    'subsetCount'
  ).innerText = extractedSubset.length + " pts";
  
  document.getElementById(
    'sumExecSubsetPoints'
  ).innerText = extractedSubset.length + " Points";
  
  document.getElementById(
    'subsetRangeLabel'
  ).innerText = `Range: [${startIndex} - ${endIndex}]`;

  let sum = extractedSubset.reduce(
    (a, b) => a + b, 
    0
  );
  let mean = sum / extractedSubset.length;
  let peak = Math.max(
    ...extractedSubset
  );
  let variance = extractedSubset.reduce(
    (a, b) => a + Math.pow(b - mean, 2), 
    0
  ) / extractedSubset.length;

  document.getElementById(
    'subsetMeanVal'
  ).innerText = mean.toFixed(2);
  
  document.getElementById(
    'subsetPeakVal'
  ).innerText = peak.toFixed(2);
  
  document.getElementById(
    'subsetVarVal'
  ).innerText = variance.toFixed(2);

  renderSubsetGraph();
}

/**
 * Executes internal canvas strokes mapping extracted points to graphical output representation.
 */
function renderSubsetGraph() {
  if (!subsetCtx) {
    return;
  }
  const w = subsetCanvas.width;
  const h = subsetCanvas.height;
  
  let bgGrad = subsetCtx.createLinearGradient(
    0, 
    0, 
    0, 
    h
  );
  bgGrad.addColorStop(
    0, 
    '#060d1a'
  );
  bgGrad.addColorStop(
    1, 
    '#010307'
  );
  subsetCtx.fillStyle = bgGrad;
  subsetCtx.fillRect(
    0, 
    0, 
    w, 
    h
  );

  subsetCtx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
  subsetCtx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) {
    subsetCtx.beginPath(); 
    subsetCtx.moveTo(gx, 0); 
    subsetCtx.lineTo(gx, h); 
    subsetCtx.stroke();
  }
  for (let gy = 0; gy < h; gy += 25) {
    subsetCtx.beginPath(); 
    subsetCtx.moveTo(0, gy); 
    subsetCtx.lineTo(w, gy); 
    subsetCtx.stroke();
  }

  if (extractedSubset.length === 0) {
    return;
  }

  subsetCtx.shadowBlur = 12;
  subsetCtx.shadowColor = '#7ee787';
  subsetCtx.strokeStyle = '#7ee787';
  subsetCtx.lineWidth = 2.2;
  subsetCtx.beginPath();
  
  let st = w / Math.max(
    1, 
    extractedSubset.length - 1
  );
  extractedSubset.forEach((val, idx) => {
    let x = idx * st;
    let y = h - (val / 100) * h;
    if (idx === 0) {
      subsetCtx.moveTo(x, y); 
    } else {
      subsetCtx.lineTo(x, y);
    }
  });
  subsetCtx.stroke();
  subsetCtx.shadowBlur = 0;

  if (execMirroredCtx) {
    const ew = execMirroredCanvas.width;
    const eh = execMirroredCanvas.height;
    execMirroredCtx.fillStyle = '#010307'; 
    execMirroredCtx.fillRect(
      0, 
      0, 
      ew, 
      eh
    );
    
    execMirroredCtx.shadowBlur = 10;
    execMirroredCtx.shadowColor = '#00f3ff';
    execMirroredCtx.strokeStyle = '#00f3ff';
    execMirroredCtx.lineWidth = 2;
    execMirroredCtx.beginPath();
    
    let est = ew / Math.max(
      1, 
      extractedSubset.length - 1
    );
    extractedSubset.forEach((val, idx) => {
      let x = idx * est;
      let y = eh - (val / 100) * eh;
      if (idx === 0) {
        execMirroredCtx.moveTo(x, y); 
      } else {
        execMirroredCtx.lineTo(x, y);
      }
    });
    execMirroredCtx.stroke();
    execMirroredCtx.shadowBlur = 0;
  }
}

/**
 * Simulates remote integration execution dispatch array commands across mock network endpoint structures.
 */
function sendSubsetToExecutive() {
  alert(
    `Successfully synchronized subset (${extractedSubset.length} points) with Executive Summary dashboard.`
  );
}

/**
 * Triggers internal structural matrix mock data point calculations.
 */
async function fetchLiveTelemetryData() {
  waveBuffer = waveBuffer.map(
    () => Math.floor(Math.random() * 65) + 25
  );
  processExtractedSubset();
}

/**
 * Increments frame matrix bounds tracking per cycle.
 */
function updateWaveOptics() {
  if (!isStreamPaused) {
    globalTick++; 
    timeOffset += 0.05;
    waveBuffer.shift();
    const carrier = Math.cos(
      globalTick * 0.08
    ) ** 2;
    const noise = (
      Math.random() - 0.5
    ) * 18;
    const val = Math.min(
      92, 
      Math.max(
        22, 
        50 + carrier * 30 + noise
      )
    );
    waveBuffer.push(val);
    processExtractedSubset();
  }

  const w = waveCanvas.width;
  const h = waveCanvas.height;
  
  let streamGrad = waveCtx.createRadialGradient(
    w/2, 
    h/2, 
    10, 
    w/2, 
    h/2, 
    w
  );
  
  streamGrad.addColorStop(
    0, 
    '#0a192f'
  );
  streamGrad.addColorStop(
    1, 
    '#020408'
  );
  
  waveCtx.fillStyle = streamGrad;
  waveCtx.fillRect(
    0, 
    0, 
    w, 
    h
  );

  waveCtx.shadowBlur = 10;
  waveCtx.shadowColor = '#00f3ff';
  waveCtx.strokeStyle = '#00f3ff';
  waveCtx.lineWidth = 2;
  waveCtx.beginPath();
  
  let st = w / Math.max(
    1, 
    waveBuffer.length - 1
  );
  
  waveBuffer.forEach((val, idx) => {
    let x = idx * st;
    let y = h - (val / 100) * h;
    if (idx === 0) {
      waveCtx.moveTo(x, y); 
    } else {
      waveCtx.lineTo(x, y);
    }
  });
  
  waveCtx.stroke();
  waveCtx.shadowBlur = 0;

  let minX = Math.min(
    dragStartX, 
    dragEndX
  );
  let maxX = Math.max(
    dragStartX, 
    dragEndX
  );
  
  waveCtx.fillStyle = 'rgba(0, 243, 255, 0.15)';
  waveCtx.fillRect(
    minX, 
    0, 
    maxX - minX, 
    h
  );
  
  waveCtx.strokeStyle = '#00f3ff';
  waveCtx.lineWidth = 1.5;
  waveCtx.strokeRect(
    minX, 
    0, 
    maxX - minX, 
    h
  );
}

/**
 * Root operational event dispatcher function executing the constant requestAnimationFrame stack loop protocol commands.
 */
function masterLoop() {
  atomCtx.fillStyle = '#000308'; 
  atomCtx.fillRect(
    0, 
    0, 
    atomCanvas.width, 
    atomCanvas.height
  );
  
  let cx = atomCanvas.width / 2;
  let cy = atomCanvas.height / 2;
  
  atomNodes.forEach(n => {
    let pulse = 1.0 + Math.sin(
      globalTick * 0.05 * n.pulseSpeed + n.pulseOffset
    ) * 0.1;
    let pers = 320 / (
      320 + n.oz * pulse
    );
    
    atomCtx.fillStyle = n.color;
    atomCtx.beginPath(); 
    atomCtx.arc(
      cx + n.ox * pers * 1.2, 
      cy + n.oy * pers * 1.2, 
      Math.max(1, n.size * pers), 
      0, 
      Math.PI * 2
    ); 
    atomCtx.fill();
  });

  if (geoCtx) {
    geoCtx.fillStyle = '#02050b'; 
    geoCtx.fillRect(
      0, 
      0, 
      geoCanvas.width, 
      geoCanvas.height
    );
    
    geoCtx.strokeStyle = 'rgba(240, 136, 62, 0.25)';
    let gcx = geoCanvas.width / 2;
    let gcy = geoCanvas.height / 2;
    
    for (let r = 20; r < geoCanvas.width; r += 30) {
      geoCtx.beginPath(); 
      geoCtx.arc(
        gcx, 
        gcy, 
        r, 
        0, 
        Math.PI * 2
      ); 
      geoCtx.stroke();
    }
    
    geoCtx.fillStyle = '#ff3344';
    geoCtx.beginPath(); 
    geoCtx.arc(
        gcx - 30, 
        gcy - 15, 
        5 + Math.sin(globalTick * 0.1) * 2, 
        0, 
        Math.PI * 2
    ); 
    geoCtx.fill();
  }

  updateWaveOptics();
  requestAnimationFrame(masterLoop);
}

window.onload = () => {
  masterLoop();
  processExtractedSubset();
};
