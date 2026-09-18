export const getComputeWGSL = (activeInjectedCode = "") => `
    struct Particle { pos: vec4f, vel: vec4f }
    struct BaseData { pos: vec4f }
    struct Uniforms { proj: mat4x4f, view: mat4x4f, params: vec4f, audioData: vec4f, isolation: vec4f, optics: vec4f }

    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
    @group(0) @binding(1) var<storage, read> basePos: array<BaseData>;
    @group(0) @binding(2) var<uniform> uniforms: Uniforms;

    fn hash(n: f32) -> f32 { return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }

    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
        let idx = GlobalInvocationID.x;
        if (idx >= 1000000u) { return; }

        var p = particles[idx].pos.xyz;
        var v = particles[idx].vel.xyz;
        let time = uniforms.params.x;
        let isolateId = uniforms.isolation.x;
        let densityMul = uniforms.isolation.y; 
        let soundLevel = uniforms.audioData.w;
        let speechVal = uniforms.audioData.z; 
        
        var targetBase = basePos[idx].pos.xyz;
        let rId = hash(f32(idx));
        let thetaR = rId * 6.2831853;
        let idxF = f32(idx);

        if (isolateId > 0.5) {
            if (isolateId < 1.5) { 
                let grid = 60.0;
                let x = (idxF % grid) - grid/2.0;
                let y = floor((idxF / grid) % grid) - grid/2.0;
                let z = floor(idxF / (grid * grid)) * 12.0 - 30.0;
                targetBase = vec3f(x * 1.8, y * 1.8, z * 1.8);
            } else if (isolateId < 2.5) { 
                let thetaBlob = hash(idxF * 1.1) * 6.28318;
                let phiBlob = acos(2.0 * hash(idxF * 1.2) - 1.0);
                let r = 35.0 + 8.0 * sin(time * 2.0 + hash(idxF*2.0)*6.28);
                targetBase = vec3f(r * sin(phiBlob) * cos(thetaBlob), r * sin(phiBlob) * sin(thetaBlob), r * cos(phiBlob));
            } else if (isolateId < 3.5) { 
                let golden_angle = 2.399963;
                let r = sqrt(idxF) * 0.08;
                let thetaSp = idxF * golden_angle;
                let z = sin(r * 0.1 - time * 3.0) * 8.0;
                targetBase = vec3f(cos(thetaSp) * r, sin(thetaSp) * r, z);
            } else if (isolateId < 4.5) { 
                let t = idxF * 0.00008 + time * 0.05;
                let a = 1.4; let b = 1.56; let c = 1.4; let d = -1.56;
                let baseR = hash(idxF) * 20.0;
                targetBase = vec3f(
                    sin(a * baseR) + c * cos(a * t),
                    sin(b * t) + d * cos(b * baseR),
                    sin(t * 5.0) * 15.0
                ) * 30.0;
            } else if (isolateId < 5.5) { 
                let tKnot = fract(idxF * 0.0001) * 6.28318 * 2.0;
                let pKnot = 3.0; let qKnot = 2.0;
                let r1 = 45.0; let r2 = 18.0 + sin(idxF * 0.05 + time) * 4.0;
                let knotX = (r1 + r2 * cos(qKnot * tKnot)) * cos(pKnot * tKnot);
                let knotY = (r1 + r2 * cos(qKnot * tKnot)) * sin(pKnot * tKnot);
                let knotZ = r2 * sin(qKnot * tKnot);
                targetBase = vec3f(knotX, knotZ, knotY);
            } else if (isolateId < 6.5) { 
                let ringCount = 7.0;
                let ring = floor(fract(idxF * 0.123) * ringCount);
                let thetaRings = fract(idxF * 0.456) * 6.28318;
                let rad = 15.0 + ring * 12.0;
                let thickness = (hash(idxF) - 0.5) * 6.0;
                targetBase = vec3f(
                    (rad + thickness) * cos(thetaRings + time * (1.0 - ring * 0.15)),
                    (hash(idxF * 1.5) - 0.5) * 4.0,
                    (rad + thickness) * sin(thetaRings + time * (1.0 - ring * 0.15))
                );
            } else if (isolateId < 7.5) { 
                let orbitId = floor(fract(idxF * 0.777) * 3.0);
                let tOrb = fract(idxF * 0.0005) * 6.28318;
                let orbRadius = 45.0;
                if (orbitId == 0.0) {
                    targetBase = vec3f(cos(tOrb + time)*orbRadius, sin(tOrb * 3.0)*15.0, sin(tOrb + time)*orbRadius);
                } else if (orbitId == 1.0) {
                    targetBase = vec3f(cos(tOrb*2.0 - time)*orbRadius*0.8, sin(tOrb - time)*orbRadius, sin(tOrb*2.0)*15.0);
                } else {
                    targetBase = vec3f(sin(tOrb*1.5 + time)*30.0, cos(tOrb*1.5 + time)*30.0, cos(tOrb*3.0)*20.0);
                }
            } else {
                let phiR = acos(2.0 * fract(rId * 73.123) - 1.0);
                let rSphere = vec3f(sin(phiR)*cos(thetaR), sin(phiR)*sin(thetaR), cos(phiR));
                targetBase = rSphere * (20.0 + fract(rId * 99.9)*25.0);
            }
        }

        let mousePos = vec3f(uniforms.params.y, uniforms.params.z, 0.0);
        let isInteracting = uniforms.params.w;
        let bass = uniforms.audioData.x;

        let maxForce = 4.5 + ((soundLevel + speechVal) * 25.0);
        let forceRadius = 40.0;
        let friction = 0.75; 
        let returnForce = 0.15 + (bass * 0.05);

        if (isInteracting > 0.5 || soundLevel > 0.05 || speechVal > 0.01) {
            let distVec = mousePos - p;
            let distSq = dot(distVec, distVec);
            if (distSq < forceRadius * forceRadius && distSq > 0.1) {
                let dist = sqrt(distSq);
                let force = (forceRadius - dist) / forceRadius;
                v += (distVec / dist) * force * maxForce;
            }
        }

        let speechTurb = speechVal * 3.5 * sin(time * 10.0 + p.x * 0.2);
        v.x += (sin(time * 2.5 + p.y * 0.08 * densityMul) * (0.05 + soundLevel * 0.8)) + speechTurb;
        v.y += (cos(time * 2.7 + p.x * 0.08 * densityMul) * (0.05 + soundLevel * 0.8)) + speechTurb;
        v.z += (sin(time * 2.1 + p.z * 0.08 * densityMul) * (0.05 + soundLevel * 0.8)) + speechTurb;

        ${activeInjectedCode}

        v += (targetBase - p) * returnForce;
        v *= friction;
        p += v;

        if (length(v) > 200.0 || length(p) > 2000.0) {
            v = vec3f(0.0);
            p = targetBase;
        }

        particles[idx].pos = vec4f(p, 1.0);
        particles[idx].vel = vec4f(v, length(v)); 
    }
`;

export const renderWGSL = `
    struct Uniforms { proj: mat4x4f, view: mat4x4f, params: vec4f, audioData: vec4f, isolation: vec4f, optics: vec4f }
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexOutput {
        @builtin(position) Position : vec4f,
        @location(0) color : vec3f,
        @location(1) pointCoord : vec2f,
        @location(2) distToCam : f32,
        @location(3) materialMode: f32,
    }

    struct Particle { pos: vec4f, vel: vec4f }
    @group(0) @binding(1) var<storage, read> particles: array<Particle>;

    @vertex
    fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
        var output : VertexOutput;
        
        let particleIdx = VertexIndex / 6u;
        let quadVertexIdx = VertexIndex % 6u;
        let p = particles[particleIdx].pos.xyz;
        let velMag = particles[particleIdx].vel.w; 
        
        var offsets = array<vec2f, 6>(
            vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
            vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0)
        );
        let offset = offsets[quadVertexIdx];
        
        let time = uniforms.params.x;
        let bass = uniforms.audioData.x;
        let speechVal = uniforms.audioData.z;
        let soundLevel = uniforms.audioData.w;
        let colorPalette = uniforms.audioData.y;
        let isolateId = uniforms.isolation.x;

        let isXRay = uniforms.optics.x > 0.5;
        let isWetLayer = uniforms.optics.y > 0.5;
        output.materialMode = uniforms.optics.z;

        let bioPulse = (sin(time * 2.0 + f32(particleIdx) * 0.001) * 0.15) + 1.0;
        let sparkHash = fract(sin(f32(particleIdx) * 12.9898 + time * 1.5) * 43758.5453);
        let isSpark = step(0.998, sparkHash); 

        var spectralCol = vec3f(0.0, 0.95, 1.0);
        let yRatio = (p.y + 120.0) / 240.0;
        
        let baseSize = 0.04 + (speechVal * 0.02) + (soundLevel * 0.02);
        var targetSize = baseSize * bioPulse;

        if (colorPalette < 0.5) {
            if (isolateId < 1.5) { spectralCol = vec3f(0.0, 0.8, 0.9); } 
            else if (isolateId < 2.5) { spectralCol = vec3f(0.0, 0.7, 1.0); } 
            else if (isolateId < 3.5) { let cs = fract(f32(particleIdx)*0.001); spectralCol = mix(vec3f(0.0, 1.0, 0.6), vec3f(0.3, 0.5, 1.0), cs); } 
            else if (isolateId < 4.5) { spectralCol = mix(vec3f(1.0, 0.6, 0.1), vec3f(1.0, 0.9, 0.4), clamp(velMag*0.5, 0.0, 1.0)); } 
            else if (isolateId < 5.5) { spectralCol = mix(vec3f(0.0, 0.8, 1.0), vec3f(1.0, 0.0, 0.8), fract(f32(particleIdx)*0.01)); }
            else if (isolateId < 6.5) { spectralCol = mix(vec3f(0.0, 1.0, 0.8), vec3f(0.0, 0.4, 1.0), fract(f32(particleIdx)*0.1)); }
            else if (isolateId < 7.5) { let orbId = floor(fract(f32(particleIdx)*0.777)*3.0); 
                if (orbId == 0.0) { spectralCol = vec3f(1.0, 0.4, 0.0); } 
                else if (orbId == 1.0) { spectralCol = vec3f(0.2, 0.6, 1.0); } 
                else { spectralCol = vec3f(1.0, 0.8, 0.2); }
            }
            else { spectralCol = vec3f(yRatio, 1.0 - yRatio, 0.8 + yRatio * 0.2); }
        } else if (colorPalette < 1.5) {
            if (sin(p.x * 0.1 + p.y * 0.1) > 0.6) { spectralCol = vec3f(1.0, 0.15, 0.25); } else { spectralCol = vec3f(0.95, 0.8, 0.1); }
        } else if (colorPalette < 2.5) {
            let phaseVal = sin(length(p) * 0.05 + time);
            spectralCol = vec3f(0.6 + 0.4 * phaseVal, 0.1, 0.9 + 0.1 * phaseVal);
        } else {
            spectralCol = mix(vec3f(0.1, 0.3, 1.0), vec3f(1.0, 0.4, 0.0), clamp(velMag * 0.25, 0.0, 1.0));
        }

        if (isWetLayer) { spectralCol = mix(spectralCol, vec3f(0.0, 0.9, 0.6), clamp(velMag * 0.4, 0.0, 1.0) * 0.7); targetSize *= 3.5; }
        if (isXRay) { spectralCol = mix(spectralCol, vec3f(1.0, 0.0, 0.8), clamp(velMag * 0.85, 0.0, 1.0)); }
        if (isSpark > 0.5) { spectralCol = mix(spectralCol, vec3f(1.0, 1.0, 1.0), 0.8); targetSize *= 2.0; }
        if (output.materialMode > 0.5) { targetSize *= 1.4; }

        var mvPosition = uniforms.view * vec4f(p, 1.0);
        let distToCam = max(length(mvPosition.xyz), 0.001);

        let scaleFactor = clamp(100.0 / distToCam, 0.1, 50.0);
        let size = targetSize * scaleFactor; 

        mvPosition.x += offset.x * size;
        mvPosition.y += offset.y * size;
        
        output.Position = uniforms.proj * mvPosition;
        output.color = spectralCol;
        output.pointCoord = offset; 
        output.distToCam = distToCam;
        
        return output;
    }

    @fragment
    fn fs_main(@location(0) color : vec3f, @location(1) pointCoord : vec2f, @location(2) distToCam : f32, @location(3) materialMode : f32) -> @location(0) vec4f {
        let distSq = dot(pointCoord, pointCoord);
        if (distSq > 1.0) { discard; }
        
        var finalColor = color;
        var finalAlpha = (1.0 - distSq) * 0.15;

        if (materialMode > 0.5) {
            let z = sqrt(max(0.0, 1.0 - distSq));
            let normal = normalize(vec3f(pointCoord.x, pointCoord.y, z));
            let lightDir = normalize(vec3f(0.6, 0.8, 0.5));
            let viewDir = vec3f(0.0, 0.0, 1.0);
            let halfVector = normalize(lightDir + viewDir);
            let specular = pow(max(dot(normal, halfVector), 0.0), 48.0);
            
            finalColor = mix(color * 0.5, vec3f(1.0, 1.0, 1.0), specular * 0.95);
            finalAlpha = clamp((1.0 - distSq) * 0.85, 0.0, 0.95); 
        } else {
            finalColor = color * 1.5;
        }
        
        return vec4f(finalColor, finalAlpha); 
    }
`;
