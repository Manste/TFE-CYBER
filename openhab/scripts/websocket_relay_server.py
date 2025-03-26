import asyncio
import websockets
from io import BytesIO
from PIL import Image, UnidentifiedImageError
import logging
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Configure logging
logging.basicConfig(filename="/tmp/websocket_relay.log", level=logging.INFO, format="%(asctime)s - %(message)s")

# Store connected clients
clients = set()

ESP32_CAM_WS_URL = "ws://172.20.10.6:81"  # ESP32-CAM WebSocket URL
RECONNECT_DELAY = 5  # Initial delay in seconds

counter = 0

def is_valid_image(image_bytes):
    """Checks if the received bytes form a valid image."""
    try:
        Image.open(BytesIO(image_bytes))
        return True
    except UnidentifiedImageError:
        logging.error("Received invalid image.")
        return False

async def handle_connection(websocket):
    """Handles receiving images from ESP32-CAM and forwarding to clients."""
    global clients
    clients.add(websocket)
    try:
        async for message in websocket:
            if is_valid_image(message):
                await save_image_async(message)
                #logging.info("Received and saved a frame.")
                # Forward the frame to all connected clients
                await asyncio.gather(*(client.send(message) for client in clients if client != websocket))
                logging.info("Image sent to clients.")
    except websockets.exceptions.ConnectionClosed:
        logging.warning("Client disconnected.")
    finally:
        clients.discard(websocket)  # Ensure the client is removed

async def save_image_async(image_bytes):
    """Asynchronously writes image to a file."""
    #global counter
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: open(f"/tmp/image.jpg", "wb").write(image_bytes))
    #await loop.run_in_executor(None, lambda: open(f"images/image{counter}.jpg", "wb").write(image_bytes))
    #counter+=1

async def connect_to_esp32():
    """Keeps trying to connect to ESP32-CAM WebSocket if it disconnects."""
    delay = RECONNECT_DELAY
    while True:
        try:
            async with websockets.connect(ESP32_CAM_WS_URL) as websocket:
                logging.info(f"Connected to ESP32-CAM at {ESP32_CAM_WS_URL}")
                delay = RECONNECT_DELAY  # Reset delay on successful connection
                async for message in websocket:
                    if is_valid_image(message):
                        await save_image_async(message)
                        #logging.info("Received and saved a frame.")
                        # Forward to all connected clients
                        await asyncio.gather(*(client.send(message) for client in clients))
                        logging.info("Image relayed to clients.")
        except (websockets.exceptions.ConnectionClosedError, OSError) as e:
            logging.error(f"ESP32-CAM disconnected: {e}")
        except Exception as e:
            logging.error(f"Unexpected error: {e}")

        # Reconnect with exponential backoff
        logging.info(f"Reconnecting in {delay} seconds...")
        await asyncio.sleep(delay)
        delay = min(delay * 2, 60)  # Increase delay but cap at 60 sec

async def main():
    """Starts WebSocket relay server and connects to ESP32-CAM."""
    asyncio.create_task(connect_to_esp32())  # Run ESP32 reconnect loop
    async with websockets.serve(handle_connection, "0.0.0.0", 8765):
        logging.info("WebSocket server started on ws://0.0.0.0:8765")
        await asyncio.Future()  # Keeps server running

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Server shutting down.")
