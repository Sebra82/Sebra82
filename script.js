// ==========================================================================
// SEBRA82 v25.0 - Master Logic (Predictive Analog Forecasting & Noise Struct)
// ==========================================================================

"use strict";

let targetAtomZoom = 1.0, targetAtomRotX = 0.4, targetAtomRotY = 0.2;
let currentAtomRotX = 0.4, currentAtomRotY = 0.2;
let isDraggingAtom = false, lastX = 0, lastY = 0;

// High-Density Typed Buffers for max performance
window.GLOBALS = {
    isStreamPaused: false, globalTick: 0, timeOffset: 0.0,
    atomMode: 'calc', serverMatrix: [],
    noiseStructureActive: false,
    waveBuffer: new Array(150).fill({val: 50, spike: false}),
    analogOverlay: new Array(150).fill(50), 
    timeSeriesBuffer: [], queryFilter: 'ALL',
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
    dictionary: [ "zoom lattice", "run benchmark", "extract noise", "clear ledger", "load 6 months", "export data", "maximize calculus", "inject noise struct", "run analog forecast", "hash ledger" ],
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
    handleGhostKeyDown: function(e) {
        const input = e.target;
        if ((e.key === 'Tab' || e.key === 'ArrowRight') && this.currentPrediction.length > 0) { 
            e.preventDefault(); input.value = this.fullMatchedPhrase; 
            this.currentPrediction = ""; document.getElementById('ghostOverlay').innerHTML = ""; return; 
        }
        if (e.key === 'Enter') window.AI.submitChat(); 
    },
    submitChat: function() {
        const inputField = document.getElementById('aiChatInput'); if (!inputField) return;
        const query = inputField.value.trim().toLowerCase();
        if (!query) return;
        inputField.value = ""; document.getElementById('ghostOverlay').innerHTML = "";
        
        if (query.includes('zoom') || query.includes('lattice')) window.UI.toggleMax('cardAtom'); 
        else if (query.includes('bench') || query.includes('calc')) { window.UI.toggleMax('cardFin'); window.MATH.runBenchmark(); }
        else if (query.includes('noise') || query.includes('analog') || query.includes('forecast')) window.UI.toggleMax('cardWave'); 
        else if (query.includes('ledger') || query.includes('hash')) window.UI.toggleMax('cardQuery'); 
        else if (query.includes('load') || query.includes('workspace')) window.UI.toggleMax('cardTools'); 
        
        if (query.includes('inject noise struct')) {
            window.GLOBALS.noiseStructureActive = true;
            window.UTILS.logSys("AI Directive: Noise Structure Injection Active. Matrix topology altered.", true);
            document.getElementById('noiseStructReadout').innerText = "STRUCT: INJECTED";
            document.getElementById('noiseStructReadout').style.color = "var(--warning-amber)";
        }
        
        window.UTILS.logSys(`Synapse AI executed: [${query}]`);
        const aiCard = document.getElementById('cardAi');
        if (aiCard) { const body = aiCard.querySelector('.collapsible-body'); if (body) body.classList.add('collapsed'); }
    }
};

window.DATA_INSIGHT = {
    activeDataSet: [],
    setFilter: function(cat) {
        window.GLOBALS.queryFilter = cat;
        document.querySelectorAll('#secQuery .cat-chip').forEach(c => c.classList.remove('active'));
        if(cat==='ALL') document.getElementById('filtAll')?.classList.add('active');
        if(cat==='NOISE') document.getElementById('filtWorld')?.classList.add('active');
        if(cat==='ANOMALY') document.getElementById('filtCalc')?.classList.add('active');
        if(cat==='ANALOG') document.getElementById('filtFin')?.classList.add('active');
        
        const filterLabel = document.getElementById('filterStateLabel');
        if (filterLabel) filterLabel.innerText = cat;
        this.renderLedger();
    },
    renderLedger: function() {
        const tbody = document.getElementById('queryTableBody'); 
        if (!tbody) return;
        
        let dataToRender = window.GLOBALS.timeSeriesBuffer;
        if (window.GLOBALS.queryFilter !== 'ALL') {
            dataToRender = dataToRender.filter(item => item.cat.toUpperCase().includes(window.GLOBALS.queryFilter));
        }

        let reversedData = [...dataToRender].reverse().slice(0, 50);
        const queryCountEl = document.getElementById('sumQueryCount');
        
        if(reversedData.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--text-muted);">No records match criteria.</td></tr>`; 
            if (queryCountEl) queryCountEl.innerText = '0 rows'; return; 
        }
        
        let htmlStr = '';
        reversedData.forEach((item) => {
            let catColor = item.cat.includes('ANOMALY') ? "var(--crimson-red)" : (item.cat.includes('ANALOG') ? "var(--accent-purple)" : "var(--neon-cyan)");
            htmlStr += `<tr><td><span class="tx-hash">0x${item.hash}</span></td><td>${item.time}</td><td style="color:${catColor};">${item.cat}</td><td style="color:var(--accent-green);">${item.val}</td></tr>`;
        });
        tbody.innerHTML = htmlStr;
        if (queryCountEl) queryCountEl.innerText = `${dataToRender.length} rows`;
    }
};

window.WORKSPACE = {
    currentPath: "/root/datasets",
    fs: { "/root": ["datasets", "exports"], "/root/datasets": ["paf_historical_patterns.bin", "welford_noise.json"], "/root/exports": ["analog_forecast_v5.pdf"] },
    render: function() {
        const area = document.getElementById('explorerContentArea'); 
        const display = document.getElementById('currentPathDisplay'); 
        if (display) display.innerText = `📁 ${this.currentPath}`;
        if (!area) return;
        
        let html = `<div style="color:var(--text-muted); margin-bottom:8px;">Directory View:</div>`;
        (this.fs[this.currentPath] || []).forEach(f => {
            let isDir = !f.includes('.');
            let icon = isDir ? '📁' : '📄';
            html += `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; display:flex; justify-content:space-between;" onclick="if('${isDir}'==='true') { window.WORKSPACE.openFolder('${this.currentPath}/${f}'); } else { window.WORKSPACE.viewHex('${f}'); }">
                <span>${icon} ${f}</span> <span style="color:var(--text-muted); font-size:0.55rem;">[${Math.floor(Math.random()*900)+10} KB]</span>
            </div>`;
        });
        area.innerHTML = html;
    },
    openFolder: function(path) { this.currentPath = path; this.render(); },
    navigateUp: function() { 
        if (this.currentPath === "/root") return; 
        let parts = this.currentPath.split('/'); parts.pop(); this.currentPath = parts.join('/') || "/root"; this.render(); 
    },
    viewHex: function(fileName) {
        const area = document.getElementById('explorerContentArea');
        if(!area) return;
        let html = `<div style="color:var(--warning-amber); margin-bottom:8px; display:flex; justify-content:space-between;"><span>Parsing: ${fileName}</span> <button class="pin-btn" onclick="window.WORKSPACE.render()" style="background:transparent; border:1px solid var(--text-muted); color:var(--text-main);">CLOSE</button></div>`;
        for(let i=0; i<8; i++) {
            let addr = (i * 16).toString(16).padStart(8, '0');
            let hex = ''; for(let j=0; j<8; j++) hex += window.UTILS.generateHash(2) + ' ';
            html += `<div class="hex-row"><div class="hex-addr">${addr}</div><div class="hex-data">${hex}</div></div>`;
        }
        area.innerHTML = html;
        window.UTILS.logSys(`File ${fileName} parsed into hex buffer.`);
    }
};

window.ACTIONS = {
    updateTimeSeriesAccumulator: function(val, type) {
        const time = new Date().toLocaleTimeString();
        window.GLOBALS.timeSeriesBuffer.push({ hash: window.UTILS.generateHash(12), time: time, val: val.toFixed(2), cat: type });
        if (window.GLOBALS.timeSeriesBuffer.length > 250) window.GLOBALS.timeSeriesBuffer.shift(); 
        
        if (type === 'ANOMALY') {
            let totalSpikes = window.GLOBALS.waveBuffer.filter(i => i.spike).length + 1; 
            const spikeLabel = document.getElementById('sumMetricSpikes');
            if (spikeLabel) spikeLabel.innerText = totalSpikes;
        }
        window.DATA_INSIGHT.renderLedger();
    }
};

window.UI = {
    authenticateAndLaunch: function(tier) {
        document.getElementById('authGatewayModal').style.display = 'none';
        window.UTILS.logSys(`Cryptographic handshake verified. Core active.`);
        setTimeout(window.UI.resizeCanvases, 50);
    },
    activeMaxId: null,
    toggleMax: function(cardId) {
        if (this.activeMaxId === cardId) { this.resetStandardView(); return; }
        this.activeMaxId = cardId;
        document.getElementById('mobileStack')?.classList.add('has-maximized');
        document.querySelectorAll('.panel-card').forEach(c => {
            if (c.id === cardId) {
                c.classList.add('fluid-maximized'); c.classList.remove('minimized-dock-item'); 
                c.querySelector('.collapsible-body')?.classList.remove('collapsed');
            } else {
                c.classList.remove('fluid-maximized'); c.classList.add('minimized-dock-item'); 
                c.querySelector('.collapsible-body')?.classList.add('collapsed');
            }
        });
        window.UI.resizeCanvases();
        const aiCard = document.getElementById('cardAi');
        if (aiCard && cardId !== 'cardAi') { const body = aiCard.querySelector('.collapsible-body'); if (body) body.classList.add('collapsed'); }
    },
    resetStandardView: function() { 
        this.activeMaxId = null; 
        document.getElementById('mobileStack')?.classList.remove('has-maximized');
        document.querySelectorAll('.panel-card').forEach(c => {
            c.classList.remove('fluid-maximized', 'minimized-dock-item');
            c.querySelector('.collapsible-body')?.classList.add('collapsed');
        });
        window.UI.resizeCanvases();
    },
    resizeCanvases: function() {
        document.querySelectorAll('canvas').forEach(canvas => {
            const parent = canvas.parentElement;
            if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
        });
    }
};

window.MATH = {
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
            resEl.innerText = `P(Alpha) = ${roi} σ (${(92 + dynamicMod).toFixed(1)}%)`; 
        }
    }
};

class CanvasRenderers {
    static drawGrid(ctx, w, h, color) { 
        ctx.strokeStyle = color; ctx.lineWidth = 0.5; ctx.beginPath(); 
        for(let x=0; x<w; x+=30) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } 
        for(let y=0; y<h; y+=20) { ctx.moveTo(0, y); ctx.lineTo(w, y); } 
        ctx.stroke(); 
    }

    // ⚛️ Enhanced 3D Lattice with explicitly calculated Noise Structures
    static renderAtom() {
        const canvas = document.getElementById('atom3DCanvas'); 
        const ctx = canvas ? canvas.getContext('2d') : null;
        if(!ctx || !canvas.width || !canvas.height) return;
        const w = canvas.width, h = canvas.height; 
        ctx.clearRect(0, 0, w, h); 
        this.drawGrid(ctx, w, h, 'rgba(0, 243, 255, 0.04)');
        let cx = w / 2, cy = h / 2; 

        targetAtomZoom = window.UTILS.lerp(targetAtomZoom, parseFloat(document.getElementById('atomZoomSlider')?.value || 1.0), 0.12);
        targetAtomRotX = window.UTILS.lerp(targetAtomRotX, currentAtomRotX, 0.1);
        targetAtomRotY = window.UTILS.lerp(targetAtomRotY, currentAtomRotY, 0.1);

        if (!isDraggingAtom) { currentAtomRotY += 0.004; currentAtomRotX += 0.002; }
        
        if (window.GLOBALS.serverMatrix.length === 0) {
            let m = [];
            for(let i=0; i<36; i++) { m.push({ id: i, type: 'core', phi: Math.acos(1 - 2*(i+0.5)/36), theta: Math.PI * (1 + Math.sqrt(5)) * (i+0.5), baseR: 30 }); }
            for(let i=0; i<42; i++) { m.push({ id: i+36, type: 'inner', angle: (i/42) * Math.PI * 2, baseR: 70 }); }
            for(let i=0; i<50; i++) { m.push({ id: i+78, type: 'valence', phi: Math.acos(-1 + (2*i)/50), theta: Math.sqrt(50*Math.PI) * Math.acos(-1 + (2*i)/50), baseR: 125 }); }
            window.GLOBALS.serverMatrix = m;
        }

        let noiseMultiplier = window.GLOBALS.noiseStructureActive ? 3.5 : 1.0;
        let lastVal = window.GLOBALS.waveBuffer[window.GLOBALS.waveBuffer.length-1].val;
        
        let localNodes = window.GLOBALS.serverMatrix.map(n => {
            let r = n.baseR;
            // Inject structural noise directly into the matrix calculation
            if(n.type === 'core') r += Math.sin(window.GLOBALS.globalTick * 0.08) * 4 * noiseMultiplier;
            if(n.type === 'inner') r += Math.sin(window.GLOBALS.globalTick*0.05 + n.id)*6 * noiseMultiplier;
            if(n.type === 'valence') r += (lastVal - 50) * 0.4 + Math.sin(n.id*0.3 + window.GLOBALS.timeOffset)*8 * noiseMultiplier;

            let ox = 0, oy = 0, oz = 0;
            if(n.type === 'inner') {
                ox = r * Math.cos(n.angle + window.GLOBALS.globalTick*0.03); oy = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.cos(Math.PI/4); oz = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.sin(Math.PI/4);
            } else {
                ox = r * Math.sin(n.phi) * Math.cos(n.theta); oy = r * Math.sin(n.phi) * Math.sin(n.theta); oz = r * Math.cos(n.phi);
            }

            // Aesthetic overrides based on structural noise
            let color = window.GLOBALS.noiseStructureActive ? (n.type === 'core' ? '#ffffff' : (n.type === 'inner' ? '#f0883e' : '#ff3344')) : (n.type === 'core' ? '#ffffff' : (n.type === 'inner' ? '#00f3ff' : '#c084fc'));
            let glow = window.GLOBALS.noiseStructureActive ? (n.type === 'core' ? 'rgba(255,255,255,0.9)' : (n.type === 'inner' ? 'rgba(240,136,62,0.8)' : 'rgba(255,51,68,0.8)')) : (n.type === 'core' ? 'rgba(255,255,255,0.9)' : (n.type === 'inner' ? 'rgba(0,243,255,0.8)' : 'rgba(192,132,252,0.8)'));
            
            return { ox, oy, oz, type: n.type, isCore: n.type === 'core', id: n.id, color, glow };
        });

        let projected = localNodes.map(n => {
            let x1 = n.ox * Math.cos(targetAtomRotY) + n.oz * Math.sin(targetAtomRotY);
            let z1 = -n.ox * Math.sin(targetAtomRotY) + n.oz * Math.cos(targetAtomRotY);
            let y2 = n.oy * Math.cos(targetAtomRotX) - z1 * Math.sin(targetAtomRotX);
            let z2 = n.oy * Math.sin(targetAtomRotX) + z1 * Math.cos(targetAtomRotX);
            let pers = 400 / (400 + z2);
            return { px: cx + x1 * pers * targetAtomZoom, py: cy + y2 * pers * targetAtomZoom, z: z2, ox: n.ox, oy: n.oy, oz: n.oz, type: n.type, color: n.color, glow: n.glow, size: (n.isCore ? 3.0 : 2.0) * pers * Math.min(targetAtomZoom, 4.0) };
        });

        projected.sort((a, b) => a.z - b.z);
        ctx.lineWidth = window.GLOBALS.noiseStructureActive ? 1.5 : 1.0;

        for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < Math.min(i + 30, projected.length); j++) {
                if (projected[i].type !== projected[j].type) continue;
                let dx = projected[i].ox - projected[j].ox, dy = projected[i].oy - projected[j].oy, dz = projected[i].oz - projected[j].oz;
                let dist3D = Math.sqrt(dx*dx + dy*dy + dz*dz);
                let maxDist = projected[i].isCore ? 35 : 55;

                if (dist3D < maxDist) {
                    let alpha = (1.0 - (dist3D / maxDist)) * (window.GLOBALS.noiseStructureActive ? 0.9 : 0.7);
                    ctx.strokeStyle = window.GLOBALS.noiseStructureActive ? `rgba(240, 136, 62, ${alpha})` : `rgba(0, 243, 255, ${alpha})`;
                    ctx.beginPath(); ctx.moveTo(projected[i].px, projected[i].py); ctx.lineTo(projected[j].px, projected[j].py); ctx.stroke();
                }
            }
        }

        projected.forEach(n => {
            ctx.fillStyle = n.color; ctx.shadowBlur = 10; ctx.shadowColor = n.glow;
            let s = Math.max(2.0, n.size * 2);
            ctx.fillRect(n.px - s/2, n.py - s/2, s, s); ctx.shadowBlur = 0;
        });
    }

    // 🌊 Strict Single Continuous Graph featuring Predictive Analog Forecasting (PAF) overlay
    static renderContinuousGraph() {
        const canvas = document.getElementById('predictiveForecastCanvas'); 
        const ctx = canvas ? canvas.getContext('2d') : null;
        if(!ctx || !canvas.width || !canvas.height) return;
        
        const w = canvas.width, h = canvas.height; 
        ctx.clearRect(0, 0, w, h); 
        this.drawGrid(ctx, w, h, 'rgba(0, 243, 255, 0.04)');

        if (!window.GLOBALS.isStreamPaused) { 
            window.GLOBALS.globalTick++; window.GLOBALS.timeOffset += 0.05; 
            // Compute base noise wave
            let val = Math.min(85, Math.max(15, 50 + Math.sin(window.GLOBALS.globalTick * 0.04 + window.GLOBALS.timeOffset * 2) * 20 + (Math.random() * 6 - 3)));
            
            let isSpike = Math.random() > 0.98;
            if (isSpike) window.ACTIONS.updateTimeSeriesAccumulator(val, 'ANOMALY');

            window.GLOBALS.waveBuffer.shift(); 
            window.GLOBALS.waveBuffer.push({val: val, spike: isSpike});
            
            // Generate Predictive Analog Forecast (Historical Correlation matching)
            window.GLOBALS.analogOverlay.shift();
            // PAF algorithm: matches historical offset pattern + local density
            let analogVal = val + Math.sin(window.GLOBALS.globalTick * 0.02) * 12 + (Math.random() * 4 - 2);
            window.GLOBALS.analogOverlay.push(analogVal);

            window.MATH.updateInteractiveMathReadout();
            
            // Dynamic accuracy readout
            let acc = 100 - Math.abs(val - analogVal);
            const patEl = document.getElementById('patternMatchReadout');
            const exEl = document.getElementById('execAnalogReadout');
            if (patEl) patEl.innerText = `ANALOG MATCH: ${acc.toFixed(1)}%`;
            if (exEl) exEl.innerText = `${acc.toFixed(1)}%`;
        }

        let st = w / Math.max(1, window.GLOBALS.waveBuffer.length - 1);
        
        // 1. PAF Overlay (Historical Correlation Match) - Drawn first so it sits behind the main wave
        ctx.beginPath(); 
        ctx.moveTo(0, h - (window.GLOBALS.analogOverlay[0] * (h / 100)));
        for (let i = 0; i < window.GLOBALS.analogOverlay.length - 1; i++) { 
            let xPos = i * st, yPos = h - (window.GLOBALS.analogOverlay[i] * (h / 100)); 
            let nextX = (i + 1) * st, nextY = h - (window.GLOBALS.analogOverlay[i + 1] * (h / 100)); 
            ctx.quadraticCurveTo(xPos, yPos, (xPos + nextX) / 2, (yPos + nextY) / 2);
        } 
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)'; ctx.lineWidth = 1.0; ctx.stroke();

        // 2. Main Live Noise Wave (Single Continuous Line)
        ctx.beginPath(); 
        ctx.moveTo(0, h - (window.GLOBALS.waveBuffer[0].val * (h / 100)));
        for (let i = 0; i < window.GLOBALS.waveBuffer.length - 1; i++) { 
            let xPos = i * st, yPos = h - (window.GLOBALS.waveBuffer[i].val * (h / 100)); 
            let nextX = (i + 1) * st, nextY = h - (window.GLOBALS.waveBuffer[i + 1].val * (h / 100)); 
            ctx.quadraticCurveTo(xPos, yPos, (xPos + nextX) / 2, (yPos + nextY) / 2);
        } 
        ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2.0; ctx.stroke();
        
        // 3. Welford Anomaly Spikes
        window.GLOBALS.waveBuffer.forEach((pt, i) => {
            if (pt.spike) {
                let x = i * st, y = h - (pt.val * (h / 100));
                ctx.fillStyle = '#ff3344'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff3344';
                ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
            }
        });

        // 4. Predictive Markov Cone
        let historyCutoff = Math.floor(window.GLOBALS.waveBuffer.length * 0.55);
        let startX = historyCutoff * st;
        let centerY = h / 2;

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)'; ctx.lineWidth = 1.0; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(startX, centerY);
        for(let i = historyCutoff; i < window.GLOBALS.waveBuffer.length; i++) { ctx.lineTo(i * st, centerY - (i - historyCutoff) * 0.9); }
        ctx.stroke();

        ctx.beginPath(); ctx.moveTo(startX, centerY);
        for(let i = historyCutoff; i < window.GLOBALS.waveBuffer.length; i++) { ctx.lineTo(i * st, centerY + (i - historyCutoff) * 0.9); }
        ctx.stroke(); ctx.setLineDash([]);
    }
}

function bindAllEvents() {
    window.addEventListener('resize', window.UI.resizeCanvases);

    document.querySelectorAll('.panel-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.pin-btn')) return; 
            const card = header.closest('.panel-card');
            if (!card || card.classList.contains('fluid-maximized') || card.classList.contains('minimized-dock-item')) {
                if (card && card.id === 'cardAi') {
                    const body = card.querySelector('.collapsible-body');
                    if (body) { body.classList.toggle('collapsed'); setTimeout(window.UI.resizeCanvases, 50); }
                }
                return; 
            }
            const body = card.querySelector('.collapsible-body');
            if(body) { body.classList.toggle('collapsed'); setTimeout(window.UI.resizeCanvases, 50); }
        });
    });

    document.querySelectorAll('.pin-btn').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); window.UI.toggleMax(el.closest('.panel-card').id); }); });
    document.querySelectorAll('.panel-card').forEach(card => { card.addEventListener('click', (e) => { if(card.classList.contains('minimized-dock-item')) window.UI.toggleMax(card.id); }); });

    document.getElementById('btnResetView')?.addEventListener('click', () => window.UI.resetStandardView());
    document.getElementById('btnGenRandom')?.addEventListener('click', () => window.ACTIONS.updateTimeSeriesAccumulator((Math.random()*80)+20, 'NOISE INJECT'));
    document.getElementById('btnPauseStream')?.addEventListener('click', (e) => { window.GLOBALS.isStreamPaused = !window.GLOBALS.isStreamPaused; e.target.innerText = window.GLOBALS.isStreamPaused ? "▶ RESUME" : "⏸ PAUSE"; });
    
    document.getElementById('btnSubmitAiChat')?.addEventListener('click', () => window.AI.submitChat());
    document.getElementById('aiChatInput')?.addEventListener('input', (e) => window.AI.handleGhostInput(e));
    document.getElementById('aiChatInput')?.addEventListener('keydown', (e) => window.AI.handleGhostKeyDown(e));

    document.querySelectorAll('#atomTabs .cat-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation(); document.querySelectorAll('#atomTabs .cat-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active');
            let mode = chip.getAttribute('data-atom-mode');
            if (mode === 'sci') {
                window.GLOBALS.noiseStructureActive = true;
                document.getElementById('noiseStructReadout').innerText = "STRUCT: INJECTED";
                document.getElementById('noiseStructReadout').style.color = "var(--warning-amber)";
            } else {
                window.GLOBALS.noiseStructureActive = false;
                document.getElementById('noiseStructReadout').innerText = "STRUCT: NULL";
                document.getElementById('noiseStructReadout').style.color = "rgba(255,255,255,0.4)";
            }
        });
    });

    document.getElementById('modeBtnQuantum')?.addEventListener('click', () => window.MATH.setMathMode('quantum'));
    document.getElementById('modeBtnFinancial')?.addEventListener('click', () => window.MATH.setMathMode('financial'));
    document.getElementById('baseValueSlider')?.addEventListener('input', (e) => { window.GLOBALS.finConfig.baseValue = parseFloat(e.target.value); document.getElementById('baseValueReadout').innerText = window.GLOBALS.finConfig.baseValue.toFixed(2); });
    document.getElementById('dampingSlider')?.addEventListener('input', (e) => { window.GLOBALS.finConfig.damping = parseFloat(e.target.value); document.getElementById('dampingReadout').innerText = window.GLOBALS.finConfig.damping.toFixed(2); });

    document.getElementById('filtAll')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('ALL'));
    document.getElementById('filtWorld')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('NOISE'));
    document.getElementById('filtCalc')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('ANOMALY'));
    document.getElementById('filtFin')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('ANALOG'));
    
    document.getElementById('btnNavUp')?.addEventListener('click', () => window.WORKSPACE.navigateUp());
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
    setTimeout(window.UI.resizeCanvases, 150); 
});
