import asyncio
import websockets
import msgpack
import math
import random
import os
import struct

# --- ADAPTIVE HARDWARE ACCELERATION LAYER ---
USE_WEBGPU = True
try:
    import wgpu
    # Test adapter availability safely with fallback support
    adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    if not adapter:
        raise RuntimeError("No hardware GPU adapter found.")
    print("🚀 WebGPU Hardware Acceleration Available.")
except Exception as e:
    print(f"⚠️ WebGPU Initialization Bypassed ({e}). Falling back to CPU Cached Geometry Core.")
    USE_WEBGPU = False

# WGSL Compute Shader (Used if WebGPU is supported)
WGSL_SHADER = """
struct NodeData { id: u32, x: f32, y: f32, z: f32 };
struct Uniforms { global_tick: u32, time_offset: f32, _p1: f32, _p2: f32 };

@group(0) @binding(0) var<storage, read_write> nodes: array<NodeData>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let index = id.x;
    if (index >= 320u) { return; }
    let node_id = nodes[index].id;
    let theta = f32(node_id) * 0.1 + (uniforms.time_offset % 6.2831853);
    let wave = 50.0 * pow(cos(theta * 1.5), 2.0);
    let radius = 65.0 + (wave * 0.5);
    let phi = f32(node_id) * 0.02;
    let sth = f32(node_id) * 0.05;
    nodes[index].x = radius * sin(phi) * cos(sth);
    nodes[index].y = radius * sin(phi) * sin(sth);
    nodes[index].z = radius * cos(phi);
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
                    data=bytes(initial_data), usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC | wgpu.BufferUsage.COPY_DST
                )
                self.uniform_buffer = self.device.create_buffer_with_data(
                    data=bytes(16), usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
                )
                self.staging_buffer = self.device.create_buffer(
                    size=len(initial_data), usage=wgpu.BufferUsage.MAP_READ | wgpu.BufferUsage.COPY_DST
                )
                pipeline = self.device.create_compute_pipeline(
                    layout=wgpu.AutoLayoutMode.auto, compute=wgpu.ProgrammableStage(module=shader_module, entry_point="main")
                )
                self.bind_group = self.device.create_bind_group(
                    layout=pipeline.get_bind_group_layout(0),
                    entries=[
                        {"binding": 0, "resource": {"buffer": self.storage_buffer, "offset": 0, "size": len(initial_data)}},
                        {"binding": 1, "resource": {"buffer": self.uniform_buffer, "offset": 0, "size": 16}}
                    ]
                )
                self.pipeline = pipeline
                print("✅ WebGPU Pipeline Online.")
            except Exception as gpu_err:
                print(f"⚠️ GPU Device creation failed ({gpu_err}). Falling back to CPU Engine.")
                self.use_gpu = False

        if not self.use_gpu:
            # Fallback to v5.7 Precomputed CPU Lattice Cache for universal portability
            print("⚙️ Initializing Universal CPU Cached Geometry Lattices...")
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

    def compute(self, global_tick, time_offset):
        if self.use_gpu:
            uniform_data = struct.pack('<Ifff', global_tick, time_offset, 0.0, 0.0)
            self.device.queue.write_buffer(self.uniform_buffer, 0, uniform_data)
            encoder = self.device.create_command_encoder()
            c_pass = encoder.begin_compute_pass()
            c_pass.set_pipeline(self.pipeline)
            c_pass.set_bind_group(0, self.bind_group, [], 0, 999999)
            c_pass.dispatch_workgroups(5, 1, 1)
            c_pass.end()
            encoder.copy_buffer_to_buffer(self.storage_buffer, 0, self.staging_buffer, 0, self.staging_buffer.size)
            self.device.queue.submit([encoder.finish()])
            self.staging_buffer.map_sync(wgpu.MapMode.READ)
            raw_bytes = bytes(self.staging_buffer.read_mapped())
            self.staging_buffer.unmap()
            return raw_bytes
        else:
            # CPU Fallback Execution Loop
            points = []
            m_sin, m_cos, r_func = math.sin, math.cos, round
            for node in self.static_lattice:
                i = node["i"]
                dyn_rad = node["base_shell"] + m_sin(i * 4 + time_offset) * 9
                x = dyn_rad * node["sin_phi"] * node["cos_theta"]
                y = dyn_rad * node["sin_phi"] * node["sin_theta"]
                z = dyn_rad * node["cos_phi"]
                points.append((i, r_func(x, 4), r_func(y, 4), r_func(z, 4)))
            return points

ENGINE = SupremeSebraEngine(320)

async def handler(websocket):
    global_tick, time_offset = 0, 0.0
    print("⚡ Client Connected to Supreme Hybrid SEBRA82 Server.")
    try:
        while True:
            t_start = time.perf_counter()
            global_tick += 1
            time_offset += 0.05
            
            matrix_data = await asyncio.to_thread(ENGINE.compute, global_tick, time_offset)
            
            payload = msgpack.packb([global_tick, round(time_offset, 3), matrix_data], use_bin_type=True)
            await websocket.send(payload)
            
            elapsed = time.perf_counter() - t_start
            await asyncio.sleep(max(0.0, 0.016 - elapsed))
    except websockets.exceptions.ConnectionClosed:
        print("🔒 Client Disconnected.")

async def main():
    port = int(os.environ.get("PORT", 8767))
    async with websockets.serve(handler, "0.0.0.0", port):
        print(f"⚡ Supreme SEBRA82 Hybrid Engine Online on port {port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
