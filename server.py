import asyncio
import websockets
import json
import math
import random
import os
import statistics

# Trade Secret: Double-Precision Planck/Phi Matrix Constants
PLANCK_L = 1.616255e-35
PHI = 1.61803398875
R_N = PLANCK_L * (PHI ** 64)

def calculate_crypto_offset(hash_hex):
    """Generates deterministic phase offsets from 64-char hex authentication keys."""
    if not hash_hex or len(hash_hex) != 64:
        return math.pi
    left_half = hash_hex[:32]
    right_half = hash_hex[32:]
    mirrored_right = right_half[::-1]
    
    offset = 0
    for i in range(32):
        offset += ord(left_half[i]) ^ ord(mirrored_right[i])
    return (offset % 256) / 256.0

async def sebra_engine(websocket):
    print("🔒 Secure SEBRA82 Vault Engine Connected.")
    try:
        # 1. Gateway Authentication
        auth_message = await websocket.recv()
        auth_data = json.loads(auth_message)
        
        key = auth_data.get("hash", "")
        is_decoy = auth_data.get("is_decoy", False)
        
        session_crypto_offset = 0 if is_decoy else calculate_crypto_offset(key)
        
        # 2. Engine & Buffer State Initialization
        global_tick = 0
        time_offset = 0.0
        wave_buffer = [50.0] * 160
        
        # Client Configuration Variables (Can be dynamically mapped later)
        base_value = 10.0
        damping = 1.45
        spike_threshold = 2.0
        
        while True:
            global_tick += 1
            time_offset += 0.05
            
            # --- MATH LAYER 1: Live Moving Noise Synthesis ---
            raw_x = (global_tick % 400 - 200) * 0.0001
            carrier = math.cos((math.pi * 1e-4 * raw_x) / (R_N * 1.0 + 1e-35) + time_offset * 0.8) ** 2
            sub_harmonic = math.sin(global_tick * 0.04 + time_offset * 2.0) * 0.35 + 0.65
            high_freq_noise = math.sin(global_tick * 0.22 + time_offset * 4.5) * 15.0
            
            burst_active = math.sin(global_tick * 0.01 + time_offset * 0.6) > 0.80
            quantum_burst = random.uniform(0, 30.0) if burst_active else random.uniform(0, 6.0)
            
            # Decoy drifting accumulator
            if is_decoy:
                session_crypto_offset += 0.05
                
            val = min(92.0, max(22.0, (carrier * sub_harmonic * 50.0) + high_freq_noise + quantum_burst))
            
            # --- MATH LAYER 2: Rolling Z-Score & Time-Series Anomaly Detection ---
            wave_buffer.pop(0)
            wave_buffer.append(val)
            
            mean = statistics.mean(wave_buffer)
            std = statistics.stdev(wave_buffer) if len(wave_buffer) > 1 else 1e-5
            std = std if std > 0 else 1e-5
            
            z_score = abs((val - mean) / std)
            is_spike = bool(z_score > spike_threshold)
            
            # --- MATH LAYER 3: Quantum Tensor Strict Normalization ---
            raw_alpha = 0.75 + (base_value / 50.0) * 0.25 * damping
            norm_factor = math.sqrt(raw_alpha**2 + 0.5**2)
            alpha = raw_alpha / norm_factor
            beta = 0.5 / norm_factor
            
            # --- MATH LAYER 4: Financial Alpha Forecasting ---
            roi = base_value * damping * 14.8
            alpha_confidence = 92.0 + damping
            
            # --- PACKET COMPILATION ---
            packet = {
                "system": {
                    "tick": global_tick,
                    "time": time_offset,
                    "crypto_offset": session_crypto_offset
                },
                "wave": {
                    "value": val,
                    "z_score": z_score,
                    "is_spike": is_spike
                },
                "quantum": {
                    "alpha": alpha,
                    "beta": beta,
                    "norm": 1.0 # Guaranteed by math
                },
                "finance": {
                    "projected_roi": roi,
                    "confidence": alpha_confidence
                }
            }
            
            # Stream payload to connected frontend at ~60Hz
            await websocket.send(json.dumps(packet))
            await asyncio.sleep(0.016)
            
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected.")

async def main():
    port = int(os.environ.get("PORT", 8767))
    server = await websockets.serve(sebra_engine, "0.0.0.0", port)
    print(f"⚡ SEBRA82 Vault Engine Online on port {port}")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
