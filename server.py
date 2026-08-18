import asyncio
import msgpack
import time
import os
import math
import random
import hmac
import hashlib
from urllib.parse import parse_qs, urlparse

# --- 1. STANDARD WEBSOCKETS (PaaS Compatible) ---
try:
    import websockets
    print("ℹ️ Standard pure-Python 'websockets' active.")
except ImportError:
    import websockets

# Optional: High-performance loop if available
try:
    import uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    print("🚀 Ultra-High Performance 'uvloop' active.")
except ImportError:
    pass

# --- PROPRIETARY TRADE SECRET SIGNING KEY ---
SERVER_SIGNING_KEY = b"SEBRA82_AEGIS_MASTER_SECRET_2026"

class WelfordVariance:
    """Calculates continuous mean and variance in a single O(1) pass."""
    def __init__(self):
        self.count = 0
        self.mean = 0.0
        self.m2 = 0.0

    def update(self, val):
        self.count += 1
        delta = val - self.mean
        self.mean += delta / self.count
        delta2 = val - self.mean
        self.m2 += delta * delta2

    def get_stats(self):
        if self.count < 2: return self.mean, 1e-5
        variance = self.m2 / (self.count - 1)
        return self.mean, math.sqrt(variance)

CONNECTED_CLIENTS = set()

def compute_and_pack(global_tick, time_offset, live_market_volatility, welford_packet):
    empty_matrix_trigger = [] 
    
    core_packet = [
        global_tick,
        round(time_offset, 3),
        welford_packet,
        empty_matrix_trigger
    ]
    serialized_core = msgpack.packb(core_packet, use_bin_type=True)
    
    # Apply Cryptographic Trade Secret Signature Envelope
    signature = hmac.new(SERVER_SIGNING_KEY, serialized_core, hashlib.sha256).digest()
    signed_envelope = [signature, core_packet]
    
    return msgpack.packb(signed_envelope, use_bin_type=True)

async def centralized_broadcast_loop():
    global_tick, time_offset = 0, 0.0
    welford_stats = WelfordVariance()
    
    while True:
        loop_start = time.perf_counter()
        global_tick += 1
        time_offset += 0.05
        
        live_market_volatility = math.sin(global_tick * 0.08) * 2.8 + random.uniform(-0.4, 0.4)
        
        welford_stats.update(live_market_volatility)
        mean, std = welford_stats.get_stats()
        z_score = abs((live_market_volatility - mean) / std)
        is_spike = bool(z_score > 2.5)
        welford_packet = [round(live_market_volatility, 3), round(z_score, 3), is_spike]

        if CONNECTED_CLIENTS:
            raw_payload = await asyncio.to_thread(
                compute_and_pack, 
                global_tick, time_offset, live_market_volatility, welford_packet
            )
            
            tasks = [client.send(raw_payload) for client in CONNECTED_CLIENTS]
            await asyncio.gather(*tasks, return_exceptions=True)
            
        elapsed = time.perf_counter() - loop_start
        await asyncio.sleep(max(0.0, 0.016 - elapsed))

async def ws_handler(websocket):
    query_params = {}
    try:
        path_str = websocket.path if hasattr(websocket, 'path') else (websocket.request.path if hasattr(websocket, 'request') else "")
        parsed_url = urlparse(path_str)
        query_params = parse_qs(parsed_url.query)
    except Exception:
        pass

    auth_hash = query_params.get("hash", ["Guest"])[0]
    tier_mode = query_params.get("tier", ["demo"])[0]

    CONNECTED_CLIENTS.add(websocket)
    
    client_ip = "unknown"
    try:
        if hasattr(websocket, 'remote_address') and websocket.remote_address:
            client_ip = websocket.remote_address[0]
        elif hasattr(websocket, 'request') and hasattr(websocket.request, 'remote_address'):
            client_ip = websocket.request.remote_address[0]
    except Exception:
        pass

    print(f"⚡ Secured Tunnel [{client_ip}] | Tier: {tier_mode.upper()} | Active Pool: {len(CONNECTED_CLIENTS)}")
    
    try:
        async for message in websocket:
            pass 
    except Exception:
        pass
    finally:
        CONNECTED_CLIENTS.discard(websocket)
        print(f"🔒 Tunnel Closed. Active Pool: {len(CONNECTED_CLIENTS)}")

async def main():
    port = int(os.environ.get("PORT", 8767))
    asyncio.create_task(centralized_broadcast_loop())
    
    async with websockets.serve(ws_handler, "0.0.0.0", port):
        print(f"🪐 SEBRA82 Master Server Active on ws://0.0.0.0:{port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
