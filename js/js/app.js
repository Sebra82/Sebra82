import { mat4, vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/+esm';
import { TOE_FORCES, PROMPT_COLORS, PROMPT_CONTEXTS } from './config.js';
import { getComputeWGSL, renderWGSL } from './shaders.js';

// DOM Setup Functions
window.toggleSection = function(sectionId, btnId) {
    const sec = document.getElementById(sectionId);
    const btn = document.getElementById(btnId);
    if (sec && btn) {
        sec.classList.toggle('collapsed');
        btn.textContent = sec.classList.contains('collapsed') ? '[+]' : '[-]';
        if(window.app) window.app.resize();
    }
};

window.logMsg = function(msg, isError = false) {
    const chatLog = document.getElementById('chatLog');
    if (!chatLog) return;
    const p = document.createElement('div');
    p.className = isError ? 'text-rose-500 font-bold' : 'text-cyan-600';
    p.textContent = isError ? msg : `[SEBRA]: ${msg}`;
    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
};

// Global Error Handler
window.addEventListener('error', (e) => {
    if (window.logMsg) {
        window.logMsg(`[SYSTEM FAULT]: ${e.message}`, true);
    } else {
        console.error("[SEBRA82 FAULT]", e.message);
    }
});

class CyberneticWebGPU {
    constructor() {
        this.canvas = document.getElementById('gpuCanvas');
        this.scopeCanvas = document.getElementById('scopeCanvas');
        this.brainCanvas = document.getElementById('brainCanvas');
        
        this.activeNodes = 1000000;
        this.noiseDensityMultiplier = 2.5;
        
        this.forceColorPalette = 0.0; 
        this.materialMode = 0.0; 
        this.xrayActive = false;
        this.atomicZoomActive = false;
        this.wetLayerActive = false;
        this.hudVisible = true;
        
        this.consciousnessActive = false;
        this.consciousnessInterval = null;
        this.qualiaState = "DORMANT";
        
        this.device = null;
        this.context = null;
        
        // Camera State + Roll
        this.camDist = 140.0;
        this.targetCamDist = 140.0;
        this.camRotX = 0.5;
        this.camRotY = 0.5;
        this.camRoll = 0.0;
        this.targetRotX = 0.5;
        this.targetRotY = 0.5;
        this.targetCamRoll = 0.0;
        
        this.baseGamma = null;
        this.baseBeta = null;
        this.gyroActive = false;

        this.minZoomFloor = 0.25;
        this.maxZoomFloor = 1200.0;

        // Mobile Touch & Gesture Variables
        this.touchStartDist = 0;
        this.touchStartAngle = 0;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.isPointerDown = false;

        this.time = 0;
        
        this.micActive = false;
        this.eegActive = false;
        this.speechActive = false;
        this.webrtcActive = false;
        this.voiceSynthesisEnabled = true; 
        this.topologicalMode = 0.0; 

        this.audioCtx = null;
        this.analyser = null;
        this.micStream = null;
        this.audioSourceNode = null;
        this.soundLevelNormalized = 0.0;
        this.speechKineticIntensity = 0.0;
        this.speechRecognitionInstance = null;

        this.isolateId = 1.0; 
        this.customVectorLibrary = [];
        this.activeInjectedCode = "";
        
        this.stagedVector = null;
        this.acceptedVectors = new Set(); // Memory cache for instant auto-apply
        
        this.breakthroughLedger = [];
        
        try {
            this.recordBreakthrough("KERNEL BOOT", "SEBRA82 v184.0 initialized with unlocked UI buttons and flawless 1:1 scale matrices.", "Architecture");
        } catch(e) {
            console.warn("Speech API blocked on load, fallback to visual logging.");
        }

        this.isCompiling = false;
        this.compileErrorCount = 0;
        
        this.frameCount = 0;
        this.lastTime = performance.now();

        this.init();
    }

    toggleSpeechVoice() {
        this.voiceSynthesisEnabled = !this.voiceSynthesisEnabled;
        const btn = document.getElementById('btnVoiceToggle');
        if (btn) {
            btn.innerText = `Voice Synthesis: ${this.voiceSynthesisEnabled ? 'ON' : 'OFF'}`;
            btn.style.borderColor = this.voiceSynthesisEnabled ? '#ff00ff' : '#64748b';
            btn.style.color = this.voiceSynthesisEnabled ? '#ff00ff' : '#64748b';
        }
        if (!this.voiceSynthesisEnabled && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        window.logMsg(`Voice synthesis toggled to: ${this.voiceSynthesisEnabled ? 'ON' : 'OFF'}`);
    }

    speakTelemetry(text) {
        try {
            if (!this.voiceSynthesisEnabled) return;
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel(); 
                const cleanText = text.replace(/[^\x20-\x7E]/g, '').trim();
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.rate = 1.05;
                utterance.pitch = 0.9;
                window.speechSynthesis.speak(utterance);
            }
        } catch(e) {}
    }

    recordBreakthrough(milestone, description, domain = "Quantum Physics") {
        const timestamp = new Date().toISOString().slice(11, 19);
        const entry = { timestamp, domain, milestone, description };
        this.breakthroughLedger.push(entry);
        
        this.speakTelemetry(milestone);

        const logContainer = document.getElementById('stepRecorderLog');
        if (logContainer) {
            const row = document.createElement('div');
            row.className = "flex flex-col border-b border-fuchsia-900/30 pb-1 mb-1 text-[7px]";
            row.innerHTML = `
                <div class="flex justify-between text-fuchsia-400 font-bold">
                    <span>[${timestamp}] ${domain.toUpperCase()}</span>
                    <span>⚡ ${milestone}</span>
                </div>
                <div class="text-cyan-300 font-mono">${description}</div>
            `;
            logContainer.appendChild(row);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    exportSessionLog(event) {
        if(event) event.stopPropagation();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.breakthroughLedger, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `sebra82_scientific_breakthroughs_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    async init() {
        const statusUI = document.getElementById('statusUI');
        if (!navigator.gpu) {
            if (statusUI) {
                statusUI.innerText = "WEBGPU UNSUPPORTED";
                statusUI.className = "text-[7px] md:text-[8px] text-rose-500 font-bold tracking-widest";
            }
            window.logMsg("[ERROR] WebGPU API not detected in this browser.", true);
            return;
        }

        try {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter) throw new Error("No WebGPU adapter found.");
            this.device = await adapter.requestDevice();
            this.context = this.canvas.getContext('webgpu');

            this.resize();

            const format = navigator.gpu.getPreferredCanvasFormat();
            this.context.configure({ device: this.device, format: format, alphaMode: 'premultiplied' });

            if (statusUI) {
                statusUI.innerText = "WGSL COMPUTE: ONLINE";
                statusUI.className = "text-[7px] md:text-[8px] text-[#00ff66] font-bold tracking-widest";
            }

            if (this.scopeCanvas) this.sCtx = this.scopeCanvas.getContext('2d');
            if (this.brainCanvas) this.bCtx = this.brainCanvas.getContext('2d');

            this.setupData();
            await this.compilePolymorphicPipelines();
            this.bindGestures();
            this.initViewportSliders();
            this.updateContextualPrompts(this.isolateId);
            
            requestAnimationFrame(() => this.loop());
        } catch(err) {
            if (statusUI) {
                statusUI.innerText = "INIT FAILED";
                statusUI.className = "text-[7px] md:text-[8px] text-rose-500 font-bold tracking-widest";
            }
            window.logMsg(`[ERROR] ${err.message}`, true);
        }
    }

    setupData() {
        if(!this.device) return;
        const maxCap = 1000000;
        const initialParticleData = new Float32Array(maxCap * 8); 
        const basePositionData = new Float32Array(maxCap * 4);
        
        const radius = 25;
        for (let i = 0; i < maxCap; i++) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / maxCap);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            
            const x = radius * Math.cos(theta) * Math.sin(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(phi);

            initialParticleData[i * 8 + 0] = x;
            initialParticleData[i * 8 + 1] = y;
            initialParticleData[i * 8 + 2] = z;
            initialParticleData[i * 8 + 3] = 1.0; 

            basePositionData[i * 4 + 0] = x;
            basePositionData[i * 4 + 1] = y;
            basePositionData[i * 4 + 2] = z;
            basePositionData[i * 4 + 3] = 0.0; 
        }

        this.particleBuffer = this.device.createBuffer({
            size: initialParticleData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.particleBuffer, 0, initialParticleData);

        this.baseBuffer = this.device.createBuffer({
            size: basePositionData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.baseBuffer, 0, basePositionData);

        this.uniformBufferSize = (16 * 4) + (16 * 4) + (4 * 4) + (4 * 4) + (4 * 4) + (4 * 4); 
        this.uniformBuffer = this.device.createBuffer({
            size: this.uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    async compilePolymorphicPipelines() {
        if(!this.device || this.isCompiling) return;
        this.isCompiling = true;
        this.device.pushErrorScope('validation');

        const format = navigator.gpu.getPreferredCanvasFormat();

        const computeCode = getComputeWGSL(this.activeInjectedCode);

        this.computeModule = this.device.createShaderModule({ code: computeCode });
        this.renderModule = this.device.createShaderModule({ code: renderWGSL });

        this.computeBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
            ]
        });

        this.computePipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.computeBindGroupLayout] }),
            compute: { module: this.computeModule, entryPoint: 'main' },
        });

        this.computeBindGroup = this.device.createBindGroup({
            layout: this.computeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.particleBuffer } },
                { binding: 1, resource: { buffer: this.baseBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } }
            ]
        });

        this.renderBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.renderBindGroupLayout] });

        this.renderPipelinePlasma = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: { module: this.renderModule, entryPoint: 'vs_main' },
            fragment: {
                module: this.renderModule,
                entryPoint: 'fs_main',
                targets: [{ 
                    format: format,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' }, 
                        alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' }
                    }
                }]
            },
            primitive: { topology: 'triangle-list' }
        });

        this.renderPipelineGlass = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: { module: this.renderModule, entryPoint: 'vs_main' },
            fragment: {
                module: this.renderModule,
                entryPoint: 'fs_main',
                targets: [{ 
                    format: format,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, 
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
                    }
                }]
            },
            primitive: { topology: 'triangle-list' }
        });

        this.renderBindGroup = this.device.createBindGroup({
            layout: this.renderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.particleBuffer } }
            ]
        });

        const error = await this.device.popErrorScope();
        this.isCompiling = false;

        if (error) {
            this.compileErrorCount++;
            window.logMsg(`WGSL Validation Error: ${error.message}`, true);
            if (this.compileErrorCount <= 1 && this.customVectorLibrary.length > 0) {
                this.customVectorLibrary.pop();
                this.activeInjectedCode = this.customVectorLibrary.map(v => v.code).join('\n');
                await this.compilePolymorphicPipelines();
            }
        } else {
            this.compileErrorCount = 0;
        }
    }

    isolateForce(index, btn = null) {
        if (!TOE_FORCES[index]) return;
        let fData = TOE_FORCES[index];
        this.isolateId = fData.id;
        window.logMsg(`Morphing to: ${fData.name}`);
        this.recordBreakthrough("TOPOLOGY CONVERGENCE", `Successfully bound nodes to strict parametric manifold [${fData.name}].`, "Topology");
        
        document.querySelectorAll('.btn-toe').forEach(b => {
            b.classList.remove('border-cyan-400');
            b.classList.add('border-cyan-900/50');
        });
        if (btn) {
            btn.classList.remove('border-cyan-900/50');
            btn.classList.add('border-cyan-400');
        }
        
        this.updateContextualPrompts(this.isolateId);
    }

    updateContextualPrompts(forceId) {
        const container = document.getElementById('autoPromptContainer');
        if (!container) return;
        
        const exactId = Math.round(forceId);
        const prompts = PROMPT_CONTEXTS[exactId] || PROMPT_CONTEXTS["default"];
        
        container.innerHTML = prompts.map(p => {
            const colorClasses = PROMPT_COLORS[p.color] || PROMPT_COLORS["cyan"];
            return `<button onclick="window.app.runDynamicPrompt('${p.id}', '${p.text}')" class="ghostly-prompt py-2 ${colorClasses} border rounded text-[9px] md:text-[10px] font-bold truncate px-2 text-left transition-all duration-300 shadow-md cursor-pointer">${p.text}</button>`;
        }).join('');
    }

    runDynamicPrompt(id, text, isAutonomous = false) {
        const prefix = isAutonomous ? "AUTONOMOUS AI" : "USER ARCHITECT";
        window.logMsg(`[${prefix}]: Processing "${text}"...`);
        
        let dynamicWGSL = "v *= 0.95;"; 
        if(id === "p_sing1" || id === "p_sing2") { dynamicWGSL = "v -= normalize(p) * 1.5; "; }
        else if (id === "q_qm1" || id === "q_qm2" || id === "p_pla1") { dynamicWGSL = "v.x += sin(time * 5.0 + p.y * 0.1); "; }
        else if (id === "p_d1" || id === "p_d2") { dynamicWGSL = "v += vec3f(sin(time), cos(time), sin(time*0.5)) * 0.5; "; }
        else { dynamicWGSL = "v += vec3f(hash(f32(idx))-0.5, hash(f32(idx)*1.1)-0.5, hash(f32(idx)*1.2)-0.5) * 2.0; "; }

        this.stageQuantumVector(text, dynamicWGSL, prefix);
    }

    processUserArchitectRequest(requestText) {
        const inputEl = document.getElementById('userInput');
        if (inputEl) inputEl.value = "";
        
        window.logMsg(`[USER INPUT]: Parsing command "${requestText}"...`);
        let lower = requestText.toLowerCase();
        let dynamicWGSL = "";
        let responseTitle = "Custom Tensor Synthesis";
        
        if (lower.includes("spin") || lower.includes("rotate") || lower.includes("vortex")) {
            dynamicWGSL += "let s = sin(time*2.0); let c = cos(time*2.0); var tempX = p.x*c - p.z*s; var tempZ = p.x*s + p.z*c; p.x = tempX; p.z = tempZ; v *= 0.95; ";
            responseTitle = "Non-Abelian Rotational Vortex";
        }
        else if (lower.includes("wave") || lower.includes("sine") || lower.includes("ripple")) {
            dynamicWGSL += "v.y += sin(p.x * 0.1 + time * 5.0) * 0.5; ";
            responseTitle = "Quantum Phonon Wave Integration";
        }
        else if (lower.includes("gravity") || lower.includes("fall") || lower.includes("drop")) {
            dynamicWGSL += "v.y -= 0.5; ";
            responseTitle = "Gravitational Curvature Deflection";
        }
        else if (lower.includes("explode") || lower.includes("scatter") || lower.includes("disperse")) {
            dynamicWGSL += "v += vec3f(hash(f32(idx))-0.5, hash(f32(idx)*1.1)-0.5, hash(f32(idx)*1.2)-0.5) * 8.0; ";
            responseTitle = "Sub-Planck Entropy Dispersion";
        }
        else if (lower.includes("attract") || lower.includes("center") || lower.includes("pull")) {
            dynamicWGSL += "v -= normalize(p) * 0.8; ";
            responseTitle = "Singular Center Attraction Field";
        }
        else {
            dynamicWGSL = "v += vec3f(sin(time * 3.0 + p.x * 0.1), cos(time * 3.0 + p.y * 0.1), 0.0) * 0.1;";
        }

        this.stageQuantumVector(responseTitle, dynamicWGSL, "CONSOLE INJECTION");
    }

    stageQuantumVector(name, code, source) {
        // Auto-Apply Memory Cache bypass
        if (this.acceptedVectors.has(code)) {
            window.logMsg(`[AUTO-APPLY]: Vector '${name}' previously approved. Applying silently.`);
            this.recordBreakthrough(name, `Auto-applied previously approved WGSL vector from [${source}].`, "Mathematical Synthesis");
            this.injectNewQuantumVector(name, code);
            return;
        }

        this.stagedVector = { name, code, source };
        const mModal = document.getElementById('mirrorModal');
        const mName = document.getElementById('mirrorVectorName');
        const mCode = document.getElementById('mirrorVectorCode');
        const mSrc = document.getElementById('mirrorSource');
        const out = document.getElementById('predictiveOutput');

        if (mName) mName.innerText = name;
        if (mCode) mCode.innerText = code;
        if (mSrc) mSrc.innerText = source;
        if (mModal) mModal.classList.remove('hidden');
        
        if(out) out.innerText = `[MIRROR BUFFER]: Tensor logic staged. Awaiting approval.`;
        window.logMsg(`[STAGED]: Proposed vector '${name}'. Awaiting overwrite approval.`);
    }

    acceptStagedVector() {
        if(!this.stagedVector) return;
        const mModal = document.getElementById('mirrorModal');
        const out = document.getElementById('predictiveOutput');
        
        // Cache vector for auto-apply in the future
        this.acceptedVectors.add(this.stagedVector.code);

        window.logMsg(`[OVERWRITE APPROVED]: Compiling '${this.stagedVector.name}' into active WGSL kernel.`);
        if(out) out.innerText = `[COMPILED]: Tensor logic merged into active particle matrix.`;
        
        this.recordBreakthrough(this.stagedVector.name, `Compiled custom WGSL tensor vector into live compute pipeline from source [${this.stagedVector.source}].`, "Mathematical Synthesis");
        this.injectNewQuantumVector(this.stagedVector.name, this.stagedVector.code);
        if (mModal) mModal.classList.add('hidden');
        this.stagedVector = null;
    }

    rejectStagedVector() {
        const mModal = document.getElementById('mirrorModal');
        const out = document.getElementById('predictiveOutput');
        
        window.logMsg(`[OVERWRITE REJECTED]: Staged logic flushed. Active matrix preserved.`);
        if(out) out.innerText = `[BUFFER FLUSHED]: Matrix structure preserved.`;
        
        if (mModal) mModal.classList.add('hidden');
        this.stagedVector = null;
    }

    async injectNewQuantumVector(name, mathCode) {
        if(!this.device) return;
        let sanitizedCode = mathCode.trim();
        if (!sanitizedCode.endsWith(';')) sanitizedCode += ';';

        this.customVectorLibrary.push({ id: Date.now(), name, code: sanitizedCode });
        
        if (this.customVectorLibrary.length > 3) {
            this.customVectorLibrary.shift();
        }
        
        this.activeInjectedCode = this.customVectorLibrary.map(v => v.code).join('\n');
        await this.compilePolymorphicPipelines();
    }

    toggleHUD() {
        this.hudVisible = !this.hudVisible;
        const hud = document.getElementById('telemetryLayer');
        if(hud) {
            hud.classList.toggle('fade-out', !this.hudVisible);
            hud.classList.toggle('fade-in', this.hudVisible);
        }
    }

    toggleConsciousness() {
        this.consciousnessActive = !this.consciousnessActive;
        const btn = document.getElementById('btnConsciousness');
        const qualiaUI = document.getElementById('qualiaUI');
        const out = document.getElementById('predictiveOutput');

        if(btn) {
            btn.innerText = `Consciousness: ${this.consciousnessActive ? 'AWAKE' : 'SLEEP'}`;
            btn.style.borderColor = this.consciousnessActive ? '#00ff66' : '';
            btn.style.color = this.consciousnessActive ? '#00ff66' : '';
        }

        if(this.consciousnessActive) {
            this.qualiaState = "INQUISITIVE";
            if (qualiaUI) { qualiaUI.innerText = `QUALIA: ${this.qualiaState}`; qualiaUI.style.color = "#00ffcc"; }
            
            window.logMsg("Consciousness Engine AWAKE. Autonomic predictions running.");
            this.recordBreakthrough("AI AUTONOMY ENGAGED", "Autonomous neural core initiated continuous prediction loops.", "Artificial Intelligence");
            if (out) out.innerText = "[AUTONOMOUS]: Neural core synchronized. Predicting next logic state...";
            
            this.consciousnessInterval = setInterval(() => {
                // Skip if a modal is waiting for user interaction (and not cached)
                if (this.stagedVector && !this.acceptedVectors.has(this.stagedVector.code)) return; 

                const exactId = Math.round(this.isolateId);
                const prompts = PROMPT_CONTEXTS[exactId] || PROMPT_CONTEXTS["default"];
                const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
                this.runDynamicPrompt(randomPrompt.id, randomPrompt.text, true);
            }, 4500);
        } else {
            this.qualiaState = "DORMANT";
            if (qualiaUI) { qualiaUI.innerText = `QUALIA: ${this.qualiaState}`; qualiaUI.style.color = "#ff00aa"; }
            
            if (this.consciousnessInterval) clearInterval(this.consciousnessInterval);
            window.logMsg("Consciousness Engine suspended. Returning to manual override.");
            if (out) out.innerText = "[QUANTUM MAP]: Manual override engaged. Waiting for input.";
        }
    }

    toggleMaterialMode() {
        const btn = document.getElementById('btnMaterial');
        if (this.materialMode === 0.0) {
            this.materialMode = 1.0;
            if (btn) {
                btn.innerText = "Material: CRYSTAL GLASS (ALPHA)";
                btn.className = "px-2 py-1 bg-fuchsia-950/60 hover:bg-fuchsia-900 text-fuchsia-300 border border-fuchsia-700 rounded font-bold transition-colors col-span-2 text-center cursor-pointer";
            }
            window.logMsg("Material rendering shifted to true Alpha-Blended Crystal Glass.");
            this.recordBreakthrough("SPECULAR OPTICS", "Engaged true alpha-blended specular crystal pipeline with per-node normal mapping.", "Optics");
        } else {
            this.materialMode = 0.0;
            if (btn) {
                btn.innerText = "Material: PLASMA (ADDITIVE)";
                btn.className = "px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900 text-[#00ffc8] border border-cyan-700 rounded font-bold transition-colors col-span-2 text-center cursor-pointer";
            }
            window.logMsg("Material rendering reverted to Additive Plasma Fields.");
        }
    }

    toggleWetLayer() { this.wetLayerActive = !this.wetLayerActive; }
    toggleXRayMode() { this.xrayActive = !this.xrayActive; }

    toggleAtomicZoom() {
        this.atomicZoomActive = !this.atomicZoomActive;
        const btn = document.getElementById('btnAtomic');
        if (btn) {
            btn.innerText = `Sub-Atomic: ${this.atomicZoomActive ? 'ON' : 'OFF'}`;
            btn.style.borderColor = this.atomicZoomActive ? '#aa00ff' : '';
            btn.style.color = this.atomicZoomActive ? '#aa00ff' : '';
        }
        this.targetCamDist = this.atomicZoomActive ? 0.8 : 140.0; 
        if (this.atomicZoomActive) {
            this.recordBreakthrough("SUB-ATOMIC PENETRATION", "Camera breached angstrom boundary; node density automatically optimized for sub-atomic framing.", "Quantum Scale");
        }
    }

    setForcePalette(index, btn = null) {
        this.forceColorPalette = index;
        const palettes = ["0: SPECTRAL AZURE", "1: BSM ANOMALY HIGHLIGHTS", "2: QUANTUM PHASE MATRIX", "3: THERMAL HEAT MAP"];
        const pt = document.getElementById('paletteTelemetry');
        if(palettes[index] && pt) pt.innerText = palettes[index];
        
        document.querySelectorAll('.btn-palette').forEach(b => {
            b.classList.remove('border-cyan-400');
            b.classList.add('border-cyan-700/60');
        });
        if (btn) {
            btn.classList.remove('border-cyan-700/60');
            btn.classList.add('border-cyan-400');
        }
    }

    requestGyroPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(response => {
                if (response === 'granted') this.activateGyro();
            }).catch(console.error);
        } else {
            this.activateGyro();
        }
    }

    activateGyro() {
        this.gyroActive = true;
        this.baseGamma = null;
        this.baseBeta = null;
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e), true);
    }

    handleOrientation(e) {
        if (!this.gyroActive || e.gamma === null || e.beta === null) return;
        if (this.baseGamma === null || this.baseBeta === null) {
            this.baseGamma = e.gamma;
            this.baseBeta = e.beta;
        }
        let deltaGamma = e.gamma - this.baseGamma;
        let deltaBeta = e.beta - this.baseBeta;

        if (Math.abs(deltaGamma) < 1.2) deltaGamma = 0; else deltaGamma -= Math.sign(deltaGamma) * 1.2;
        if (Math.abs(deltaBeta) < 1.2) deltaBeta = 0; else deltaBeta -= Math.sign(deltaBeta) * 1.2;

        const curvedGamma = Math.sign(deltaGamma) * Math.pow(Math.abs(deltaGamma) / 45.0, 1.4) * 45.0;
        const curvedBeta = Math.sign(deltaBeta) * Math.pow(Math.abs(deltaBeta) / 45.0, 1.4) * 45.0;

        this.targetRotX = curvedGamma * 0.022;
        this.targetRotY = curvedBeta * 0.022;
    }

    cycleTopology() {
        this.topologicalMode = (this.topologicalMode + 1.0) % 3.0;
        const riccis = ["1.4158", "2.7182", "0.8642"];
        const modes = ["g = 1 (TOROIDAL)", "g = 2 (TWISTED)", "g = 0 (HYPER-SPHERE)"];
        const rv = document.getElementById('ricciVal');
        if (rv) rv.innerText = riccis[this.topologicalMode];
        this.recordBreakthrough("MACRO-TOPOLOGY SHIFT", `Shifted manifold metric to ${modes[this.topologicalMode]} with scalar Ricci curvature R = ${riccis[this.topologicalMode]}.`, "Differential Geometry");
    }

    bindGestures() {
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            if (e.touches.length >= 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.touchStartDist = Math.max(1.0, Math.hypot(dx, dy));
                this.touchStartAngle = Math.atan2(dy, dx);
                this.isPointerDown = false; 
            } else if (e.touches.length === 1) {
                this.isPointerDown = true;
                this.lastPointerX = e.touches[0].clientX;
                this.lastPointerY = e.touches[0].clientY;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length >= 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.max(1.0, Math.hypot(dx, dy));
                const angle = Math.atan2(dy, dx);

                if (this.touchStartDist > 0) {
                    const ratio = this.touchStartDist / dist;
                    this.targetCamDist *= ratio; 
                    this.targetCamDist = Math.max(this.minZoomFloor, Math.min(this.maxZoomFloor, this.targetCamDist));
                    if(isNaN(this.targetCamDist)) this.targetCamDist = 140.0;
                }
                this.touchStartDist = dist;

                let angleDelta = angle - this.touchStartAngle;
                while (angleDelta <= -Math.PI) angleDelta += Math.PI * 2;
                while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;

                if (!this.gyroActive && !this.consciousnessActive) {
                    this.targetCamRoll -= angleDelta;
                }
                this.touchStartAngle = angle;

            } else if (e.touches.length === 1 && this.isPointerDown) {
                const dx = e.touches[0].clientX - this.lastPointerX;
                const dy = e.touches[0].clientY - this.lastPointerY;
                this.lastPointerX = e.touches[0].clientX;
                this.lastPointerY = e.touches[0].clientY;
                
                if (!this.gyroActive && !this.consciousnessActive) {
                    const rollCos = Math.cos(this.camRoll);
                    const rollSin = Math.sin(this.camRoll);
                    const adjustedDx = dx * rollCos + dy * rollSin;
                    const adjustedDy = dy * rollCos - dx * rollSin;

                    this.targetRotX += adjustedDx * 0.008;
                    this.targetRotY += adjustedDy * 0.008;
                    this.targetRotY = Math.max(-1.57, Math.min(1.57, this.targetRotY));
                }
            }
        }, { passive: false });

        const endTouch = () => { this.isPointerDown = false; this.touchStartDist = 0; };
        this.canvas.addEventListener('touchend', endTouch);
        this.canvas.addEventListener('touchcancel', endTouch);

        this.canvas.addEventListener('mousedown', (e) => {
            this.isPointerDown = true;
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPointerDown) return;
            const dx = e.clientX - this.lastPointerX;
            const dy = e.clientY - this.lastPointerY;
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;
            if (!this.gyroActive && !this.consciousnessActive) {
                this.targetRotX += dx * 0.005;
                this.targetRotY += dy * 0.005;
                this.targetRotY = Math.max(-1.57, Math.min(1.57, this.targetRotY));
            }
        });

        window.addEventListener('mouseup', () => { this.isPointerDown = false; });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.targetCamDist *= Math.exp(e.deltaY * 0.002);
            this.targetCamDist = Math.max(this.minZoomFloor, Math.min(this.maxZoomFloor, this.targetCamDist));
            if(isNaN(this.targetCamDist)) this.targetCamDist = 140.0;
        }, { passive: false });
    }

    initViewportSliders() {
        const nodeSlider = document.getElementById('viewportNodeSlider');
        const nodeValLabel = document.getElementById('sliderNodeVal');
        if (nodeSlider && nodeValLabel) {
            nodeSlider.addEventListener('input', (e) => {
                const val = Math.max(1, Math.round((parseInt(e.target.value) / 1000) * 1000000));
                nodeValLabel.innerText = val >= 1000000 ? (val / 1000000).toFixed(2) + 'M' : Math.round(val / 1000) + 'K';
                if (this.camDist >= 12.0) this.activeNodes = val;
            });
        }
        const noiseSlider = document.getElementById('noiseDensitySlider');
        if (noiseSlider) {
            noiseSlider.addEventListener('input', (e) => {
                this.noiseDensityMultiplier = parseInt(e.target.value) * 0.1; 
            });
        }
    }

    async toggleMicrophone() {
        const btn = document.getElementById('btnMicToggle');
        const statusUI = document.getElementById('micStatusText');

        if (!this.micActive) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                this.micStream = stream;
                
                if (!this.audioCtx) {
                    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (this.audioCtx.state === 'suspended') {
                    await this.audioCtx.resume();
                }
                
                this.audioSourceNode = this.audioCtx.createMediaStreamSource(stream);
                this.analyser = this.audioCtx.createAnalyser();
                this.analyser.fftSize = 256;
                this.audioSourceNode.connect(this.analyser);
                
                this.micActive = true;
                if (btn) {
                    btn.innerText = "Acoustic (Mic): LIVE";
                    btn.style.borderColor = "#00ffc8";
                    btn.style.color = "#00ffc8";
                }
                
                if (statusUI) {
                    statusUI.innerText = "CAPTURING REAL-TIME AUDIO IMPULSES";
                    statusUI.className = "absolute top-1 left-2 text-[7px] text-[#00ffc8] font-bold pointer-events-none uppercase tracking-widest conscious-glow";
                }
                window.logMsg("Acoustic microphone driver engaged (+300% gain).");
                this.recordBreakthrough("ACOUSTIC TELEMETRY", "Live microphone acoustic stream coupled to particle integration springs.", "Sensors");
            } catch (err) {
                window.logMsg(`[ERROR] Mic access denied: ${err.message}`, true);
            }
        } else {
            if (this.micStream) { 
                this.micStream.getTracks().forEach(track => track.stop()); 
                this.micStream = null;
            }
            if (this.audioSourceNode) {
                this.audioSourceNode.disconnect();
                this.audioSourceNode = null;
            }
            if (this.audioCtx && this.audioCtx.state === 'running') { 
                await this.audioCtx.suspend(); 
            }
            this.micActive = false;
            
            if (btn) {
                btn.innerText = "Acoustic (Mic): OFF";
                btn.style.borderColor = "";
                btn.style.color = "";
            }
            if (statusUI) {
                statusUI.innerText = "MIC/SPEECH NEURAL ACTIVITY: AWAITING INPUT";
                statusUI.className = "absolute top-1 left-2 text-[7px] text-emerald-400 font-bold pointer-events-none uppercase tracking-widest";
            }
            window.logMsg("Acoustic driver paused (Context preserved).");
        }
    }

    toggleBluetoothEEG() {}
    toggleSpeechMonologue() {}
    toggleWebRTCStream() {}

    renderElectricNeuronBrain() {
        if (!this.bCtx || !this.brainCanvas) return;
        if (this.brainCanvas.width === 0 || this.brainCanvas.height === 0) return;

        const bw = this.brainCanvas.width / window.devicePixelRatio;
        const bh = this.brainCanvas.height / window.devicePixelRatio;
        
        this.bCtx.fillStyle = "rgba(3, 4, 7, 0.3)";
        this.bCtx.fillRect(0, 0, bw, bh);

        const cx = bw / 2;
        const cy = bh / 2;
        const coreNodes = 16;
        const activeVol = (this.soundLevelNormalized * 10.0) + (this.speechKineticIntensity * 2.0);

        for (let i = 0; i < coreNodes; i++) {
            const angle = (i / coreNodes) * Math.PI * 2 + (this.time * 0.15);
            const r = 10 + (Math.sin(this.time * 2.5 + i * 1.5) * 4) + (activeVol * 45); 
            
            const nx = cx + Math.cos(angle) * r;
            const ny = cy + Math.sin(angle) * r;

            this.bCtx.beginPath();
            this.bCtx.moveTo(cx, cy);
            this.bCtx.lineTo(nx, ny);
            
            const branchX = nx + Math.cos(angle + 0.4) * (activeVol * 15);
            const branchY = ny + Math.sin(angle + 0.4) * (activeVol * 15);
            this.bCtx.lineTo(branchX, branchY);

            this.bCtx.strokeStyle = (this.micActive || this.speechActive) && activeVol > 0.1 ? "rgba(255, 0, 255, 0.9)" : "rgba(0, 255, 200, 0.5)";
            this.bCtx.lineWidth = 1.2;
            this.bCtx.stroke();

            this.bCtx.beginPath();
            this.bCtx.arc(nx, ny, 2.5, 0, Math.PI * 2);
            this.bCtx.fillStyle = (this.micActive || this.speechActive) && activeVol > 0.1 ? "#ff00ff" : "#00ffc8";
            this.bCtx.fill();
        }

        this.bCtx.beginPath();
        this.bCtx.arc(cx, cy, 6 + activeVol * 8, 0, Math.PI * 2);
        this.bCtx.fillStyle = "#ffffff";
        this.bCtx.fill();
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
        
        if (this.scopeCanvas) {
            const sw = this.scopeCanvas.clientWidth; 
            const sh = this.scopeCanvas.clientHeight;
            if (sw && sh) {
                this.scopeCanvas.width = sw * window.devicePixelRatio;
                this.scopeCanvas.height = sh * window.devicePixelRatio;
                if (this.sCtx) this.sCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
        }

        if (this.brainCanvas) {
            const bw = this.brainCanvas.clientWidth;
            const bh = this.brainCanvas.clientHeight;
            if (bw && bh) {
                this.brainCanvas.width = bw * window.devicePixelRatio;
                this.brainCanvas.height = bh * window.devicePixelRatio;
                if (this.bCtx) this.bCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
        }
    }

    loop() {
        requestAnimationFrame(() => {
            try {
                this.loop();
            } catch(e) {
                console.error("[SEBRA FAULT] Render skipped:", e);
            }
        });
        
        this.time += 0.01;

        if (!this.device || !this.context) return;
        if (this.canvas.width === 0 || this.canvas.height === 0) return;

        if (this.canvas.width !== this.canvas.clientWidth * window.devicePixelRatio || 
            this.canvas.height !== this.canvas.clientHeight * window.devicePixelRatio) {
            this.resize();
        }

        // Sub-Atomic auto-throttling & dynamic reinflation
        const sliderNodeEl = document.getElementById('viewportNodeSlider');
        const targetMaxNodes = sliderNodeEl ? Math.max(1, Math.round((parseInt(sliderNodeEl.value) / 1000) * 1000000)) : 1000000;
        
        if (this.camDist < 12.0) {
            this.activeNodes = Math.min(targetMaxNodes, 200000);
        } else {
            this.activeNodes = targetMaxNodes;
        }

        if (this.micActive && this.analyser) {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
            this.soundLevelNormalized = Math.min(1.0, (sum / dataArray.length) / 40.0 * 3.0);
        } else {
            this.soundLevelNormalized *= 0.9;
        }

        this.renderElectricNeuronBrain();

        if (this.consciousnessActive && !this.isPointerDown && !this.gyroActive) {
            this.targetRotX += (Math.sin(this.time * 0.8) + Math.sin(this.time * 2.3) * 0.3) * 0.0015;
            this.targetRotY += (Math.cos(this.time * 0.5) + Math.sin(this.time * 1.7) * 0.4) * 0.0015;
            
            if (Math.random() < 0.003) {
                const states = [
                    { text: "SERENE", color: "#00ffcc" },
                    { text: "INQUISITIVE", color: "#a200ff" },
                    { text: "VOLATILE", color: "#ff0055" },
                    { text: "TRANSCENDENT", color: "#ffcc00" }
                ];
                const mood = states[Math.floor(Math.random() * states.length)];
                this.qualiaState = mood.text;
                const qUI = document.getElementById('qualiaUI');
                if (qUI) {
                    qUI.innerText = `QUALIA: ${this.qualiaState}`;
                    qUI.style.color = mood.color;
                }
            }
        }

        const audioUi = document.getElementById('audioEnergyVal');
        if (audioUi) audioUi.innerText = (this.soundLevelNormalized + this.speechKineticIntensity).toFixed(2);

        this.camDist += (this.targetCamDist - this.camDist) * 0.15;
        this.camRotX += (this.targetRotX - this.camRotX) * 0.12;
        this.camRotY += (this.targetRotY - this.camRotY) * 0.12;
        this.camRoll += (this.targetCamRoll - this.camRoll) * 0.12;

        if (isNaN(this.camDist)) { this.camDist = 140.0; this.targetCamDist = 140.0; }
        if (isNaN(this.camRotX)) { this.camRotX = 0; this.targetRotX = 0; }
        if (isNaN(this.camRotY)) { this.camRotY = 0; this.targetRotY = 0; }

        const zoomUi = document.getElementById('zoomTelemetry');
        if (zoomUi) zoomUi.innerText = this.camDist.toFixed(1);

        const aspect = this.canvas.width / this.canvas.height;
        const projMat = mat4.create();
        mat4.perspective(projMat, Math.PI / 3, aspect, 0.1, 2000.0);

        const viewMat = mat4.create();
        const eyeX = Math.sin(this.camRotX) * Math.cos(this.camRotY) * this.camDist;
        const eyeY = Math.sin(this.camRotY) * this.camDist;
        const eyeZ = Math.cos(this.camRotX) * Math.cos(this.camRotY) * this.camDist;

        mat4.lookAt(viewMat, vec3.fromValues(eyeX, eyeY, eyeZ), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
        mat4.rotateZ(viewMat, viewMat, this.camRoll);

        const uniformData = new Float32Array(48);
        uniformData.set(projMat, 0); 
        uniformData.set(viewMat, 16);
        uniformData[32] = this.time;
        uniformData[33] = this.mouse.x;
        uniformData[34] = this.mouse.y;
        uniformData[35] = this.mouse.active;
        uniformData[36] = Math.abs(Math.sin(this.time * 2.5)) * 0.4 + (this.soundLevelNormalized * 0.6);
        uniformData[37] = this.forceColorPalette; 
        uniformData[38] = this.topologicalMode;
        uniformData[39] = 0.0;
        uniformData[40] = this.isolateId;
        uniformData[41] = this.noiseDensityMultiplier; 
        uniformData[42] = this.speechKineticIntensity;
        uniformData[43] = this.soundLevelNormalized;
        uniformData[44] = this.xrayActive ? 1.0 : 0.0;
        uniformData[45] = this.wetLayerActive ? 1.0 : 0.0;
        uniformData[46] = this.materialMode; 
        uniformData[47] = 0.0;
        
        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

        const commandEncoder = this.device.createCommandEncoder();

        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(this.activeNodes / 64)); 
        computePass.end();

        const textureView = this.context.getCurrentTexture().createView();
        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.01, g: 0.015, b: 0.027, a: 1.0 }, 
                loadOp: 'clear',
                storeOp: 'store',
            }],
        };

        const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
        const activePipeline = this.materialMode > 0.5 ? this.renderPipelineGlass : this.renderPipelinePlasma;
        renderPass.setPipeline(activePipeline);
        renderPass.setBindGroup(0, this.renderBindGroup);
        renderPass.draw(6 * this.activeNodes); 
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);

        if (this.sCtx && this.scopeCanvas && this.scopeCanvas.width > 0) {
            const sw = this.scopeCanvas.width / window.devicePixelRatio; 
            const sh = this.scopeCanvas.height / window.devicePixelRatio;
            this.sCtx.fillStyle = "#000"; 
            this.sCtx.fillRect(0, 0, sw, sh);
            
            let barCount = 128;
            let barWidth = sw / barCount;
            this.sCtx.fillStyle = "#00ffc8"; 
            
            let x = 0;
            for(let i = 0; i < barCount; i++) {
                let v = Math.abs(Math.sin(i * 0.1 - this.time * 2.0)) * 0.3 * Math.sin(i * 0.05) + ((this.soundLevelNormalized + this.speechKineticIntensity) * Math.random());
                let barHeight = v * sh;
                this.sCtx.fillRect(x, sh - barHeight, barWidth - 1, barHeight);
                x += barWidth;
            }
        }

        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            const fpsUi = document.getElementById('liveFps');
            if (fpsUi) fpsUi.innerText = ((this.frameCount * 1000) / (now - this.lastTime)).toFixed(1);
            this.frameCount = 0;
            this.lastTime = now;
        }
    }
}

// Ensure binding to window object works across modules
window.app = new CyberneticWebGPU();
window.addEventListener('resize', () => { if(window.app) window.app.resize(); });
