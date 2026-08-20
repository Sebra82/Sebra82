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

        let mode = window.GLOBALS.atomMode; 
        
        // Auto-rotation based on UI Tab selection
        if (!isDraggingAtom) { 
            if(mode === 'world') { currentAtomRotY += 0.008; currentAtomRotX += 0.004; }
            else if(mode === 'sci') { currentAtomRotY += 0.001; currentAtomRotX -= 0.001; }
            else { currentAtomRotY += 0.005; currentAtomRotX += 0.0015; } 
        }
        
        // 🚨 INJECTED: Your advanced geometric generation 🚨
        if (window.GLOBALS.serverMatrix.length === 0) {
            let nodes = [];
            // 1. S-orbital core 
            for (let i = 0; i < 180; i++) { 
                let theta = Math.random() * 2 * Math.PI; let phi = Math.acos(2 * Math.random() - 1);
                let r = 35 * Math.cbrt(Math.random()); // Scaled for UI bounds
                nodes.push({ox: r * Math.sin(phi) * Math.cos(theta), oy: r * Math.cos(phi), oz: r * Math.sin(phi) * Math.sin(theta), type: 'core'});
            }
            // 2. p_z orbital lobes 
            for (let i = 0; i < 600; i++) { 
                let theta = Math.random() * 2 * Math.PI; let phi = Math.acos(2 * Math.random() - 1); let lobe = Math.cos(phi);
                let r = 80 * Math.abs(lobe) * (0.8 + 0.4 * Math.random()) + 20; // Scaled for UI bounds
                nodes.push({ox: r * Math.sin(phi) * Math.cos(theta), oy: r * lobe, oz: r * Math.sin(phi) * Math.sin(theta), type: 'cloud'});
            }
            // 3. Boundary Wave Rings 
            for (let r = 0; r < 3; r++) {
                let rad = 100 + r * 15;
                for (let i = 0; i < 40; i++) {
                    let theta = (2 * Math.PI * i) / 40;
                    nodes.push({ox: rad * Math.cos(theta), oy: 0, oz: rad * Math.sin(theta), type: 'ring'});
                }
            }
            window.GLOBALS.serverMatrix = nodes;
        }

        // Apply interactive wave buffers and structural noise to the base geometry
        let noiseMultiplier = window.GLOBALS.noiseStructureActive ? 2.0 : 1.0;
        let lastVal = window.GLOBALS.waveBuffer[window.GLOBALS.waveBuffer.length-1].val;
        
        let localNodes = window.GLOBALS.serverMatrix.map((n, index) => {
            let nx = n.ox, ny = n.oy, nz = n.oz;
            
            // Add temporal breathing tied to the live telemetry graph
            if(n.type === 'core') { nx += Math.sin(window.GLOBALS.globalTick * 0.08) * 2 * noiseMultiplier; }
            if(n.type === 'cloud') { ny += Math.sin(window.GLOBALS.globalTick * 0.05 + index) * 3 * noiseMultiplier; }
            if(n.type === 'ring') { nz += (lastVal - 50) * 0.1 + Math.sin(index * 0.3 + window.GLOBALS.timeOffset) * 4 * noiseMultiplier; }

            // 🚨 INJECTED: Anisotropic Spacetime Shear Math 🚨
            if (window.GLOBALS.noiseStructureActive) {
                if (ny < 0) { ny *= 1.9; } else { ny *= 0.2; }
            }

            // Aesthetic Colors based on your new design
            let color, glow;
            if (n.type === 'core') { color = '#00ffcc'; glow = 'rgba(0,255,204,0.9)'; }
            else if (n.type === 'cloud') { color = 'rgba(255, 105, 225, 0.95)'; glow = 'rgba(255,105,225,0.8)'; }
            else { color = 'rgba(0, 255, 255, 0.9)'; glow = 'rgba(0,255,255,0.8)'; }
            
            return { ox: nx, oy: ny, oz: nz, type: n.type, color: color, glow: glow };
        });

        // 3D Projection Mapping
        let projected = localNodes.map(n => {
            let x1 = n.ox * Math.cos(targetAtomRotY) + n.oz * Math.sin(targetAtomRotY);
            let z1 = -n.ox * Math.sin(targetAtomRotY) + n.oz * Math.cos(targetAtomRotY);
            let y2 = n.oy * Math.cos(targetAtomRotX) - z1 * Math.sin(targetAtomRotX);
            let z2 = n.oy * Math.sin(targetAtomRotX) + z1 * Math.cos(targetAtomRotX);
            let depth = 400 / (400 + z2);
            
            let sizeBase = (n.type === 'core' ? 2.5 : 1.5);
            return { 
                px: cx + x1 * depth * targetAtomZoom, 
                py: cy + y2 * depth * targetAtomZoom, 
                z: z2, type: n.type, color: n.color, glow: n.glow, 
                size: Math.max(1.2, sizeBase * depth * targetAtomZoom) 
            };
        });

        projected.sort((a, b) => a.z - b.z);
        
        // Draw Boundary Rings
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = window.GLOBALS.noiseStructureActive ? 2.5 : 1.5;
        
        let ringStartIndex = projected.findIndex(p => p.type === 'ring');
        if (ringStartIndex !== -1) {
            for (let r = 0; r < 3; r++) {
                ctx.beginPath();
                for (let i = 0; i < 40; i++) {
                    let idx = ringStartIndex + (r * 40) + i;
                    if (projected[idx]) {
                        if (i === 0) ctx.moveTo(projected[idx].px, projected[idx].py);
                        else ctx.lineTo(projected[idx].px, projected[idx].py);
                    }
                }
                ctx.closePath();
                ctx.stroke();
            }
        }

        // Draw Nodes
        projected.forEach(n => {
            ctx.fillStyle = n.color; 
            ctx.shadowBlur = (n.type === 'core') ? 10 : 0; 
            ctx.shadowColor = n.glow;
            ctx.beginPath(); 
            ctx.arc(n.px, n.py, n.size, 0, Math.PI * 2); 
            ctx.fill(); 
            ctx.shadowBlur = 0;
        });
    }
