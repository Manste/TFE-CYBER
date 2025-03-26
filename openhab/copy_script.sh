#!/bin/bash
# Import the python libraries for the openhab's user
#sudo -u openhab pip3 install -r requirements.txt  --user

# Import the tools necessary for the functionning of the project
sudo cp -r ./scripts/* /etc/openhab/scripts/
sudo cp ./rules/* /etc/openhab/rules/
sudo cp ./items/* /etc/openhab/items/
sudo cp ./things/* /etc/openhab/things/