// ==========================================================================
// SEBRA82 v31.0 - Master Logic (User Custom Spacetime Shear Math Integrated)
// ==========================================================================

"use strict";

let targetAtomZoom = 1.0, targetAtomRotX = 0.4, targetAtomRotY = 0.2;
let currentAtomRotX = 0.4, currentAtomRotY = 0.2;
let isDraggingAtom = false, lastX = 0, lastY = 0;

window.GLOBALS = {
    isStreamPaused: false, globalTick: 0, timeOffset: 0.0,
    atomMode: 'calc', serverMatrix: [], noiseStructureActive: false,
    waveBuffer: new Array(150).fill({val: 50, spike: false}),
    analogOverlay: new Array(150).fill(50), 
    timeSeriesBuffer: [], isSummarizedMode: false,
    anomalyThreshold: 85, extractionHighlight: -1,
    finConfig: { baseValue: 10.0, damping: 1.45, mathMode: 'quantum' }
};

window.UTILS = {
    escapeHtml: function(str) { return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); },
    logSys: function(msg, isAlert=false) {
        const logger = document.getElementById('sysLogger'); if(!logger) return;
        const t = new Date().toISOString().split('T')[1].slice(0, -1);
        let colorStr = isAlert ? 'color: var(--warning-amber); border-color: var(--warning-amber);' : '';
        logger.innerHTML += `<div class="log-info" style="${colorStr}">[${t}] ${this.escapeHtml(msg)}</div>`;
        logger.scrollTop = logger.scrollHeight;
    },
    lerp: function(start, end, amt) { return (1 - amt) * start + amt * end; },
    generateHash: function(len=12) {
        const chars = '0123456789ABCDEF'; let result = '';
        for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }
};

window.AI = {
    currentPrediction: "", fullMatchedPhrase: "",
    dictionary: [ "zoom lattice", "run benchmark", "extract noise", "summarize monthly", "load 6 months", "export data", "maximize calculus", "inject noise struct", "run analog forecast", "hash ledger" ],
    getMatch: function(val) {
        const text = val.toLowerCase(); if (!text) return { remaining: "", full: "" };
        for (let phrase of this.dictionary) { if (phrase.startsWith(text) && phrase.length > text.length) return { remaining: phrase.slice(text.length), full: phrase }; }
        return { remaining: "", full: "" };
    },
    handleGhostInput: function(e) {
        const val = e.target.value; const match = this.getMatch(val);
        this.currentPrediction = match.remaining; this.fullMatchedPhrase = match.full;
        const ghost = document.getElementById('ghostOverlay');
        if (ghost) ghost.innerHTML = `<span style="opacity: 0;">${window.UTILS.escapeHtml(val)}</span>` + (this.currentPrediction ? `<span class="ghost-match">${window.UTILS.escapeHtml(this.currentPrediction)}</span>` : '');
    },
    submitChat: function() {
        const inputField = document.getElementById('aiChatInput'); if (!inputField) return;
        const query = inputField.value.trim().toLowerCase();
        if (!query) return;
        inputField.value = ""; document.getElementById('ghostOverlay').innerHTML = "";
        
        if (query.includes('zoom') || query.includes('lattice')) window.UI.toggleMax('cardAtom'); 
        else if (query.includes('bench') || query.includes('calc')) { window.UI.toggleMax('cardFin'); window.MATH.runBenchmark(); }
        else if (query.includes('noise') || query.includes('extract') || query.includes('analog')) window.UI.toggleMax('cardWave'); 
        else if (query.includes('ledger') || query.includes('summarize')) { window.UI.toggleMax('cardQuery'); if(query.includes('summarize')) window.DATA_INSIGHT.autoSummarize(); }
        else if (query.includes('load') || query.includes('workspace')) window.UI.toggleMax('cardTools'); 
        
        window.UTILS.logSys(`Synapse AI executed: [${query}]`);
        window.UI.toggleAiPanel(true);
    }
};

window.DATA_INSIGHT = {
    renderLedger: function() {
        const tbody = document.getElementById('queryTableBody'); 
        const thead = document.getElementById('tableHeaders');
        if (!tbody || !thead) return;
        
        const queryCountEl = document.getElementById('sumQueryCount');

        if (window.GLOBALS.isSummarizedMode) {
            thead.innerHTML = `<th>MONTH</th><th>TOTAL EVENTS</th><th>AVG MAGNITUDE</th>`;
            tbody.innerHTML = `
                <tr><td>August 2026</td><td style="color:var(--neon-cyan);">45</td><td style="color:var(--accent-green);">$84.20</td></tr>
                <tr><td>July 2026</td><td style="color:var(--neon-cyan);">112</td><td style="color:var(--accent-green);">$76.15</td></tr>
                <tr><td>June 2026</td><td style="color:var(--neon-cyan);">89</td><td style="color:var(--accent-green);">$62.90</td></tr>
            `;
            if (queryCountEl) queryCountEl.innerText = `3 Months Grouped`;
            return;
        }

        thead.innerHTML = `<th>EVENT ID</th><th>TIMESTAMP / DATE</th><th>CLASSIFICATION</th>`;
        let dataToRender = window.GLOBALS.timeSeriesBuffer;
        let reversedData = [...dataToRender].reverse().slice(0, 50);
        
        if(reversedData.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:12px; color:var(--text-muted);">No records in live ledger.</td></tr>`; 
            if (queryCountEl) queryCountEl.innerText = '0'; return; 
        }
        
        let htmlStr = '';
        reversedData.forEach((item) => {
            let catColor = item.cat.includes('ANOMALY') ? "var(--crimson-red)" : (item.cat.includes('EXTRACT') ? "var(--accent-purple)" : "var(--neon-cyan)");
            htmlStr += `<tr><td><span class="tx-hash">0x${item.hash}</span></td><td>${item.time}</td><td style="color:${catColor};">${item.cat} [Mag: ${item.val}]</td></tr>`;
        });
        tbody.innerHTML = htmlStr;
        if (queryCountEl) queryCountEl.innerText = `${dataToRender.length} rows`;
    },
    autoSummarize: function() {
        window.GLOBALS.isSummarizedMode = true;
        window.UTILS.logSys("Data Insight Engine: Auto-detected columns [TIMESTAMP, ID, MAGNITUDE].");
        window.UTILS.logSys("Data Insight Engine: Grouped historical events into Monthly Categories.");
        this.renderLedger();
    },
    resetToRaw: function() {
        window.GLOBALS.isSummarizedMode = false;
        this.renderLedger();
    },
    addExtractedPoint: function(val) {
        const time = new Date().toLocaleTimeString();
        window.GLOBALS.timeSeriesBuffer.push({ hash: window.UTILS.generateHash(8), time: time, val: val.toFixed(2), cat: 'MANUAL EXTRACTION' });
        this.renderLedger();
    },
    triggerExport: function() {
        let csvContent = "Event_ID,Timestamp,Classification,Magnitude\n";
        window.GLOBALS.timeSeriesBuffer.forEach(i => { csvContent += `0x${i.hash},${i.time},${i.cat},${i.val}\n`; });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "SEBRA82_Telemetry.csv";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
};

window.WORKSPACE = {
    currentPath: "/root/datasets",
    fs: { "/root": ["datasets", "exports"], "/root/datasets": ["paf_historical.bin", "welford_noise.csv"], "/root/exports": ["analog_v5.pdf"] },
    render: function() {
        const area = document.getElementById('explorerContentArea'); 
        const display = document.getElementById('currentPathDisplay'); 
        if (display) display.innerText = `📁 ${this.currentPath}`;
        if (!area) return;
        
        let html = `<div style="color:var(--text-muted); margin-bottom:8px;">Directory View:</div>`;
        (this.fs[this.currentPath] || []).forEach(f => {
            let isDir = !f.includes('.'); let icon = isDir ? '📁' : '📄';
            html += `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; display:flex; justify-content:space-between;" onclick="if('${isDir}'==='true') { window.WORKSPACE.openFolder('${this.currentPath}/${f}'); } else { window.WORKSPACE.viewHex('${f}'); }">
                <span>${icon} ${f}</span> <span style="color:var(--text-muted); font-size:0.55rem;">[${Math.floor(Math.random()*900)+10} KB]</span>
            </div>`;
        });
        area.innerHTML = html;
    },
    openFolder: function(path) { this.currentPath = path; this.render(); },
    navigateUp: function() { if (this.currentPath === "/root") return; let parts = this.currentPath.split('/'); parts.pop(); this.currentPath = parts.join('/') || "/root"; this.render(); },
    viewHex: function(fileName) {
        const area = document.getElementById('explorerContentArea'); if(!area) return;
        let html = `<div style="color:var(--warning-amber); margin-bottom:8px; display:flex; justify-content:space-between;"><span>Parsing: ${fileName}</span> <button class="pin-btn" onclick="window.WORKSPACE.render()" style="background:transparent; border:1px solid var(--text-muted); color:var(--text-main);">CLOSE</button></div>`;
        for(let i=0; i<6; i++) {
            let addr = (i * 16).toString(16).padStart(8, '0');
            let hex = ''; for(let j=0; j<8; j++) hex += window.UTILS.generateHash(2) + ' ';
            html += `<div class="hex-row"><div class="hex-addr">${addr}</div><div class="hex-data">${hex}</div></div>`;
        }
        area.innerHTML = html;
        window.UTILS.logSys(`File ${fileName} parsed into hex buffer.`);
    },
    connectLiveStream: function() {
        window.UTILS.logSys("Connecting to external Live Socket Stream...", true);
        setTimeout(() => {
            window.UTILS.logSys("Live Socket Connected. Simulating high-velocity injection.");
            window.GLOBALS.timeOffset += 100;
        }, 800);
    }
};

window.ACTIONS = {
    updateTimeSeriesAccumulator: function(val, type) {
        const time = new Date().toLocaleTimeString();
        window.GLOBALS.timeSeriesBuffer.push({ hash: window.UTILS.generateHash(8), time: time, val: val.toFixed(2), cat: type });
        if (window.GLOBALS.timeSeriesBuffer.length > 250) window.GLOBALS.timeSeriesBuffer.shift(); 
        if (type === 'ANOMALY') {
            let totalSpikes = window.GLOBALS.waveBuffer.filter(i => i.spike).length + 1; 
            const spikeLabel = document.getElementById('sumMetricSpikes');
            if (spikeLabel) spikeLabel.innerText = totalSpikes;
        }
        if(!window.GLOBALS.isSummarizedMode) window.DATA_INSIGHT.renderLedger();
    }
};

window.UI = {
    authenticateAndLaunch: function(tier) {
        document.getElementById('authGatewayModal').style.display = 'none';
        window.UTILS.logSys(`Cryptographic handshake verified. Core active.`);
        window.UI.triggerResize();
    },
    activeMaxId: null,
    toggleAiPanel: function(forceClose = false) {
        const aiBody = document.getElementById('aiBody');
        if(!aiBody) return;
        if(forceClose) aiBody.classList.add('collapsed');
        else aiBody.classList.toggle('collapsed');
        window.UI.triggerResize();
    },
    toggleMax: function(cardId) {
        if (this.activeMaxId === cardId) { this.resetStandardView(); return; }
        this.activeMaxId = cardId;
        document.getElementById('mobileStack')?.classList.add('has-maximized');
        document.querySelectorAll('.panel-card').forEach(c => {
            if(c.id === 'cardAi') return;
            if (c.id === cardId) {
                c.classList.add('fluid-maximized'); c.classList.remove('minimized-dock-item'); 
                c.querySelector('.collapsible-body')?.classList.remove('collapsed');
            } else {
                c.classList.remove('fluid-maximized'); c.classList.add('minimized-dock-item'); 
                c.querySelector('.collapsible-body')?.classList.add('collapsed');
            }
        });
        this.toggleAiPanel(true);
        window.UI.triggerResize();
    },
    resetStandardView: function() { 
        this.activeMaxId = null; 
        document.getElementById('mobileStack')?.classList.remove('has-maximized');
        document.querySelectorAll('.panel-card').forEach(c => {
            if(c.id === 'cardAi') return;
            c.classList.remove('fluid-maximized', 'minimized-dock-item');
            c.querySelector('.collapsible-body')?.classList.add('collapsed');
        });
        window.UI.triggerResize();
    },
    resizeCanvases: function() {
        document.querySelectorAll('.canvas-wrapper canvas').forEach(canvas => {
            const rect = canvas.parentElement.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                if (canvas.width !== rect.width || canvas.height !== rect.height) {
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                }
            }
        });
    },
    triggerResize: function() {
        this.resizeCanvases();
        setTimeout(() => this.resizeCanvases(), 50);
        setTimeout(() => this.resizeCanvases(), 150);
        setTimeout(() => this.resizeCanvases(), 300);
        setTimeout(() => this.resizeCanvases(), 400);
    }
};

window.MATH = {
    setMathMode: function(mode) { 
        window.GLOBALS.finConfig.mathMode = mode; 
        document.getElementById('modeBtnQuantum')?.classList.toggle('active', mode === 'quantum'); 
        document.getElementById('modeBtnFinancial')?.classList.toggle('active', mode === 'financial'); 
        const titleEl = document.getElementById('mathLiveTitle');
        if (titleEl) titleEl.innerText = mode === 'quantum' ? 'Dynamic Tensor State:' : 'Projected Alpha Rate:'; 
        this.updateInteractiveMathReadout(); 
    },
    updateInteractiveMathReadout: function() {
        let lastObj = window.GLOBALS.waveBuffer[window.GLOBALS.waveBuffer.length - 1];
        let dynamicMod = ((lastObj ? lastObj.val : 50) / 50) * window.GLOBALS.finConfig.damping;
        const resEl = document.getElementById('mathLiveResult');
        if (!resEl) return;
        
        if (window.GLOBALS.finConfig.mathMode === 'quantum') { 
            let rawAlpha = (0.75 + (window.GLOBALS.finConfig.baseValue / 50) * 0.25 * dynamicMod); 
            let normFactor = Math.sqrt(rawAlpha * rawAlpha + 0.25); 
            resEl.innerHTML = `|&psi;&gt; = ${(rawAlpha/normFactor).toFixed(3)}|00&gt;<br>+ ${(0.5/normFactor).toFixed(3)}|01&gt;`; 
        } else { 
            let roi = (window.GLOBALS.finConfig.baseValue * dynamicMod * 14.8).toFixed(2); 
            resEl.innerText = `P(Alpha) = ${roi} σ`; 
        }
    },
    runBenchmark: function() {
        const btn = document.getElementById('btnRunBench');
        if (btn) { btn.disabled = true; btn.innerText = "Computing Core..."; }
        setTimeout(() => {
            if (btn) { btn.disabled = false; btn.innerText = "Run Speed Benchmark"; }
            window.UTILS.logSys("Compute benchmark completed locally.");
        }, 1200);
    }
};

class CanvasRenderers {
    static drawGrid(ctx, w, h, color) { 
        ctx.strokeStyle = color; ctx.lineWidth = 0.5; ctx.beginPath(); 
        for(let x=0; x<w; x+=30) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } 
        for(let y=0; y<h; y+=20) { ctx.moveTo(0, y); ctx.lineTo(w, y); } 
        ctx.stroke(); 
    }

    // 🚨 USER CUSTOM MATH: Anisotropic Spacetime Matrix 🚨
    static renderAtom() {
        const canvas = document.getElementById('atom3DCanvas'); 
        const ctx = canvas ? canvas.getContext('2d') : null;
        if(!ctx || !canvas.width || !canvas.height) return;
        const w = canvas.width, h = canvas.height; 
        ctx.clearRect(0, 0, w, h); 
        this.drawGrid(ctx, w, h, 'rgba(0, 243, 255, 0.04)');
        
        let cx = w / 2, cy = h / 2; 

        // Smoothly interpolate slider zoom
        targetAtomZoom = window.UTILS.lerp(targetAtomZoom, parseFloat(document.getElementById('atomZoomSlider')?.value || 1.0), 0.12);
        targetAtomRotX = window.UTILS.lerp(targetAtomRotX, currentAtomRotX, 0.1);
        targetAtomRotY = window.UTILS.lerp(targetAtomRotY, currentAtomRotY, 0.1);

        // Auto-rotation
        if (!isDraggingAtom) { 
            currentAtomRotY += 0.005; 
            currentAtomRotX += 0.0015; 
        }
        
        // Exact User Geometric Generation
        if (window.GLOBALS.serverMatrix.length === 0) {
            let nodes = [];
            // 1. S-orbital core 
            for (let i = 0; i < 180; i++) { 
                let theta = Math.random() * 2 * Math.PI;
                let phi = Math.acos(2 * Math.random() - 1);
                let r = 0.35 * Math.cbrt(Math.random());
                nodes.push([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta), 'core']);
            }
            // 2. p_z orbital lobes 
            for (let i = 0; i < 800; i++) { 
                let theta = Math.random() * 2 * Math.PI;
                let phi = Math.acos(2 * Math.random() - 1);
                let lobe = Math.cos(phi);
                let r = 2.0 * Math.abs(lobe) * (0.8 + 0.4 * Math.random()) + 0.4;
                nodes.push([r * Math.sin(phi) * Math.cos(theta), r * lobe, r * Math.sin(phi) * Math.sin(theta), 'cloud']);
            }
            // 3. Boundary Wave Rings 
            for (let r = 0; r < 3; r++) {
                let rad = 2.4 + r * 0.4;
                for (let i = 0; i < 40; i++) {
                    let theta = (2 * Math.PI * i) / 40;
                    nodes.push([rad * Math.cos(theta), 0, rad * Math.sin(theta), 'ring']);
                }
            }
            window.GLOBALS.serverMatrix = nodes;
        }

        const size = 100 * targetAtomZoom;
        const cosY = Math.cos(currentAtomRotY);
        const sinY = Math.sin(currentAtomRotY);
        const cosX = Math.cos(currentAtomRotX);
        const sinX = Math.sin(currentAtomRotX);

        // Exact User Projection Math
        let projected = window.GLOBALS.serverMatrix.map((node) => {
            let x = node[0], y = node[1], z = node[2], type = node[3];

            // 🚨 Exact User Spacetime Shear Math (Tied to UI Tab) 🚨
            if (window.GLOBALS.noiseStructureActive) {
                if (y < 0) { y *= 1.9; } else { y *= 0.2; }
            }

            let x1 = x * cosY - z * sinY;
            let rz1 = x * sinY + z * cosY;
            let rx1 = x1;

            let ry2 = y * cosX - rz1 * sinX;
            let rz2 = y * sinX + rz1 * cosX;

            let depth = 3 / (rz2 + 3);
            return [cx + rx1 * size * depth, cy + ry2 * size * depth, type, rz2];
        });

        // Exact User Ring Connecting Lines
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        let ringStartIndex = window.GLOBALS.serverMatrix.findIndex(p => p[3] === 'ring');
        if (ringStartIndex !== -1) {
            for (let r = 0; r < 3; r++) {
                ctx.beginPath();
                for (let i = 0; i < 40; i++) {
                    let idx = ringStartIndex + (r * 40) + i;
                    if (i === 0) ctx.moveTo(projected[idx][0], projected[idx][1]);
                    else ctx.lineTo(projected[idx][0], projected[idx][1]);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }

        // Sort by Z to prevent rendering overlap weirdness
        let sortedDots = [...projected].sort((a, b) => b[3] - a[3]);

        // Exact User Particle Rendering & Colors
        sortedDots.forEach(([px, py, type]) => {
            if (type === 'core') {
                ctx.fillStyle = '#00ffcc';
                ctx.beginPath(); ctx.arc(px, py, Math.max(2.0, 2.5 * targetAtomZoom / 2), 0, Math.PI * 2); ctx.fill();
            } else if (type === 'cloud') {
                ctx.fillStyle = 'rgba(255, 105, 225, 0.95)';
                ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, 1.5 * targetAtomZoom / 3), 0, Math.PI * 2); ctx.fill();
            } else if (type === 'ring') {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
                ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, 1.5 * targetAtomZoom / 3), 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    static renderContinuousGraph() {
        const canvas = document.getElementById('predictiveForecastCanvas'); 
        const ctx = canvas ? canvas.getContext('2d') : null;
        if(!ctx || !canvas.width || !canvas.height) return;
        
        const w = canvas.width, h = canvas.height; 
        ctx.clearRect(0, 0, w, h); 
        this.drawGrid(ctx, w, h, 'rgba(0, 243, 255, 0.04)');

        let threshVal = parseFloat(document.getElementById('anomalyThreshold')?.value || 85);
        const threshReadout = document.getElementById('threshReadout');
        if (threshReadout) threshReadout.innerText = threshVal + "%";

        if (!window.GLOBALS.isStreamPaused) { 
            window.GLOBALS.globalTick++; window.GLOBALS.timeOffset += 0.05; 
            let val = Math.min(100, Math.max(0, 50 + Math.sin(window.GLOBALS.globalTick * 0.04 + window.GLOBALS.timeOffset * 2) * 25 + (Math.random() * 8 - 4)));
            
            let isSpike = val >= threshVal || val <= (100 - threshVal);
            if (isSpike && Math.random() > 0.5) window.ACTIONS.updateTimeSeriesAccumulator(val, 'ANOMALY');

            window.GLOBALS.waveBuffer.shift(); 
            window.GLOBALS.waveBuffer.push({val: val, spike: isSpike});
            
            window.GLOBALS.analogOverlay.shift();
            let analogVal = val + Math.sin(window.GLOBALS.globalTick * 0.02) * 12 + (Math.random() * 4 - 2);
            window.GLOBALS.analogOverlay.push(analogVal);

            window.MATH.updateInteractiveMathReadout();
        }

        let st = w / Math.max(1, window.GLOBALS.waveBuffer.length - 1);
        
        // PAF Overlay
        ctx.beginPath(); 
        ctx.moveTo(0, h - (window.GLOBALS.analogOverlay[0] * (h / 100)));
        for (let i = 0; i < window.GLOBALS.analogOverlay.length - 1; i++) { 
            let xPos = i * st, yPos = h - (window.GLOBALS.analogOverlay[i] * (h / 100)); 
            let nextX = (i + 1) * st, nextY = h - (window.GLOBALS.analogOverlay[i + 1] * (h / 100)); 
            ctx.quadraticCurveTo(xPos, yPos, (xPos + nextX) / 2, (yPos + nextY) / 2);
        } 
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)'; ctx.lineWidth = 1.0; ctx.stroke();

        // Main Live Noise Wave
        ctx.beginPath(); 
        ctx.moveTo(0, h - (window.GLOBALS.waveBuffer[0].val * (h / 100)));
        for (let i = 0; i < window.GLOBALS.waveBuffer.length - 1; i++) { 
            let xPos = i * st, yPos = h - (window.GLOBALS.waveBuffer[i].val * (h / 100)); 
            let nextX = (i + 1) * st, nextY = h - (window.GLOBALS.waveBuffer[i + 1].val * (h / 100)); 
            ctx.quadraticCurveTo(xPos, yPos, (xPos + nextX) / 2, (yPos + nextY) / 2);
        } 
        ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2.0; ctx.stroke();
        
        // Spikes
        window.GLOBALS.waveBuffer.forEach((pt, i) => {
            if (pt.spike) {
                let x = i * st, y = h - (pt.val * (h / 100));
                ctx.fillStyle = '#ff3344'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff3344';
                ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
            }
        });

        // Extracted Point Highlight
        if (window.GLOBALS.extractionHighlight >= 0) {
            let hx = window.GLOBALS.extractionHighlight * st;
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.8)'; ctx.lineWidth = 2.0; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, h); ctx.stroke(); ctx.setLineDash([]);
            if (!window.GLOBALS.isStreamPaused) window.GLOBALS.extractionHighlight -= 1;
        }
    }
}

// 🚨 FULLY RESTORED EVENT BINDINGS 🚨
function bindAllEvents() {
    window.addEventListener('resize', () => window.UI.triggerResize());

    // AI Keyboard Trigger
    document.getElementById('aiChatInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.AI.submitChat();
    });

    // Accordion Logic
    document.querySelectorAll('.panel-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.pin-btn')) return; 
            const card = header.closest('.panel-card');
            if (!card || card.classList.contains('fluid-maximized') || card.classList.contains('minimized-dock-item')) return;
            const body = card.querySelector('.collapsible-body');
            if(body) { body.classList.toggle('collapsed'); window.UI.triggerResize(); }
        });
    });

    // Maximize/Minimize Logic
    document.querySelectorAll('.pin-btn').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); window.UI.toggleMax(el.closest('.panel-card').id); }); });
    document.querySelectorAll('.panel-card').forEach(card => { card.addEventListener('click', (e) => { if(card.classList.contains('minimized-dock-item')) window.UI.toggleMax(card.id); }); });

    // Top Action Bar
    document.getElementById('btnResetView')?.addEventListener('click', () => window.UI.resetStandardView());
    document.getElementById('btnPauseStream')?.addEventListener('click', (e) => { window.GLOBALS.isStreamPaused = !window.GLOBALS.isStreamPaused; e.target.innerText = window.GLOBALS.isStreamPaused ? "▶ RESUME" : "⏸ PAUSE"; });
    document.getElementById('btnGenRandom')?.addEventListener('click', () => window.ACTIONS.updateTimeSeriesAccumulator((Math.random()*80)+20, 'NOISE INJECT'));

    // Atom Tab Logic (Shear UI Hook)
    document.querySelectorAll('#atomTabs .cat-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation(); 
            document.querySelectorAll('#atomTabs .cat-chip').forEach(c => c.classList.remove('active')); 
            chip.classList.add('active');
            let mode = chip.getAttribute('data-atom-mode');
            window.GLOBALS.atomMode = mode;
            if (mode === 'sci') {
                window.GLOBALS.noiseStructureActive = true;
                document.getElementById('noiseStructReadout').innerText = "SHEAR: ACTIVE (90% UP)";
                document.getElementById('noiseStructReadout').style.color = "var(--warning-amber)";
            } else {
                window.GLOBALS.noiseStructureActive = false;
                document.getElementById('noiseStructReadout').innerText = "SHEAR: INACTIVE";
                document.getElementById('noiseStructReadout').style.color = "rgba(255,255,255,0.4)";
            }
        });
    });

    // Math Studio Controls
    document.getElementById('modeBtnQuantum')?.addEventListener('click', () => window.MATH.setMathMode('quantum'));
    document.getElementById('modeBtnFinancial')?.addEventListener('click', () => window.MATH.setMathMode('financial'));
    document.getElementById('baseValueSlider')?.addEventListener('input', (e) => { window.GLOBALS.finConfig.baseValue = parseFloat(e.target.value); document.getElementById('baseValueReadout').innerText = window.GLOBALS.finConfig.baseValue.toFixed(2); });
    document.getElementById('dampingSlider')?.addEventListener('input', (e) => { window.GLOBALS.finConfig.damping = parseFloat(e.target.value); document.getElementById('dampingReadout').innerText = window.GLOBALS.finConfig.damping.toFixed(2); });
    document.getElementById('btnRunBench')?.addEventListener('click', () => window.MATH.runBenchmark());

    // Query Data Filters
    document.getElementById('filtAll')?.addEventListener('click', () => window.DATA_INSIGHT.resetToRaw());

    // Time-Series Point Extraction
    const predCanvas = document.getElementById('predictiveForecastCanvas');
    if (predCanvas) {
        predCanvas.addEventListener('click', (e) => {
            const rect = predCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.floor((x / rect.width) * window.GLOBALS.waveBuffer.length);
            if (window.GLOBALS.waveBuffer[idx]) {
                window.GLOBALS.extractionHighlight = idx;
                const pt = window.GLOBALS.waveBuffer[idx].val;
                window.UTILS.logSys(`[Time-Grab] Extracted noise coordinates. Magnitude: ${pt.toFixed(2)}`);
                window.DATA_INSIGHT.addExtractedPoint(pt);
            }
        });
    }

    // Ledger Engine Buttons
    document.getElementById('btnSummarizeMonth')?.addEventListener('click', () => window.DATA_INSIGHT.autoSummarize());
    document.getElementById('btnDownloadExport')?.addEventListener('click', () => window.DATA_INSIGHT.triggerExport());
    document.getElementById('btnClearLedger')?.addEventListener('click', () => { window.GLOBALS.timeSeriesBuffer = []; window.DATA_INSIGHT.renderLedger(); });

    // Workspace Nav
    document.getElementById('btnNavUp')?.addEventListener('click', () => window.WORKSPACE.navigateUp());
    document.getElementById('btnConnectLive')?.addEventListener('click', () => window.WORKSPACE.connectLiveStream());

    // 3D Canvas Drag Logic
    const atomCanvas = document.getElementById('atom3DCanvas');
    if(atomCanvas) {
        atomCanvas.addEventListener('pointerdown', (e) => { isDraggingAtom = true; lastX = e.clientX; lastY = e.clientY; atomCanvas.setPointerCapture(e.pointerId); e.preventDefault(); });
        atomCanvas.addEventListener('pointermove', (e) => { 
            if (isDraggingAtom) { 
                let dx = (e.clientX - lastX) * 0.012; let dy = (e.clientY - lastY) * 0.012;
                currentAtomRotY += dx; currentAtomRotX -= dy; lastX = e.clientX; lastY = e.clientY; 
            } e.preventDefault(); 
        });
        atomCanvas.addEventListener('pointerup', (e) => { isDraggingAtom = false; try { atomCanvas.releasePointerCapture(e.pointerId); } catch(err) {} });
    }
}

function masterLoop() { 
    CanvasRenderers.renderAtom(); 
    CanvasRenderers.renderContinuousGraph(); 
    requestAnimationFrame(masterLoop); 
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.panel-card').forEach(c => c.classList.remove('minimized-dock-item'));
    bindAllEvents(); 
    window.WORKSPACE.render();
    masterLoop(); 
    window.MATH.updateInteractiveMathReadout(); 
    window.DATA_INSIGHT.renderLedger();
    window.UI.triggerResize(); 
});
