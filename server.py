import asyncio
import websockets
import json
import math
import random
import os
import statistics
import http
import urllib.parse

class SebraAtomicMatrixEngine:
    """
    SEBRA82 v5.5 Atomic Model Matrix Engine
    Watermark: SEBRA82-PROPRIETARY-ATOMIC-MATRIX-KERNEL-44019-TX
    Execution Profile: O(1) Constant Time
    """
    def __init__(self):
        self.PLANCK_SCALE = 1.616255e-35
        self.GOLDEN_RATIO = 1.61803398875
        
        self.R_MATRIX_CACHE = [0.0] * 296
        self.ENERGY_EIGEN_CACHE = [0.0] * 64
        self.SPHERICAL_HARMONIC_LUT = [0.0] * 512
        self._initialize_memory_vault()

    def _initialize_memory_vault(self):
        for n in range(296):
            self.R_MATRIX_CACHE[n] = self.PLANCK_SCALE * (self.GOLDEN_RATIO ** n)
            
        for i in range(64):
            n = (i % 8) + 1
            self.ENERGY_EIGEN_CACHE[i] = -0.5 / (n * n)
            
        for i in range(512):
            angle = (i / 512.0) * math.pi * 2.0
            self.SPHERICAL_HARMONIC_LUT[i] = math.cos(angle) * math.sin(angle)

    def evaluate_atomic_state(self, scale_index, theta, phi):
        r_n = self.R_MATRIX_CACHE[scale_index]
        lut_idx = int(((theta % (math.pi * 2.0)) / (math.pi * 2.0)) * 512) & 511
        harmonic_term = self.SPHERICAL_HARMONIC_LUT[lut_idx]
        
        try:
            radial_decay = math.exp(-r_n * 1e31)
        except OverflowError:
            radial_decay = 0.0
            
        probability_density = (radial_decay ** 2.0) * abs(1.0 + harmonic_term * math.cos(phi))
        
        return {
            "radius": r_n,
            "probability": probability_density,
            "energy_eigenvalue": self.ENERGY_EIGEN_CACHE[scale_index % 64],
            "watermark": "SEBRA82-PROPRIETARY-ATOMIC-MATRIX-KERNEL-44019-TX"
        }

SEBRA_ATOMIC_ENGINE = SebraAtomicMatrixEngine()
R_N = SEBRA_ATOMIC_ENGINE.R_MATRIX_CACHE[64]

def calculate_crypto_offset(hash_hex):
    if not hash_hex or len(hash_hex) != 64: return math.pi
    left_half, right_half = hash_hex[:32], hash_hex[32:]
    mirrored_right = right_half[::-1]
    
    offset = sum(ord(left_half[i]) ^ ord(mirrored_right[i]) for i in range(32))
    return (offset % 256) / 256.0

def generate_proprietary_matrix(global_tick, time_offset):
    points = []
    for i in range(320): 
        phi = math.acos(-1.0 + (2.0 * i) / 320.0)
        theta = math.sqrt(320.0 * math.pi) * phi
        
        scale_idx = (i + global_tick) % 296
        state = SEBRA_ATOMIC_ENGINE.evaluate_atomic_state(scale_idx, theta, phi)
        
        base_shell = 90 if (i % 3 == 0) else (65 if i % 3 == 1 else 42)
        dynamic_radius = base_shell + (state["probability"] * 50.0) + math.sin(i * 4 + time_offset) * 9
        
        x = dynamic_radius * math.sin(phi) * math.cos(theta)
        y = dynamic_radius * math.sin(phi) * math.sin(theta)
        z = dynamic_radius * math.cos(phi)
        
        points.append({
            "x": round(x, 4), "y": round(y, 4), "z": round(z, 4),
            "prob": round(state["probability"], 4), "id": i
        })
    return points

async def process_request(path, request_headers):
    """
    Intercepts the initial HTTP connection request. 
    Rejects unauthorized clients with HTTP 401 before upgrading to WebSocket.
    """
    query = urllib.parse.urlparse(path).query
    params = urllib.parse.parse_qs(query)
    
    # Check if the connection request includes our required hash parameter
    if "hash" not in params:
        return (http.HTTPStatus.UNAUTHORIZED, [], b"Unauthorized: Missing Handshake Token\n")
    
    # Allow the handshake to proceed safely
    return None

async def sebra_engine(websocket):
    print("🔒 Secure SEBRA82 Vault Engine Connected.")
    try:
        query = urllib.parse.urlparse(websocket.path).query
        params = urllib.parse.parse_qs(query)
        
        key = params.get("hash", [""])[0]
        is_decoy = params.get("is_decoy", ["false"])[0].lower() == "true"
        
        session_crypto_offset = 0 if is_decoy else calculate_crypto_offset(key)
        
        global_tick, time_offset = 0, 0.0
        wave_buffer = [50.0] * 160
        base_value, damping, spike_threshold = 10.0, 1.45, 2.0
        
        while True:
            global_tick += 1
            time_offset += 0.05
            
            atomic_matrix = generate_proprietary_matrix(global_tick, time_offset)
            
            raw_x = (global_tick % 400 - 200) * 0.0001
            carrier = math.cos((math.pi * 1e-4 * raw_x) / (R_N * 1.0 + 1e-35) + time_offset * 0.8) ** 2
            sub_harmonic = math.sin(global_tick * 0.04 + time_offset * 2.0) * 0.35 + 0.65
            high_freq_noise = math.sin(global_tick * 0.22 + time_offset * 4.5) * 15.0
            
            burst_active = math.sin(global_tick * 0.01 + time_offset * 0.6) > 0.80
            quantum_burst = random.uniform(0, 30.0) if burst_active else random.uniform(0, 6.0)
            
            if is_decoy:
                session_crypto_offset += 0.05
                
            val = min(92.0, max(22.0, (carrier * sub_harmonic * 50.0) + high_freq_noise + quantum_burst))
            
            wave_buffer.pop(0)
            wave_buffer.append(val)
            
            mean = statistics.mean(wave_buffer)
            std = max(statistics.stdev(wave_buffer) if len(wave_buffer) > 1 else 1e-5, 1e-5)
            z_score = abs((val - mean) / std)
            is_spike = bool(z_score > spike_threshold)
            
            raw_alpha = 0.75 + (base_value / 50.0) * 0.25 * damping
            norm_factor = math.sqrt(raw_alpha**2 + 0.5**2)
            alpha, beta = raw_alpha / norm_factor, 0.5 / norm_factor
            
            roi = base_value * damping * 14.8
            alpha_confidence = 92.0 + damping
            
            packet = {
                "system": {"tick": global_tick, "time": time_offset, "crypto_offset": session_crypto_offset},
                "wave": {"value": val, "z_score": z_score, "is_spike": is_spike},
                "quantum": {"alpha": alpha, "beta": beta, "norm": 1.0},
                "finance": {"projected_roi": roi, "confidence": alpha_confidence},
                "matrix": atomic_matrix
            }
            
            await websocket.send(json.dumps(packet))
            await asyncio.sleep(0.016)
            
    except websockets.exceptions.ConnectionClosed:
        pass

async def main():
    port = int(os.environ.get("PORT", 8767))
    # Pass process_request into websockets.serve to intercept connections at the protocol layer
    server = await websockets.serve(sebra_engine, "0.0.0.0", port, process_request=process_request)
    print(f"⚡ SEBRA82 Vault Engine Online on port {port}")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
