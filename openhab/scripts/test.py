import time
import logging

# Configure logging to a file
logging.basicConfig(filename="/tmp/test_script.log", level=logging.INFO, format="%(asctime)s - %(message)s")

logging.info("Test script started!")

try:
    while True:
        logging.info("Test script is running...")
        time.sleep(10)  # Keep running every 10 seconds
except Exception as e:
    logging.error(f"Error: {str(e)}")
