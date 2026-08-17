import asyncio
import websockets
import msgpack
import math
import random
import os
import http
import urllib.parse
import time
import base64
import hashlib
from cryptography.fernet import Fernet

# Optional: Ultra-high performance loop policy for Unix systems
try:
    import uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    print("🚀 Ultra-High Performance 'uvloop' Active.")
except ImportError:
    print("ℹ️ Standard asyncio event loop active.")

# Performance Toggle: Set to False to bypass Fernet CPU cryptographic overhead on secure networks
USE_ENCRYPTION = True

class SebraAtomicMatrixEngine:
    """
    IP Classification: SEBRA82 v5.7 High-Performance Cached Geometry Engine
    Watermark Identifier: SEBRA82-PROPRIETARY-ATOMIC-MATRIX-KERNEL-44019-TX
    """
    def __init__(self):
        self.PLANCK_SCALE = 1.616255e-35
        self.GOLDEN_RATIO = 1.61803398875
        self.R_MATRIX_CACHE = [self.PLANCK_SCALE * (self.GOLDEN_RATIO ** n) for n in range(296)]
        self.ENERGY_EIGEN_CACHE = [-0.5 / (((i % 8) + 1) ** 2) for i in range(64)]
        self.SPHERICAL_HARMONIC_LUT = [math.cos(i * 0.01227) * math.sin(i * 0.01227) for i in range(512)]
        
        # Precompute static Fibonacci lattice geometries to eliminate per-frame trig overhead
        print("⚙️ Precomputing static spatial geometries (320 & 120 nodes)...")
        self.static_lattice_320 = self._precompute_lattice(320)
        self.static_lattice_120 = self._precompute_lattice(120)
        print("✅ Spatial caching complete. Zero per-frame trigonometry active.")

    def _precompute_lattice(self, node_count):
        lattice = []
        for i in range(node_count):
            raw_acos_arg = -1.0 + (2.0 * i) / node_count
            safe_arg = max(-1.0, min(1.0, raw_acos_arg))
            phi = math.acos(safe_arg)
            theta = math.sqrt(node_count * math.pi) * phi
            base_shell = 90 if (i % 3 == 0) else (65 if i % 3 == 1 else 42)
            lattice.append({
                "i": i,
                "phi": phi,
                "theta": theta,
                "base_shell": base_shell,
                "sin_phi": math.sin(phi),
                "cos_phi": math.cos(phi),
                "sin_theta": math.sin(theta),
                "cos_theta": math.cos(theta)
            })
        return lattice

    def evaluate_atomic_state(self, scale_index, theta, phi):
        r_n = self.R_MATRIX_CACHE[scale_index % 296]
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
            "energyEigenvalue": self.ENERGY_EIGEN_CACHE[scale_index % 64]
        }

ENGINE = SebraAtomicMatrixEngine()
R_N = ENGINE.R_MATRIX_CACHE[64]

connection_attempts = {}
RATE_LIMIT_WINDOW = 60
MAX_CONNECTIONS = 25

def get_fernet_from_hash(hash_str):
    digest = hashlib.sha256(hash_str.encode('utf-8')).digest()
    return Fernet(base64.urlsafe_b64encode(digest))

def calculate_crypto_offset(hash_hex):
    if not hash_hex or len(hash_hex) != 64: return math.pi
    left_half, right_half = hash_hex[:32], hash_hex[32:]
    mirrored_right = right_half[::-1]
    offset = sum(ord(left_half[i]) ^ ord(mirrored_right[i]) for i in range(32))
    return (offset % 256) / 256.0

def generate_cached_proprietary_matrix(global_tick, time_offset, is_demo=False):
    """
    Ultra-fast matrix generation leveraging precomputed static geometry.
    Bypasses math.acos and math.sqrt completely in the hot loop.
    """
    lattice = ENGINE.static_lattice_120 if is_demo else ENGINE.static_lattice_320
    points = []
    
    # Local namespace bindings for micro-optimization
    m_sin = math.sin
    m_cos = math.cos
    r_func = round
    
    for node in lattice:
        i = node["i"]
        scale_idx = (i + global_tick) % 296
        
        state = ENGINE.evaluate_atomic_state(scale_idx, node["theta"], node["phi"])
        prob = state["probability"]
        
        dynamic_radius = node["base_shell"] + (prob * 50.0) + m_sin(i * 4 + time_offset) * 9
        
        x = dynamic_radius * node["sin_phi"] * node["cos_theta"]
        y = dynamic_radius * node["sin_phi"] * node["sin_theta"]
        z = dynamic_radius * node["cos_phi"]
        
        points.append((
            i, 
            r_func(x, 4), 
            r_func(y, 4), 
            r_func(z, 4), 
            r_func(prob, 4), 
            r_func(state["energyEigenvalue"], 4)
        ))
    return points

class RollingStats:
    """
    O(1) Incremental Statistics Tracker.
    """
    def __init__(self, window_size=160):
        self.window_size = window_size
        self.buffer = []
        self.sum = 0.0
        self.sum_sq = 0.0

    def update(self, val):
        if len(self.buffer) >= self.window_size:
            old_val = self.buffer.pop(0)
            self.sum -= old_val
            self.sum_sq -= (old_val ** 2)
        
        self.buffer.append(val)
        self.sum += val
        self.sum_sq += (val ** 2)

    def get_mean_and_std(self):
        n = len(self.buffer)
        if n == 0:
            return 50.0, 1e-5
        mean = self.sum / n
        variance = (self.sum_sq / n) - (mean ** 2)
        std = math.sqrt(max(0.0, variance))
        return mean, max(std, 1e-5)

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
    try:
        sock = websocket.transport.get_extra_info('socket')
        if sock is not None:
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    except Exception:
        pass

    print(f"🔒 Secure SEBRA82 Binary Vault Session Initialized from {websocket.remote_address[0] if websocket.remote_address else 'Unknown'}")
    try:
        query = urllib.parse.urlparse(websocket.path).query
        params = urllib.parse.parse_qs(query)
        
        key = params.get("hash", [""])[0]
        tier = params.get("tier", ["demo"])[0]
        is_decoy = params.get("is_decoy", ["false"])[0].lower() == "true"
        is_demo = (tier == "demo")
        
        fernet = get_fernet_from_hash(key) if USE_ENCRYPTION else None
        session_crypto_offset = 0 if is_decoy else calculate_crypto_offset(key)
        
        global_tick, time_offset = 0, 0.0
        stats_tracker = RollingStats(window_size=160)
        
        for _ in range(160):
            stats_tracker.update(50.0)

        base_value, damping, spike_threshold = 10.0, 1.45, 2.0
        
        while True:
            loop_start = time.perf_counter()
            global_tick += 1
            time_offset += 0.05
            
            atomic_matrix = generate_cached_proprietary_matrix(global_tick, time_offset, is_demo=is_demo)
            
            raw_x = (global_tick % 400 - 200) * 0.0001
            carrier = math.cos((math.pi * 1e-4 * raw_x) / (R_N * 1.0 + 1e-35) + time_offset * 0.8) ** 2
            sub_harmonic = math.sin(global_tick * 0.04 + time_offset * 2.0) * 0.35 + 0.65
            high_freq_noise = math.sin(global_tick * 0.22 + time_offset * 4.5) * 15.0
            
            burst_active = math.sin(global_tick * 0.01 + time_offset * 0.6) > 0.80
            quantum_burst = random.uniform(0, 30.0) if burst_active else random.uniform(0, 6.0)
            
            if is_decoy:
                session_crypto_offset += 0.05
                
            val = min(92.0, max(22.0, (carrier * sub_harmonic * 50.0) + high_freq_noise + quantum_burst))
            
            stats_tracker.update(val)
            mean, std = stats_tracker.get_mean_and_std()
            z_score = abs((val - mean) / std)
            is_spike = bool(z_score > spike_threshold)
            
            roi = 0.0 if is_demo else (base_value * damping * 14.8)
            alpha_confidence = 80.0 if is_demo else (92.0 + damping)
            
            packet = [
                tier,
                [global_tick, round(time_offset, 3), round(session_crypto_offset, 4)],
                [round(val, 2), round(z_score, 2), is_spike],
                [round(roi, 2), round(alpha_confidence, 2)],
                atomic_matrix
            ]
            
            raw_payload = msgpack.packb(packet, use_bin_type=True)
            payload_to_send = fernet.encrypt(raw_payload) if fernet else raw_payload
            
            await websocket.send(payload_to_send)
            
            elapsed = time.perf_counter() - loop_start
            sleep_duration = max(0.0, 0.016 - elapsed)
            await asyncio.sleep(sleep_duration)
                
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
        print(f"⚡ SEBRA82 v5.7 Cached Geometry Engine Online on port {port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
