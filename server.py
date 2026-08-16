import asyncio
import websockets
import json
import math
import random
import os

def calculate_crypto_offset(hash_hex):
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
    print("Client connected via secure cloud gateway.")
    try:
        auth_message = await websocket.recv()
        auth_data = json.loads(auth_message)
        
        key = auth_data.get("hash", "")
        is_decoy = auth_data.get("is_decoy", False)
        
        session_crypto_offset = 0 if is_decoy else calculate_crypto_offset(key)
        phase_desync_accumulator = 0.0
        global_tick = 0
        
        while True:
            global_tick += 1
            carrier = math.cos(global_tick * 0.08) ** 2
            noise = (random.random() - 0.5) * 18
            base_signal = max(22, min(92, 50 + carrier * 30 + noise))

            if is_decoy:
                phase_desync_accumulator += 0.05

            base_phase = (global_tick * 0.02) + phase_desync_accumulator
            phase_angle = base_phase + (global_tick * math.pi if is_decoy else session_crypto_offset)

            real_part = base_signal * math.cos(phase_angle)
            imag_part = base_signal * math.sin(phase_angle)
            entangled_output = math.sqrt((real_part**2) + (imag_part**2)) * math.cos(phase_desync_accumulator)

            packet = json.dumps({"tick": global_tick, "value": entangled_output})
            await websocket.send(packet)
            
            await asyncio.sleep(0.016)
            
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected.")

async def main():
    port = int(os.environ.get("PORT", 8767))
    server = await websockets.serve(sebra_engine, "0.0.0.0", port)
    print(f"⚡ SEBRA82 Cloud Engine Online on port {port}")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
