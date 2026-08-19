// ==========================================================================
// SEBRA82 v22.0 - Master Logic (Morning UI Framework & Continuous Graph)
// ==========================================================================

"use strict";

let targetAtomZoom = 1.0, targetAtomRotX = 0.4, targetAtomRotY = 0.2;
let currentAtomRotX = 0.4, currentAtomRotY = 0.2;
let isDraggingAtom = false, lastX = 0, lastY = 0;

window.GLOBALS = {
    isStreamPaused: false,
    globalTick: 0,
    timeOffset: 0.0,
    atomMode: 'calc',
    serverMatrix: [],
    waveBuffer: new Array(220).fill(50),
    finConfig: { baseValue: 10.0, damping: 1.45, mathMode: 'quantum' }
};

window.UI = {
    authenticateAndLaunch: function(tier) {
        document.getElementById('authGatewayModal').style.display = 'none';
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
                c.classList.add('fluid-maximized'); 
                c.classList.remove('minimized-dock-item'); 
                c.querySelector('.collapsible-body')?.classList.remove('collapsed');
            } else {
                c.classList.remove('fluid-maximized'); 
                c.classList.add('minimized-dock-item'); 
                c.querySelector('.collapsible-body')?.classList.add('collapsed');
            }
        });
        window.UI.resizeCanvases();
    },
    resetStandardView: function() { 
        this.activeMaxId = null; 
        const stack = document.getElementById('mobileStack');
        if (stack) stack.classList.remove('has-maximized');
        
        document.querySelectorAll('.panel-card').forEach(c => {
            c.classList.remove('fluid-maximized', 'minimized-dock-item'); 
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
    updateInteractiveMathReadout: function() {
        let dynamicMod = ((window.GLOBALS.waveBuffer[window.GLOBALS.waveBuffer.length - 1] || 50) / 50) * window.GLOBALS.finConfig.damping;
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
        const atomCanvas = document.getElementById('atom3DCanvas'); 
        const atomCtx = atomCanvas ? atomCanvas.getContext('2d') : null;
        if(!atomCtx || !atomCanvas.width || !atomCanvas.height) return;
        const w = atomCanvas.width, h = atomCanvas.height; 
        atomCtx.clearRect(0, 0, w, h); 
        this.drawGrid(atomCtx, w, h, 'rgba(0, 243, 255, 0.04)');
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

        let localNodes = window.GLOBALS.serverMatrix.map(n => {
            let r = n.baseR;
            if(n.type === 'core') r += Math.sin(window.GLOBALS.globalTick * 0.08) * 4;
            if(n.type === 'inner') r += Math.sin(window.GLOBALS.globalTick*0.05 + n.id)*6;
            if(n.type === 'valence') r += (window.GLOBALS.waveBuffer[window.GLOBALS.waveBuffer.length-1] - 50) * 0.4 + Math.sin(n.id*0.3 + window.GLOBALS.timeOffset)*8;

            let ox = 0, oy = 0, oz = 0;
            if(n.type === 'inner') {
                ox = r * Math.cos(n.angle + window.GLOBALS.globalTick*0.03); 
                oy = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.cos(Math.PI/4); 
                oz = r * Math.sin(n.angle + window.GLOBALS.globalTick*0.03) * Math.sin(Math.PI/4);
            } else {
                ox = r * Math.sin(n.phi) * Math.cos(n.theta); 
                oy = r * Math.sin(n.phi) * Math.sin(n.theta); 
                oz = r * Math.cos(n.phi);
            }

            let color = n.type === 'core' ? '#ffffff' : (n.type === 'inner' ? '#00f3ff' : '#c084fc');
            let glow = n.type === 'core' ? 'rgba(255,255,255,0.9)' : (n.type === 'inner' ? 'rgba(0,243,255,0.8)' : 'rgba(192,132,252,0.8)');
            
            return { ox: ox, oy: oy, oz: oz, type: n.type, isCore: n.type === 'core', id: n.id, color: color, glow: glow };
        });

        let projected = localNodes.map(n => {
            let x1 = n.ox * Math.cos(targetAtomRotY) + n.oz * Math.sin(targetAtomRotY);
            let z1 = -n.ox * Math.sin(targetAtomRotY) + n.oz * Math.cos(targetAtomRotY);
            let y2 = n.oy * Math.cos(targetAtomRotX) - z1 * Math.sin(targetAtomRotX);
            let z2 = n.oy * Math.sin(targetAtomRotX) + z1 * Math.cos(targetAtomRotX);
            let pers = 400 / (400 + z2);
            return {
                px: cx + x1 * pers * targetAtomZoom, py: cy + y2 * pers * targetAtomZoom, z: z2, ox: n.ox, oy: n.oy, oz: n.oz,
                isCore: n.isCore, type: n.type, id: n.id, color: n.color, glow: n.glow, size: (n.isCore ? 3.0 : 2.0) * pers * Math.min(targetAtomZoom, 4.0)
            };
        });

        projected.sort((a, b) => a.z - b.z);
        atomCtx.lineWidth = 1.0;

        for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < Math.min(i + 30, projected.length); j++) {
                if (projected[i].type !== projected[j].type) continue;
                let dx = projected[i].ox - projected[j].ox, dy = projected[i].oy - projected[j].oy, dz = projected[i].oz - projected[j].oz;
                let dist3D = Math.sqrt(dx*dx + dy*dy + dz*dz);
                let maxDist = projected[i].isCore ? 35 : 55;

                if (dist3D < maxDist) {
                    let alpha = (1.0 - (dist3D / maxDist)) * 0.7;
                    atomCtx.strokeStyle = `rgba(0, 243, 255, ${alpha})`;
                    atomCtx.beginPath(); atomCtx.moveTo(projected[i].px, projected[i].py); atomCtx.lineTo(projected[j].px, projected[j].py); atomCtx.stroke();
                }
            }
        }

        projected.forEach(n => {
            atomCtx.fillStyle = n.color;
            atomCtx.shadowBlur = n.isCore ? 15 : 8; atomCtx.shadowColor = n.glow;
            let s = Math.max(2.0, n.size * 2);
            atomCtx.fillRect(n.px - s/2, n.py - s/2, s, s);
            atomCtx.shadowBlur = 0;
        });
    }

    // 🚨 RESTORED: Continuous Graphic Structure for Noise & Predictive Studio
    static renderContinuousGraph() {
        const predCanvas = document.getElementById('predictiveForecastCanvas'); 
        const predCtx = predCanvas ? predCanvas.getContext('2d') : null;
        if(!predCtx || !predCanvas.width || !predCanvas.height) return;
        
        const w = predCanvas.width, h = predCanvas.height; 
        predCtx.clearRect(0, 0, w, h); 
        this.drawGrid(predCtx, w, h, 'rgba(0, 243, 255, 0.04)');

        if (!window.GLOBALS.isStreamPaused) { 
            window.GLOBALS.globalTick++; window.GLOBALS.timeOffset += 0.05; 
            let liveVal = Math.min(85, Math.max(15, 50 + Math.sin(window.GLOBALS.globalTick * 0.04 + window.GLOBALS.timeOffset * 2) * 20 + (Math.random() * 6 - 3)));
            window.GLOBALS.waveBuffer.shift(); 
            window.GLOBALS.waveBuffer.push(liveVal);
            window.MATH.updateInteractiveMathReadout();
        }

        let st = w / Math.max(1, window.GLOBALS.waveBuffer.length - 1);
        
        // Draw Main Wave
        predCtx.beginPath(); 
        predCtx.moveTo(0, h - (window.GLOBALS.waveBuffer[0] * (h / 100)));
        for (let i = 0; i < window.GLOBALS.waveBuffer.length - 1; i++) { 
            let xPos = i * st; 
            let yPos = h - (window.GLOBALS.waveBuffer[i] * (h / 100)); 
            let nextX = (i + 1) * st; 
            let nextY = h - (window.GLOBALS.waveBuffer[i + 1] * (h / 100)); 
            predCtx.quadraticCurveTo(xPos, yPos, (xPos + nextX) / 2, (yPos + nextY) / 2);
        } 
        predCtx.strokeStyle = '#00f3ff'; predCtx.lineWidth = 2.0; predCtx.stroke();
        
        // Draw Predictive Cone Overlay
        let historyCutoff = Math.floor(window.GLOBALS.waveBuffer.length * 0.45);
        let startX = historyCutoff * st;
        let centerY = h / 2;

        predCtx.strokeStyle = 'rgba(192, 132, 252, 0.6)'; predCtx.lineWidth = 1.0; predCtx.setLineDash([3, 3]);
        predCtx.beginPath(); predCtx.moveTo(startX, centerY);
        for(let i = historyCutoff; i < window.GLOBALS.waveBuffer.length; i++) {
            predCtx.lineTo(i * st, centerY - (i - historyCutoff) * 0.8);
        }
        predCtx.stroke();

        predCtx.beginPath(); predCtx.moveTo(startX, centerY);
        for(let i = historyCutoff; i < window.GLOBALS.waveBuffer.length; i++) {
            predCtx.lineTo(i * st, centerY + (i - historyCutoff) * 0.8);
        }
        predCtx.stroke();
        predCtx.setLineDash([]);
    }
}

window.UTILS = {
    lerp: function(start, end, amt) { return (1 - amt) * start + amt * end; }
};

function bindAllEvents() {
    window.addEventListener('resize', window.UI.resizeCanvases);

    // 🚨 BINDING TO THE ORIGINAL DOM STRUCTURE 🚨
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
    masterLoop(); 
    window.MATH.updateInteractiveMathReadout(); 
    setTimeout(window.UI.resizeCanvases, 150); 
});
