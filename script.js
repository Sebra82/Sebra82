// ==========================================================================
// SEBRA82 v23.0 - Full Master Logic mapped to Clean Glassmorphism UI
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

window.ACTIONS = {
    updateTimeSeriesAccumulator: function(val, isSpike) {
        const time = new Date().toLocaleTimeString();
        window.GLOBALS.timeSeriesBuffer.push({ time: time, val: val.toFixed(2), cat: "FINANCE-ALPHA" });
        if (window.GLOBALS.timeSeriesBuffer.length > 250) window.GLOBALS.timeSeriesBuffer.shift(); 
        
        let totalSpikes = window.GLOBALS.waveBuffer.filter(i => i.spike).length + 1; // Approx
        const spikeLabel = document.getElementById('sumMetricSpikes');
        if (spikeLabel) spikeLabel.innerText = totalSpikes + " Detected";
        this.renderLedger();
    },
    renderLedger: function() {
        const tbody = document.getElementById('queryTableBody'); 
        if (!tbody) return;
        let data = window.GLOBALS.timeSeriesBuffer.slice().reverse().slice(0, 50);
        let htmlStr = '';
        data.forEach((item, idx) => {
            htmlStr += `<tr><td>TX-${9400+idx}</td><td>${item.time}</td><td style="color:var(--accent-purple);">${item.cat}</td><td style="color:var(--accent-green);">$${item.val}</td></tr>`;
        });
        tbody.innerHTML = htmlStr;
        const count = document.getElementById('sumQueryCount');
        if(count) count.innerText = `${data.length} rows`;
    }
};

window.WORKSPACE = {
    currentPath: "/root/datasets",
    fs: { "/root/datasets": ["quantum_noise.json", "alpha_feed.csv"], "/root/exports": ["briefing_report.pdf"] },
    render: function() {
        const area = document.getElementById('explorerContentArea'); 
        const display = document.getElementById('currentPathDisplay'); 
        if (display) display.innerText = `📁 ${this.currentPath}`;
        if (!area) return;
        let html = `<div style="color:var(--text-muted); margin-bottom:8px;">Files in Directory:</div>`;
        (this.fs[this.currentPath] || []).forEach(f => {
            html += `<div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">📄 ${f}</div>`;
        });
        area.innerHTML = html;
    }
};

window.UI = {
    authenticateAndLaunch: function(tier) {
        document.getElementById('authGatewayModal').style.display = 'none';
        window.UTILS.logSys(`Authentication approved. Access granted.`);
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
        document.querySelectorAll('.panel-card').forEach(c => c.classList.remove('fluid-maximized', 'minimized-dock-item'));
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
    updateInteractiveMathReadout: function() {
        let lastObj = window.GLOBALS.waveBuffer[window.GLOBALS.waveBuffer.length - 1];
        let dynamicMod = ((lastObj ? lastObj.val : 50) / 50) * window.GLOBALS.finConfig.damping;
        const resEl = document.getElementById('mathLiveResult');
        if (!resEl) return;
        let rawAlpha = (0.75 + (window.GLOBALS.finConfig.baseValue / 50) * 0.25 * dynamicMod); 
        let normFactor = Math.sqrt(rawAlpha * rawAlpha + 0.25); 
        resEl.innerHTML = `|&psi;&gt; = ${(rawAlpha/normFactor).toFixed(3)}|00&gt; + ${(0.5/normFactor).toFixed(3)}|01&gt;`; 
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

        if (!isDraggingAtom) { currentAtomRotY += 0.003; currentAtomRotX += 0.001; }
        
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
            if(n.type === 'core') r += Math.sin(window.GLOBALS.globalTick * 0.08) * 4;
            if(n.type === 'inner') r += Math.sin(window.GLOBALS.globalTick*0.05 + n.id)*6;
            if(n.type === 'valence') r += (lastVal - 50) * 0.4 + Math.sin(n.id*0.3 + window.GLOBALS.timeOffset)*8;

            let ox = 0, oy = 0, oz = 0;
            if(n.type === 'inner') {
                ox = r * Math.cos(n.angle + window.GLOBALS.globalTick*0.03); 
                oy = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.cos(Math.PI/4); 
                oz = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.sin(Math.PI/4);
            } else {
                ox = r * Math.sin(n.phi) * Math.cos(n.theta); oy = r * Math.sin(n.phi) * Math.sin(n.theta); oz = r * Math.cos(n.phi);
            }

            let color = n.type === 'core' ? '#ffffff' : (n.type === 'inner' ? '#00f3ff' : '#c084fc');
            let glow = n.type === 'core' ? 'rgba(255,255,255,0.9)' : (n.type === 'inner' ? 'rgba(0,243,255,0.8)' : 'rgba(192,132,252,0.8)');
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

    // Accordion Logic
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
        el.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            window.UI.toggleMax(el.closest('.panel-card').id); 
        }); 
    });

    document.querySelectorAll('.panel-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(card.classList.contains('minimized-dock-item')) window.UI.toggleMax(card.id);
        });
    });

    document.getElementById('btnResetView')?.addEventListener('click', () => window.UI.resetStandardView());
    
    // Atom Canvas Interaction
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
    setTimeout(window.UI.resizeCanvases, 150); 
});
