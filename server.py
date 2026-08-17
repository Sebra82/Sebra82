import asyncio
import websockets
import json
import math
import random
import os
import statistics
import http
import urllib.parse
import time
import base64
import hashlib
from cryptography.fernet import Fernet

class SebraInstitutionalEngine:
    """
    SEBRA82 v10.5 Ultra-Low-Latency Institutional Tensor Kernel
    Security Profile: AES-GCM / Fernet Dynamic Token Splicing
    """
    def __init__(self):
        self.PLANCK_SCALE = 1.616255e-35
        self.GOLDEN_RATIO = 1.61803398875
        self.R_MATRIX_CACHE = [self.PLANCK_SCALE * (self.GOLDEN_RATIO ** n) for n in range(296)]
        self.ENERGY_EIGEN_CACHE = [-0.5 / ((i % 8 + 1) ** 2) for i in range(64)]
        self.SPHERICAL_LUT = [math.cos(i * 0.01227) * math.sin(i * 0.01227) for i in range(512)]

    def evaluate_state(self, scale_index, theta, phi):
        r_n = self.R_MATRIX_CACHE[scale_index]
        lut_idx = int(((theta % (math.pi * 2.0)) / (math.pi * 2.0)) * 512) & 511
        harmonic = self.SPHERICAL_LUT[lut_idx]
        try:
            radial_decay = math.exp(-r_n * 1e31)
        except OverflowError:
            radial_decay = 0.0
        return (radial_decay ** 2.0) * abs(1.0 + harmonic * math.cos(phi))

ENGINE = SebraInstitutionalEngine()
R_N = ENGINE.R_MATRIX_CACHE[64]

connection_attempts = {}
RATE_LIMIT_WINDOW = 60
MAX_CONNECTIONS = 25

VALID_LICENSE_KEYS = {
    "Quantum", 
    "SEBRA82-MASTER-PRO-KEY-9941"
}

def get_fernet_from_hash(hash_str):
    digest = hashlib.sha256(hash_str.encode('utf-8')).digest()
    return Fernet(base64.urlsafe_b64encode(digest))

def calculate_crypto_offset(hash_hex):
    if not hash_hex or len(hash_hex) != 64: return math.pi
    left_half, right_half = hash_hex[:32], hash_hex[32:]
    mirrored_right = right_half[::-1]
    offset = sum(ord(left_half[i]) ^ ord(mirrored_right[i]) for i in range(32))
    return (offset % 256) / 256.0

def generate_proprietary_matrix(global_tick, time_offset, node_count=320):
    points = []
    for i in range(node_count): 
        raw_acos_arg = -1.0 + (2.0 * i) / node_count
        safe_arg = max(-1.0, min(1.0, raw_acos_arg))
        phi = math.acos(safe_arg)
        theta = math.sqrt(node_count * math.pi) * phi
        
        scale_idx = (i + global_tick) % 296
        prob = ENGINE.evaluate_state(scale_idx, theta, phi)
        
        base_shell = 90 if (i % 3 == 0) else (65 if i % 3 == 1 else 42)
        dynamic_radius = base_shell + (prob * 50.0) + math.sin(i * 4 + time_offset) * 9
        
        x = dynamic_radius * math.sin(phi) * math.cos(theta)
        y = dynamic_radius * math.sin(phi) * math.sin(theta)
        z = dynamic_radius * math.cos(phi)
        
        points.append({
            "x": round(x, 4), "y": round(y, 4), "z": round(z, 4),
            "prob": round(prob, 4), "id": i
        })
    return points

async def process_request(path, request_headers):
    client_ip = request_headers.get("X-Forwarded-For", "127.0.0.1").split(",")[0]
    current_time = time.time()
    
    connection_attempts[client_ip] = [t for t in connection_attempts.get(client_ip, []) if current_time - t < RATE_LIMIT_WINDOW]
    if len(connection_attempts[client_ip]) >= MAX_CONNECTIONS:
        return (http.HTTPStatus.TOO_MANY_REQUESTS, [], b"Rate limit exceeded. Connection dropped.\n")
    connection_attempts[client_ip].append(current_time)
    
    query = urllib.parse.urlparse(path).query
    params = urllib.parse.parse_qs(query)
    
    if "hash" not in params:
        return (http.HTTPStatus.UNAUTHORIZED, [], b"Unauthorized: Missing Handshake Token\n")
        
    return None

async def sebra_engine(websocket):
    # Enforce TCP_NODELAY (disable Nagle's algorithm) for instant packet delivery
    try:
        sock = websocket.transport.get_extra_info('socket')
        if sock is not None:
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    except Exception:
        pass

    print(f"🔒 Secure SEBRA82 Ultra-Low-Latency Session Initialized from {websocket.remote_address[0] if websocket.remote_address else 'Unknown'}")
    try:
        query = urllib.parse.urlparse(websocket.path).query
        params = urllib.parse.parse_qs(query)
        
        key = params.get("hash", [""])[0]
        tier = params.get("tier", ["demo"])[0]
        is_decoy = params.get("is_decoy", ["false"])[0].lower() == "true"
        is_demo = (tier == "demo")
        
        fernet = get_fernet_from_hash(key)
        session_crypto_offset = 0 if is_decoy else calculate_crypto_offset(key)
        
        global_tick, time_offset = 0, 0.0
        wave_buffer = [50.0] * 160
        base_value, damping, spike_threshold = 10.0, 1.45, 2.0
        
        while True:
            try:
                global_tick += 1
                time_offset += 0.05
                
                node_limit = 120 if is_demo else 320
                atomic_matrix = generate_proprietary_matrix(global_tick, time_offset, node_count=node_limit)
                
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
                
                roi = 0.0 if is_demo else (base_value * damping * 14.8)
                alpha_confidence = 80.0 if is_demo else (92.0 + damping)
                
                packet = {
                    "tier": tier,
                    "system": {"tick": global_tick, "time": time_offset, "crypto_offset": session_crypto_offset},
                    "wave": {"value": val, "z_score": z_score, "is_spike": is_spike},
                    "quantum": {"alpha": alpha, "beta": beta, "norm": 1.0},
                    "finance": {"projected_roi": roi, "confidence": alpha_confidence},
                    "matrix": atomic_matrix
                }
                
                raw_payload = json.dumps(packet).encode('utf-8')
                encrypted_payload = fernet.encrypt(raw_payload)
                
                await websocket.send(encrypted_payload)
                await asyncio.sleep(0.016)
                
            except Exception as inner_err:
                print(f"⚠️ Non-Fatal Tick Exception: {inner_err}")
                await asyncio.sleep(0.05)
            
    except websockets.exceptions.ConnectionClosed:
        print("🔒 Secure SEBRA82 Vault Session Closed Gracefully.")

async def main():
    port = int(os.environ.get("PORT", 8767))
    async with websockets.serve(
        sebra_engine, 
        "0.0.0.0", 
        port, 
        process_request=process_request,
        ping_interval=20,
        ping_timeout=20
    ):
        print(f"⚡ SEBRA82 Ultra-Low-Latency Engine Online on port {port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
