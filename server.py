import asyncio
import websockets
import msgpack
import time
import os
import struct
import wgpu

# WGSL Compute Shader implementing SEBRA82 parallel mathematical pipeline
WGSL_SHADER = """
struct NodeData {
    id: u32,
    x: f32,
    y: f32,
    z: f32,
};

// ALIGNMENT FIX: Uniforms padded to 16 bytes to satisfy strict WebGPU standards
struct Uniforms {
    global_tick: u32,
    time_offset: f32,
    _padding1: f32,
    _padding2: f32,
};

@group(0) @binding(0) var<storage, read_write> nodes: array<NodeData>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

// O(1) stateless bitwise integer hash for parallel GPU execution
fn bitwise_hash(node_id: u32, tick: u32) -> f32 {
    var h = (node_id + tick) ^ ((node_id + tick) >> 15u);
    h = h * 0x85ebca6bu;
    h = h ^ (h >> 13u);
    return f32(h & 0xFFFFFFFFu) / 4294967295.0;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let index = id.x;
    if (index >= 320u) {
        return;
    }

    let node_id = nodes[index].id;
    let noise = bitwise_hash(node_id, uniforms.global_tick);
    
    // PRECISION FIX: Modulo applied to time_offset to prevent f32 floating-point degradation
    let theta = f32(node_id) * 0.1 + (uniforms.time_offset % 6.2831853);
    let wave = 50.0 * pow(cos(theta * 1.5), 2.0);
    let radius = 65.0 + (wave * 0.5) + (noise * 10.0);

    let phi = f32(node_id) * 0.02;
    let spatial_theta = f32(node_id) * 0.05;

    // Write evaluated coordinates directly back to GPU storage buffer
    nodes[index].x = radius * sin(phi) * cos(spatial_theta);
    nodes[index].y = radius * sin(phi) * sin(spatial_theta);
    nodes[index].z = radius * cos(phi);
}
"""

class WebGPUEngine:
    def __init__(self, node_count=320):
        self.node_count = node_count
        print("⚙️ Initializing WebGPU Adapter & Compute Device...")
        
        adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
        self.device = adapter.request_device_sync()
        
        self.shader_module = self.device.create_shader_module(code=WGSL_SHADER)
        
        # Allocate persistent GPU storage buffer for 320 nodes (16 bytes per node)
        initial_data = bytearray()
        for i in range(node_count):
            initial_data.extend(i.to_bytes(4, 'little', signed=False))
            initial_data.extend(b'\x00\x00\x00\x00' * 3)
            
        self.storage_buffer = self.device.create_buffer_with_data(
            data=bytes(initial_data),
            usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC | wgpu.BufferUsage.COPY_DST
        )
        
        # ALLOCATION FIX: Buffer sized to 16 bytes
        self.uniform_buffer = self.device.create_buffer_with_data(
            data=bytes(16),
            usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST
        )
        
        self.staging_buffer = self.device.create_buffer(
            size=len(initial_data),
            usage=wgpu.BufferUsage.MAP_READ | wgpu.BufferUsage.COPY_DST
        )
        
        self.pipeline = self.device.create_compute_pipeline(
            layout=wgpu.AutoLayoutMode.auto,
            compute=wgpu.ProgrammableStage(module=self.shader_module, entry_point="main")
        )
        
        self.bind_group = self.device.create_bind_group(
            layout=self.pipeline.get_bind_group_layout(0),
            entries=[
                {"binding": 0, "resource": {"buffer": self.storage_buffer, "offset": 0, "size": len(initial_data)}},
                {"binding": 1, "resource": {"buffer": self.uniform_buffer, "offset": 0, "size": 16}}
            ]
        )
        print("✅ WebGPU Compute Pipeline successfully compiled and aligned.")

    def compute_frame(self, global_tick, time_offset):
        # PACKING FIX: Added two 0.0 floats to pad the uniform struct to 16 bytes
        uniform_data = struct.pack('<Ifff', global_tick, time_offset, 0.0, 0.0)
        self.device.queue.write_buffer(self.uniform_buffer, 0, uniform_data)
        
        encoder = self.device.create_command_encoder()
        compute_pass = encoder.begin_compute_pass()
        compute_pass.set_pipeline(self.pipeline)
        compute_pass.set_bind_group(0, self.bind_group, [], 0, 999999)
        compute_pass.dispatch_workgroups(5, 1, 1) 
        compute_pass.end()
        
        encoder.copy_buffer_to_buffer(self.storage_buffer, 0, self.staging_buffer, 0, self.staging_buffer.size)
        self.device.queue.submit([encoder.finish()])
        
        self.staging_buffer.map_sync(wgpu.MapMode.READ)
        raw_bytes = self.staging_buffer.read_mapped()
        
        # PERFORMANCE FIX: Dump binary memory directly without iterating into a Python list
        flat_matrix_bytes = bytes(raw_bytes) 
        
        self.staging_buffer.unmap()
        return flat_matrix_bytes

ENGINE = WebGPUEngine(320)

async def webgpu_server_handler(websocket):
    global_tick, time_offset = 0, 0.0
    print("⚡ Client Connected to WebGPU-Accelerated SEBRA82 Server.")
    
    try:
        while True:
            loop_start = time.perf_counter()
            global_tick += 1
            time_offset += 0.05
            
            # ASYNC FIX: Offload blocking map_sync to a background thread
            flat_matrix_bytes = await asyncio.to_thread(ENGINE.compute_frame, global_tick, time_offset)
            
            # MsgPack natively handles raw bytes instantaneously 
            payload = msgpack.packb([global_tick, round(time_offset, 3), flat_matrix_bytes], use_bin_type=True)
            await websocket.send(payload)
            
            elapsed = time.perf_counter() - loop_start
            await asyncio.sleep(max(0.0, 0.016 - elapsed))
            
    except websockets.exceptions.ConnectionClosed:
        print("🔒 Client Disconnected.")

async def main():
    port = int(os.environ.get("PORT", 8767))
    async with websockets.serve(webgpu_server_handler, "0.0.0.0", port):
        print(f"🚀 SEBRA82 WebGPU Compute Server Online on port {port}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
