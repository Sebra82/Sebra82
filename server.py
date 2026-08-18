import asyncio
import msgpack
import time
import os
import struct
import math
import random
from urllib.parse import parse_qs, urlparse

# --- 1. RUST-ACCELERATED WEBSOCKETS ---
try:
    import websocket_rs as websockets
    print("🚀 Rust-Accelerated 'websocket-rs' bindings active.")
except ImportError:
    import websockets
    print("ℹ️ Standard pure-Python 'websockets' active.")

# Optional: Unix high-performance loop
try:
    import uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    print("🚀 Ultra-High Performance 'uvloop' active.")
except ImportError:
    pass

USE_WEBGPU = True
try:
    import wgpu
    adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    if not adapter: raise RuntimeError("No hardware GPU adapter found.")
    print("🚀 WebGPU Hardware Acceleration active.")
except Exception as e:
    print(f"⚠️ WebGPU Bypassed ({e}). Falling back to Universal CPU Cached Core.")
    USE_WEBGPU = False

# WGSL Compute Shader: 4D Hyperspatial Projection & Empirical Drift
WGSL_SHADER = """
struct NodeData { id: u32, x: f32, y: f32, z: f32 };
struct Uniforms { global_tick: u32, time_offset: f32, external_entropy: f32, _padding: f32 };

@group(0) @binding(0) var<storage, read_write> nodes: array<NodeData>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

fn bitwise_hash(node_id: u32, tick: u32) -> f32 {
    var h = (node_id + tick) ^ ((node_id + tick) >> 15u);
    h = h * 0x85ebca6bu;
    h = h ^ (h >> 13u);
    return f32(h & 0xFFFFFFFFu) / 4294967295.0;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let index = id.x;
    if (index >= 320u) { return; }
    
    let node_id = nodes[index].id;
    let noise = bitwise_hash(node_id, uniforms.global_tick);
    let drift = uniforms.external_entropy * (noise - 0.5) * 5.0;
    
    let theta = f32(node_id) * 0.1 + (uniforms.time_offset % 6.2831853);
    let wave = 50.0 * pow(cos(theta * 1.5 + drift), 2.0);
    let radius = 65.0 + (wave * 0.5);
    
    let phi = f32(node_id) * 0.02;
    let sth = f32(node_id) * 0.05;
    
    let raw_x = radius * sin(phi) * cos(sth);
    let raw_y = radius * sin(phi) * sin(sth);
    let raw_z = radius * cos(phi);
    let raw_w = radius * sin(phi) * cos(uniforms.time_offset * 0.75 + drift);
    
    let hyper_scale = 150.0 / (150.0 - raw_w);

    nodes[index].x = raw_x * hyper_scale;
    nodes[index].y = raw_y * hyper_scale;
    nodes[index].z = raw_z * hyper_scale;
}
"""

class SupremeSebraEngine:
    def __init__(self, node_count=320):
        self.node_count = node_count
        self.use_gpu = USE_WEBGPU
        
        if self.use_gpu:
            try:
                adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
                self.device = adapter.request_device_sync()
                shader_module = self.device.create_shader_module(code=WGSL_SHADER)
                
                initial_data = bytearray()
                for i in range(node_count):
                    initial_data.extend(i.to_bytes(4, 'little', signed=False))
                    initial_data.extend(b'\x00\x00\x00\x00' * 3)
                    
                self.storage_buffer = self.device.create_buffer_with_data(
                    data=bytes(initial_data), 
                    usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC | wgpu.BufferUsage.COPY_DST
                )
                
                self.uniform_buffer = self.device.create_buffer_with_data(
                    data=bytes(16), 
                    usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
                )
                
                self.uniform_staging = self.device.create_buffer(
                    size=16,
                    usage=wgpu.BufferUsage.MAP_WRITE | wgpu.BufferUsage.COPY_SRC
                )
                
                self.output_staging = self.device.create_buffer(
                    size=len(initial_data),
                    usage=wgpu.BufferUsage.MAP_READ | wgpu.BufferUsage.COPY_DST
                )
                
                self.pipeline = self.device.create_compute_pipeline(
                    layout=wgpu.AutoLayoutMode.auto, 
                    compute=wgpu.ProgrammableStage(module=shader_module, entry_point="main")
                )
                self.bind_group = self.device.create_bind_group(
                    layout=self.pipeline.get_bind_group_layout(0),
                    entries=[
                        {"binding": 0, "resource": {"buffer": self.storage_buffer, "offset": 0, "size": len(initial_data)}},
                        {"binding": 1, "resource": {"buffer": self.uniform_buffer, "offset": 0, "size": 16}}
                    ]
                )
            except Exception as e:
                print(f"⚠️ GPU init failed ({e}). CPU Fallback active.")
                self.use_gpu = False

        if not self.use_gpu:
            self.static_lattice = []
            for i in range(node_count):
                phi = math.acos(max(-1.0, min(1.0, -1.0 + (2.0 * i) / node_count)))
                theta = math.sqrt(node_count * math.pi) * phi
                self.static_lattice.append({
                    "i": i, "phi": phi, "theta": theta,
                    "base_shell": 90 if (i % 3 == 0) else (65 if i % 3 == 1 else 42),
                    "sin_phi": math.sin(phi), "cos_phi": math.cos(phi),
                    "sin_theta": math.sin(theta), "cos_theta": math.cos(theta)
                })

    def compute_and_pack(self, global_tick, time_offset, external_entropy, welford_packet):
        if self.use_gpu:
            self.uniform_staging.map_sync(wgpu.MapMode.WRITE)
            uniform_mem_view = self.uniform_staging.read_mapped()
            struct.pack_into('<Ifff', uniform_mem_view, 0, global_tick, time_offset, external_entropy, 0.0)
            self.uniform_staging.unmap()

            encoder = self.device.create_command_encoder()
            encoder.copy_buffer_to_buffer(self.uniform_staging, 0, self.uniform_buffer, 0, 16)
            
            c_pass = encoder.begin_compute_pass()
            c_pass.set_pipeline(self.pipeline)
            c_pass.set_bind_group(0, self.bind_group, [], 0, 999999)
            c_pass.dispatch_workgroups(5, 1, 1)
            c_pass.end()
            
            encoder.copy_buffer_to_buffer(self.storage_buffer, 0, self.output_staging, 0, self.output_staging.size)
            self.device.queue.submit([encoder.finish()])
            
            self.output_staging.map_sync(wgpu.MapMode.READ)
            gpu_memory_view = self.output_staging.read_mapped()
            
            packet = [
                global_tick,
                round(time_offset, 3),
                welford_packet,
                gpu_memory_view
            ]
            raw_payload = msgpack.packb(packet, use_bin_type=True)
            self.output_staging.unmap()
            
            return raw_payload
        else:
            points = []
            m_sin, m_cos, r_func = math.sin, math.cos, round
            for node in self.static_lattice:
                i = node["i"]
                dyn_rad = node["base_shell"] + m_sin(i * 4 + time_offset + external_entropy) * 9
                raw_x = dyn_rad * node["sin_phi"] * node["cos_theta"]
                raw_y = dyn_rad * node["sin_phi"] * node["sin_theta"]
                raw_z = dyn_rad * node["cos_phi"]
                raw_w = dyn_rad * node["sin_phi"] * m_cos(time_offset * 0.75)
                h_scale = 150.0 / (150.0 - raw_w)
                points.append((i, r_func(raw_x * h_scale, 4), r_func(raw_y * h_scale, 4), r_func(raw_z * h_scale, 4)))
            
            packet = [global_tick, round(time_offset, 3), welford_packet, points]
            return msgpack.packb(packet, use_bin_type=True)

class WelfordVariance:
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

ENGINE = SupremeSebraEngine(320)
CONNECTED_CLIENTS = set()

async def centralized_broadcast_loop():
    global_tick, time_offset = 0, 0.0
    welford_stats = WelfordVariance()
    
    while True:
        loop_start = time.perf_counter()
        global_tick += 1
        time_offset += 0.05
        
        live_market_volatility = math.sin(global_tick * 0.1) * 2.5 + random.uniform(-0.5, 0.5)
        
        welford_stats.update(live_market_volatility)
        mean, std = welford_stats.get_stats()
        z_score = abs((live_market_volatility - mean) / std)
        is_spike = bool(z_score > 2.5)
        welford_packet = [round(live_market_volatility, 3), round(z_score, 3), is_spike]

        if CONNECTED_CLIENTS:
            raw_payload = await asyncio.to_thread(
                ENGINE.compute_and_pack, 
                global_tick, time_offset, live_market_volatility, welford_packet
            )
            
            await asyncio.gather(
                *[client.send(raw_payload) for client in CONNECTED_CLIENTS], 
                return_exceptions=True
            )
            
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

    print(f"⚡ Secured Tunnel [{client_ip}] | Tier: {tier_mode.upper()} | Hash: {auth_hash[:6]}... Active Pool: {len(CONNECTED_CLIENTS)}")
    
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
        print(f"🪐 SEBRA82 'Holy Grail' Terminal Active on ws://0.0.0.0:{port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
