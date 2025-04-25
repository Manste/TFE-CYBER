import asyncio
import cv2
from websockets.asyncio.server import serve
import numpy as npclientsclients

async def camera_stream(websocket):
    cap = cv2.VideoCapture(0)
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Encode frame to JPG and get the bytes
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                break

            # Send image data as bytes
            await websocket.send(buffer.tobytes())
            
            # Sleep to control frame rate (~20 FPS)
            await asyncio.sleep(0.05)

    except Exception:
        camera_stream(websocket)


async def main():
    async with serve(camera_stream, "0.0.0.0", 8585) as server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
