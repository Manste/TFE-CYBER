import asyncio
import websockets
from io import BytesIO

from PIL import Image, UnidentifiedImageError

# Store connected clients
clients = set()

def is_valid_image(image_bytes):
    try:
        Image.open(BytesIO(image_bytes))
        # print("image OK")
        return True
    except UnidentifiedImageError:
        print("image invalid")
        return False

async def handle_connection(websocket):
    while True:
        try:
            message = await websocket.recv()
            #print(len(message))
            if len(message) > 5000:
                if is_valid_image(message):
                    #print(message)
                    with open("image.jpg", "wb") as f:
                        f.write(message)
        except websockets.exceptions.ConnectionClosed:
            break

# Relay Server: Listens for ESP32-CAM and sends frames to connected clients
async def relay_video(websocket):
    global clients
    clients.add(websocket)
    handle_connection(websocket)
    try:
        async for message in websocket:
            # Forward the frame to all connected clients
            await asyncio.gather(*(client.send(message) for client in clients if client != websocket))
            print("Image sent")
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        clients.remove(websocket)

# WebSocket Server Setup
async def main():
    async with websockets.serve(relay_video, "0.0.0.0", 8765):  # Relay server runs on port 8765
        await asyncio.Future()  # Keeps server running

# Start the server
asyncio.run(main())