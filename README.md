# Command-Center
A fun project allowing multiple clients to register on a central hub and send messages to each other via the hub.

# Hub:
The hub is written in C# and uses WebSockets as it's primary method of communation.

# Client A: Control
The "control" client example is browser based and is written in JavaScript. This is to allow for maximum compatibility across as many platforms as possible. Just for fun, touch support and Xbox controller support has been added.

# Client B: Actor (The thing being controlled)
The "actor" client script has been written in python and assumes we will be controlling a vehicle with two motors. This script is being used on a [RaspberryPi 3b](https://www.raspberrypi.org/products/raspberry-pi-3-model-b/) (raspbian os) and is controlling two motors via [Adafruit's motor hat](https://www.adafruit.com/product/2348).
