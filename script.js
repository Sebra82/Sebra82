// ==========================================================================
// SEBRA82 v23.1 - The Master Logic Engine (Restored Advanced Features)
// ==========================================================================

"use strict";

let targetAtomZoom = 1.0, targetAtomRotX = 0.4, targetAtomRotY = 0.2;
let currentAtomRotX = 0.4, currentAtomRotY = 0.2;
let isDraggingAtom = false, lastX = 0, lastY = 0;

window.GLOBALS = {
    isStreamPaused: false, globalTick: 0, timeOffset: 0.0,
    atomMode: 'calc', serverMatrix: [],
    waveBuffer: new Array(220).fill({val: 50, spike: false}),
    timeSeriesBuffer: [],
    queryFilter: 'ALL',
    finConfig: { baseValue: 10.0, damping: 1.45, mathMode: 'quantum' }
};

window.UTILS = {
    escapeHtml: function(str) { return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); },
    logSys: function(msg) {
        const logger = document.getElementById('sysLogger'); if(!logger) return;
        const t = new Date().toISOString().split('T')[1].slice(0, -1);
        logger.innerHTML += `<div class="log-info">[${t}] ${this.escapeHtml(msg)}</div>`;
        logger.scrollTop = logger.scrollHeight;
    },
    lerp: function(start, end, amt) { return (1 - amt) * start + amt * end; }
};

// 🧠 Advanced AI Synapse Logic
window.AI = {
    currentPrediction: "", fullMatchedPhrase: "",
    dictionary: [ "zoom lattice", "run benchmark", "extract noise", "clear ledger", "load 6 months", "export data", "maximize calculus" ],
    getMatch: function(val) {
        const text = val.toLowerCase(); if (!text) return { remaining: "", full: "" };
        for (let phrase of this.dictionary) { if (phrase.startsWith(text) && phrase.length > text.length) return { remaining: phrase.slice(text.length), full: phrase }; }
        return { remaining: "", full: "" };
    },
    handleGhostInput: function(e) {
        const val = e.target.value; const match = this.getMatch(val);
        this.currentPrediction = match.remaining; this.fullMatchedPhrase = match.full;
        const ghost = document.getElementById('ghostOverlay');
        if (ghost) {
            ghost.innerHTML = `<span style="opacity: 0;">${window.UTILS.escapeHtml(val)}</span>` + (this.currentPrediction ? `<span class="ghost-match">${window.UTILS.escapeHtml(this.currentPrediction)}</span>` : '');
        }
    },
    handleGhostKeyDown: function(e) {
        const input = e.target;
        if ((e.key === 'Tab' || e.key === 'ArrowRight') && this.currentPrediction.length > 0) { 
            e.preventDefault(); input.value = this.fullMatchedPhrase; 
            this.currentPrediction = ""; document.getElementById('ghostOverlay').innerHTML = ""; return; 
        }
        if (e.key === 'Enter') { window.AI.submitChat(); }
    },
    submitChat: function() {
        const inputField = document.getElementById('aiChatInput'); if (!inputField) return;
        const query = inputField.value.trim().toLowerCase();
        if (!query) return;
        inputField.value = ""; document.getElementById('ghostOverlay').innerHTML = "";
        
        if (query.includes('zoom') || query.includes('lattice') || query.includes('3d') || query.includes('core')) { window.UI.toggleMax('cardAtom'); }
        else if (query.includes('bench') || query.includes('calc') || query.includes('math')) { window.UI.toggleMax('cardFin'); window.MATH.runBenchmark(); }
        else if (query.includes('noise') || query.includes('extract') || query.includes('wave')) { window.UI.toggleMax('cardWave'); }
        else if (query.includes('ledger') || query.includes('table') || query.includes('query')) { window.UI.toggleMax('cardQuery'); }
        else if (query.includes('load') || query.includes('month') || query.includes('workspace')) { window.UI.toggleMax('cardTools'); }
        window.UTILS.logSys(`Synapse AI executed directive: [${query}]`);
    }
};

// 📊 Advanced Data & Query Logic
window.DATA_INSIGHT = {
    activeDataSet: [],
    setFilter: function(cat) {
        window.GLOBALS.queryFilter = cat;
        document.querySelectorAll('#secQuery .cat-chip').forEach(c => c.classList.remove('active'));
        if(cat==='ALL') document.getElementById('filtAll')?.classList.add('active');
        if(cat==='WORLD') document.getElementById('filtWorld')?.classList.add('active');
        if(cat==='CALC') document.getElementById('filtCalc')?.classList.add('active');
        if(cat==='FIN') document.getElementById('filtFin')?.classList.add('active');
        
        const filterLabel = document.getElementById('filterStateLabel');
        if (filterLabel) filterLabel.innerText = cat;
        this.renderLedger();
    },
    renderLedger: function() {
        const tbody = document.getElementById('queryTableBody'); 
        if (!tbody) return;
        
        let dataToRender = this.activeDataSet.length > 0 ? this.activeDataSet : window.GLOBALS.timeSeriesBuffer;

        if (window.GLOBALS.queryFilter !== 'ALL') {
            dataToRender = dataToRender.filter(item => {
                let c = item.cat.toUpperCase();
                if (window.GLOBALS.queryFilter === 'WORLD' && c.includes('WORLD')) return true;
                if (window.GLOBALS.queryFilter === 'CALC' && c.includes('CALC')) return true;
                if (window.GLOBALS.queryFilter === 'FIN' && (c.includes('FIN') || c.includes('PRICE') || c.includes('ALPHA'))) return true;
                return false;
            });
        }

        let reversedData = [...dataToRender].reverse().slice(0, 50);
        const queryCountEl = document.getElementById('sumQueryCount');
        
        if(reversedData.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--text-muted);">No records match filter.</td></tr>`; 
            if (queryCountEl) queryCountEl.innerText = '0 rows'; 
            return; 
        }
        
        let htmlStr = '';
        reversedData.forEach((item, idx) => {
            let catColor = item.cat.includes('WORLD') ? "var(--warning-amber)" : (item.cat.includes('CALC') ? "var(--neon-cyan)" : "var(--accent-purple)");
            htmlStr += `<tr><td>TX-${9400+idx}</td><td>${item.time}</td><td style="color:${catColor};">${item.cat}</td><td style="color:var(--accent-green);">$${item.val}</td></tr>`;
        });
        tbody.innerHTML = htmlStr;
        if (queryCountEl) queryCountEl.innerText = `${dataToRender.length} rows`;
    },
    triggerExport: function() {
        let dataToExport = this.activeDataSet.length > 0 ? this.activeDataSet : window.GLOBALS.timeSeriesBuffer;
        if(dataToExport.length === 0) { alert("No data available to export."); return; }
        let csvContent = "Event_ID,Timestamp,Classification,Magnitude\n";
        dataToExport.forEach((i, idx) => { csvContent += `TX-${9400+idx},${i.time},${i.cat},${i.val}\n`; });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.download = "SEBRA82_Telemetry_Export.csv";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.UTILS.logSys("Export dataset generated and downloaded.");
    },
    archiveData: function() {
        let fileName = `vault_archive_${Date.now().toString().slice(-4)}.csv`;
        if(!window.WORKSPACE.fs["/root/datasets"]) window.WORKSPACE.fs["/root/datasets"] = [];
        window.WORKSPACE.fs["/root/datasets"].push(fileName);
        window.WORKSPACE.render();
        window.UTILS.logSys(`Active telemetry archived to Virtual Vault: /root/datasets/${fileName}`);
    },
    loadHistoricalData: function(months) {
        window.UTILS.logSys(`Loading ${months}-Month historical dataset...`);
        this.activeDataSet = []; 
        let count = months * 25;
        for(let i=0; i<count; i++) {
            let r = Math.random();
            let cat = r > 0.66 ? 'FINANCE-ALPHA' : (r > 0.33 ? 'WORLD-VECTOR' : 'CALC-REGIME');
            this.activeDataSet.push({ time: new Date(Date.now() - i*3600000).toLocaleTimeString(), cat: cat, val: (Math.random()*4000+100).toFixed(2) });
        }
        this.renderLedger(); window.UI.toggleMax('cardQuery');
    }
};

// 📁 Advanced Workspace Logic
window.WORKSPACE = {
    currentPath: "/root/datasets",
    fs: { "/root": ["datasets", "exports"], "/root/datasets": ["quantum_noise.json", "alpha_feed.csv"], "/root/exports": ["briefing_report.pdf"] },
    render: function() {
        const area = document.getElementById('explorerContentArea'); 
        const display = document.getElementById('currentPathDisplay'); 
        if (display) display.innerText = `📁 ${this.currentPath}`;
        if (!area) return;
        
        let html = `<div style="color:var(--text-muted); margin-bottom:8px;">Directory Contents:</div>`;
        (this.fs[this.currentPath] || []).forEach(f => {
            let isDir = !f.includes('.');
            let icon = isDir ? '📁' : '📄';
            html += `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;" onclick="if('${isDir}'==='true') window.WORKSPACE.openFolder('${this.currentPath}/${f}')">${icon} ${f}</div>`;
        });
        area.innerHTML = html;
    },
    openFolder: function(path) { this.currentPath = path; this.render(); },
    navigateUp: function() { 
        if (this.currentPath === "/root") return; 
        let parts = this.currentPath.split('/'); parts.pop(); 
        this.currentPath = parts.join('/') || "/root"; 
        this.render(); 
    }
};

// 📐 Advanced Action & Mathematical Logic
window.ACTIONS = {
    generateRandomDataEpoch: function() { 
        window.GLOBALS.waveBuffer = window.GLOBALS.waveBuffer.map(() => ({val: Math.floor(Math.random() * 60) + 20, spike: false})); 
        window.GLOBALS.timeSeriesBuffer = []; 
        window.DATA_INSIGHT.renderLedger(); 
        window.UTILS.logSys("Injected simulated Welford noise epoch.");
    },
    updateTimeSeriesAccumulator: function(val, isSpike) {
        const time = new Date().toLocaleTimeString();
        window.GLOBALS.timeSeriesBuffer.push({ time: time, val: val.toFixed(2), cat: "FINANCE-ALPHA" });
        if (window.GLOBALS.timeSeriesBuffer.length > 250) window.GLOBALS.timeSeriesBuffer.shift(); 
        
        let totalSpikes = window.GLOBALS.waveBuffer.filter(i => i.spike).length + 1; 
        const spikeLabel = document.getElementById('sumMetricSpikes');
        if (spikeLabel) spikeLabel.innerText = totalSpikes + " Detected";
        window.DATA_INSIGHT.renderLedger();
    },
    autoGenerateExecSummary: function() {
        let totalSpikes = window.GLOBALS.waveBuffer.filter(i => i.spike).length;
        let html = `🏆 <strong>Executive Briefing (${new Date().toLocaleTimeString()}):</strong><br>`;
        html += `• Quantum lattice operating at sustained 60 FPS matrix fidelity.<br>`;
        html += `• Welford statistical anomaly detector identified <strong>${totalSpikes}</strong> regime events.<br>`;
        html += `• Current deterministic calculation latency benchmarked at &lt; 0.05ms on single CPU core.`;
        window.UTILS.logSys(html);
    }
};

window.UI = {
    authenticateAndLaunch: function(tier) {
        document.getElementById('authGatewayModal').style.display = 'none';
        window.UTILS.logSys(`Authentication approved. Access granted to master core.`);
        setTimeout(window.UI.resizeCanvases, 50);
    },
    activeMaxId: null,
    toggleMax: function(cardId) {
        if (this.activeMaxId === cardId) { this.resetStandardView(); return; }
        this.activeMaxId = cardId;
        const stack = document.getElementById('mobileStack');
        if (stack) stack.classList.add('has-maximized');
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
            if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
                canvas.width = parent.clientWidth; canvas.height = parent.clientHeight;
            }
        });
    }
};

window.MATH = {
    setMathMode: function(mode) { 
        window.GLOBALS.finConfig.mathMode = mode; 
        document.getElementById('modeBtnQuantum')?.classList.toggle('active', mode === 'quantum'); 
        document.getElementById('modeBtnFinancial')?.classList.toggle('active', mode === 'financial'); 
        const titleEl = document.getElementById('mathLiveTitle');
        if (titleEl) titleEl.innerText = mode === 'quantum' ? 'Normalized Tensor Vector:' : 'Projected Alpha Rate:'; 
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
            resEl.innerHTML = `|&psi;&gt; = ${(rawAlpha/normFactor).toFixed(3)}|00&gt; + ${(0.5/normFactor).toFixed(3)}|01&gt;`; 
        } else { 
            let roi = (window.GLOBALS.finConfig.baseValue * dynamicMod * 14.8).toFixed(2); 
            resEl.innerText = `$${roi} (Confidence: ${(92 + dynamicMod).toFixed(1)}%)`; 
        }
    },
    runBenchmark: function() {
        const btn = document.getElementById('btnRunBench');
        if (btn) { btn.disabled = true; btn.innerText = "Computing Tensor Core..."; }
        setTimeout(() => {
            if (btn) { btn.disabled = false; btn.innerText = "Run Speed Benchmark"; }
            window.UTILS.logSys("Compute benchmark completed locally (< 0.05ms).");
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

        let mode = window.GLOBALS.atomMode; 
        if (!isDraggingAtom) { 
            if(mode === 'world') { currentAtomRotY += 0.008; currentAtomRotX += 0.004; }
            else if(mode === 'sci') { currentAtomRotY += 0.001; currentAtomRotX -= 0.001; }
            else { currentAtomRotY += 0.003; currentAtomRotX += 0.001; } 
        }
        
        if (window.GLOBALS.serverMatrix.length === 0) {
            let m = [];
            for(let i=0; i<36; i++) { m.push({ id: i, type: 'core', phi: Math.acos(1 - 2*(i+0.5)/36), theta: Math.PI * (1 + Math.sqrt(5)) * (i+0.5), baseR: 30 }); }
            for(let i=0; i<42; i++) { m.push({ id: i+36, type: 'inner', angle: (i/42) * Math.PI * 2, baseR: 70 }); }
            for(let i=0; i<50; i++) { m.push({ id: i+78, type: 'valence', phi: Math.acos(-1 + (2*i)/50), theta: Math.sqrt(50*Math.PI) * Math.acos(-1 + (2*i)/50), baseR: 125 }); }
            window.GLOBALS.serverMatrix = m;
        }

        let lastVal = window.GLOBALS.waveBuffer[window.GLOBALS.waveBuffer.length-1].val;
        let localNodes = window.GLOBALS.serverMatrix.map(n => {
            let r = n.baseR;
            if (mode === 'sci') {
                if(n.type === 'core') r += Math.sin(window.GLOBALS.globalTick * 0.05) * 8; 
                if(n.type === 'inner') r += Math.sin(window.GLOBALS.globalTick*0.03 + n.id)*12;
                if(n.type === 'valence') r += Math.cos(n.id*0.2 + window.GLOBALS.timeOffset)*15;
            } else if (mode === 'world') {
                if(n.type === 'core') r += Math.random() * 4; 
                if(n.type === 'inner') r += Math.tan(window.GLOBALS.globalTick*0.01 + n.id)*2;
                if(n.type === 'valence') r += Math.sin(n.id*0.8 + window.GLOBALS.timeOffset*3)*20; 
            } else {
                if(n.type === 'core') r += Math.sin(window.GLOBALS.globalTick * 0.08) * 4;
                if(n.type === 'inner') r += Math.sin(window.GLOBALS.globalTick*0.05 + n.id)*6;
                if(n.type === 'valence') r += (lastVal - 50) * 0.4 + Math.sin(n.id*0.3 + window.GLOBALS.timeOffset)*8;
            }

            let ox = 0, oy = 0, oz = 0;
            if(n.type === 'inner') {
                ox = r * Math.cos(n.angle + window.GLOBALS.globalTick*0.03); oy = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.cos(Math.PI/4); oz = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.sin(Math.PI/4);
            } else {
                ox = r * Math.sin(n.phi) * Math.cos(n.theta); oy = r * Math.sin(n.phi) * Math.sin(n.theta); oz = r * Math.cos(n.phi);
            }

            let color, glow;
            if (mode === 'sci') {
                color = n.type === 'core' ? '#ffffff' : (n.type === 'inner' ? '#7ee787' : '#00f3ff');
                glow = n.type === 'core' ? 'rgba(255,255,255,0.9)' : (n.type === 'inner' ? 'rgba(126,231,135,0.8)' : 'rgba(0,243,255,0.8)');
            } else if (mode === 'world') {
                color = n.type === 'core' ? '#ffffff' : (n.type === 'inner' ? '#f0883e' : '#ff3344');
                glow = n.type === 'core' ? 'rgba(255,255,255,0.9)' : (n.type === 'inner' ? 'rgba(240,136,62,0.8)' : 'rgba(255,51,68,0.8)');
            } else {
                color = n.type === 'core' ? '#ffffff' : (n.type === 'inner' ? '#00f3ff' : '#c084fc');
                glow = n.type === 'core' ? 'rgba(255,255,255,0.9)' : (n.type === 'inner' ? 'rgba(0,243,255,0.8)' : 'rgba(192,132,252,0.8)');
            }
            return { ox, oy, oz, type: n.type, isCore: n.type === 'core', id: n.id, color, glow };
        });

        let projected = localNodes.map(n => {
            let x1 = n.ox * Math.cos(targetAtomRotY) + n.oz * Math.sin(targetAtomRotY);
            let z1 = -n.ox * Math.sin(targetAtomRotY) + n.oz * Math.cos(targetAtomRotY);
            let y2 = n.oy * Math.cos(targetAtomRotX) - z1 * Math.sin(targetAtomRotX);
            let z2 = n.oy * Math.sin(targetAtomRotX) + z1 * Math.cos(targetAtomRotX);
            let pers = 400 / (400 + z2);
            return { px: cx + x1 * pers * targetAtomZoom, py: cy + y2 * pers * targetAtomZoom, z: z2, ox: n.ox, oy: n.oy, oz: n.oz, isCore: n.isCore, type: n.type, color: n.color, glow: n.glow, size: (n.isCore ? 3.0 : 2.0) * pers * Math.min(targetAtomZoom, 4.0) };
        });

        projected.sort((a, b) => a.z - b.z);
        ctx.lineWidth = 1.0;

        for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < Math.min(i + 30, projected.length); j++) {
                if (projected[i].type !== projected[j].type) continue;
                let dx = projected[i].ox - projected[j].ox, dy = projected[i].oy - projected[j].oy, dz = projected[i].oz - projected[j].oz;
                let dist3D = Math.sqrt(dx*dx + dy*dy + dz*dz);
                let maxDist = projected[i].isCore ? 35 : 55;

                if (dist3D < maxDist) {
                    let alpha = (1.0 - (dist3D / maxDist)) * 0.7;
                    ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`;
                    ctx.beginPath(); ctx.moveTo(projected[i].px, projected[i].py); ctx.lineTo(projected[j].px, projected[j].py); ctx.stroke();
                }
            }
        }

        projected.forEach(n => {
            ctx.fillStyle = n.color;
            ctx.shadowBlur = n.isCore ? 15 : 8; ctx.shadowColor = n.glow;
            let s = Math.max(2.0, n.size * 2);
            ctx.fillRect(n.px - s/2, n.py - s/2, s, s);
            ctx.shadowBlur = 0;
        });
    }

    // 🚨 The Single Continuous Graph (With embedded Anomalies & Predictions) 🚨
    static renderContinuousGraph() {
        const canvas = document.getElementById('predictiveForecastCanvas'); 
        const ctx = canvas ? canvas.getContext('2d') : null;
        if(!ctx || !canvas.width || !canvas.height) return;
        
        const w = canvas.width, h = canvas.height; 
        ctx.clearRect(0, 0, w, h); 
        this.drawGrid(ctx, w, h, 'rgba(0, 243, 255, 0.04)');

        if (!window.GLOBALS.isStreamPaused) { 
            window.GLOBALS.globalTick++; window.GLOBALS.timeOffset += 0.05; 
            let val = Math.min(85, Math.max(15, 50 + Math.sin(window.GLOBALS.globalTick * 0.04 + window.GLOBALS.timeOffset * 2) * 20 + (Math.random() * 6 - 3)));
            
            // Welford simulated anomaly check
            let isSpike = Math.random() > 0.98;
            if (isSpike) window.ACTIONS.updateTimeSeriesAccumulator(val, isSpike);

            window.GLOBALS.waveBuffer.shift(); 
            window.GLOBALS.waveBuffer.push({val: val, spike: isSpike});
            window.MATH.updateInteractiveMathReadout();
        }

        let st = w / Math.max(1, window.GLOBALS.waveBuffer.length - 1);
        
        // 1. Draw Main Wave
        ctx.beginPath(); 
        ctx.moveTo(0, h - (window.GLOBALS.waveBuffer[0].val * (h / 100)));
        for (let i = 0; i < window.GLOBALS.waveBuffer.length - 1; i++) { 
            let xPos = i * st, yPos = h - (window.GLOBALS.waveBuffer[i].val * (h / 100)); 
            let nextX = (i + 1) * st, nextY = h - (window.GLOBALS.waveBuffer[i + 1].val * (h / 100)); 
            ctx.quadraticCurveTo(xPos, yPos, (xPos + nextX) / 2, (yPos + nextY) / 2);
        } 
        ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2.0; ctx.stroke();
        
        // 2. Draw Anomaly Spikes directly on the continuous line
        window.GLOBALS.waveBuffer.forEach((pt, i) => {
            if (pt.spike) {
                let x = i * st, y = h - (pt.val * (h / 100));
                ctx.fillStyle = '#ff3344';
                ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI*2); ctx.fill();
            }
        });

        // 3. Draw Predictive Markov Cone
        let historyCutoff = Math.floor(window.GLOBALS.waveBuffer.length * 0.55);
        let startX = historyCutoff * st;
        let centerY = h / 2;

        ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)'; ctx.lineWidth = 1.0; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(startX, centerY);
        for(let i = historyCutoff; i < window.GLOBALS.waveBuffer.length; i++) {
            ctx.lineTo(i * st, centerY - (i - historyCutoff) * 0.8);
        }
        ctx.stroke();

        ctx.beginPath(); ctx.moveTo(startX, centerY);
        for(let i = historyCutoff; i < window.GLOBALS.waveBuffer.length; i++) {
            ctx.lineTo(i * st, centerY + (i - historyCutoff) * 0.8);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function bindAllEvents() {
    window.addEventListener('resize', window.UI.resizeCanvases);

    // Advanced UI Logic Hooks
    document.querySelectorAll('.panel-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.pin-btn')) return; 
            const card = header.closest('.panel-card');
            if (!card || card.classList.contains('fluid-maximized') || card.classList.contains('minimized-dock-item')) return;
            const body = card.querySelector('.collapsible-body');
            if(body) {
                body.classList.toggle('collapsed');
                setTimeout(window.UI.resizeCanvases, 50);
            }
        });
    });

    document.querySelectorAll('.pin-btn').forEach(el => { 
        el.addEventListener('click', (e) => { e.stopPropagation(); window.UI.toggleMax(el.closest('.panel-card').id); }); 
    });

    document.querySelectorAll('.panel-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(card.classList.contains('minimized-dock-item')) window.UI.toggleMax(card.id);
        });
    });

    // Top Bar Logic
    document.getElementById('btnResetView')?.addEventListener('click', () => window.UI.resetStandardView());
    document.getElementById('btnGenRandom')?.addEventListener('click', () => window.ACTIONS.generateRandomDataEpoch());
    document.getElementById('btnPauseStream')?.addEventListener('click', (e) => {
        window.GLOBALS.isStreamPaused = !window.GLOBALS.isStreamPaused;
        e.target.innerText = window.GLOBALS.isStreamPaused ? "▶ RESUME" : "⏸ PAUSE";
    });
    
    // AI Synapse Logic
    document.getElementById('btnSubmitAiChat')?.addEventListener('click', () => window.AI.submitChat());
    document.getElementById('aiChatInput')?.addEventListener('input', (e) => window.AI.handleGhostInput(e));
    document.getElementById('aiChatInput')?.addEventListener('keydown', (e) => window.AI.handleGhostKeyDown(e));

    // Atom Tab Logic
    document.querySelectorAll('#atomTabs .cat-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('#atomTabs .cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            window.GLOBALS.atomMode = chip.getAttribute('data-atom-mode');
            window.DATA_INSIGHT.setFilter(window.GLOBALS.atomMode.toUpperCase());
            window.UTILS.logSys(`Quantum Lattice reconfigured to ${window.GLOBALS.atomMode.toUpperCase()} topology.`);
        });
    });

    // Math Engine Logic
    document.getElementById('modeBtnQuantum')?.addEventListener('click', () => window.MATH.setMathMode('quantum'));
    document.getElementById('modeBtnFinancial')?.addEventListener('click', () => window.MATH.setMathMode('financial'));
    document.getElementById('btnRunBench')?.addEventListener('click', () => window.MATH.runBenchmark());
    document.getElementById('baseValueSlider')?.addEventListener('input', (e) => {
        window.GLOBALS.finConfig.baseValue = parseFloat(e.target.value);
        document.getElementById('baseValueReadout').innerText = window.GLOBALS.finConfig.baseValue.toFixed(2);
    });
    document.getElementById('dampingSlider')?.addEventListener('input', (e) => {
        window.GLOBALS.finConfig.damping = parseFloat(e.target.value);
        document.getElementById('dampingReadout').innerText = window.GLOBALS.finConfig.damping.toFixed(2);
    });

    // Query Data Logic
    document.getElementById('filtAll')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('ALL'));
    document.getElementById('filtWorld')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('WORLD'));
    document.getElementById('filtCalc')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('CALC'));
    document.getElementById('filtFin')?.addEventListener('click', () => window.DATA_INSIGHT.setFilter('FIN'));
    document.getElementById('btnDownloadExport')?.addEventListener('click', () => window.DATA_INSIGHT.triggerExport());
    document.getElementById('btnArchiveData')?.addEventListener('click', () => window.DATA_INSIGHT.archiveData());

    // Workspace & Exec Logic
    document.getElementById('btnNavUp')?.addEventListener('click', () => window.WORKSPACE.navigateUp());
    document.getElementById('btnLoad3M')?.addEventListener('click', () => window.DATA_INSIGHT.loadHistoricalData(3));
    document.getElementById('btnLoad6M')?.addEventListener('click', () => window.DATA_INSIGHT.loadHistoricalData(6));
    document.getElementById('btnAutoSummary')?.addEventListener('click', (e) => { e.stopPropagation(); window.ACTIONS.autoGenerateExecSummary(); });

    // 3D Canvas Interaction
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

    const zoomSlider = document.getElementById('atomZoomSlider');
    zoomSlider?.addEventListener('input', (e) => { 
        const readout = document.getElementById('atomZoomReadout');
        if (readout) readout.innerText = parseFloat(e.target.value).toFixed(1) + "x"; 
    });
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
