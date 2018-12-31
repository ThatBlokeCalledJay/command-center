import websocket
import json
import base64
import io

from picamera import PiCamera
from DevastatorMotorDriver import Devastator
from time import sleep
from enum import Enum

try:
    import thread
except ImportError:
    import _thread as thread
import time

class ClientType(Enum):
    ACTOR = 0
    CONTROL = 10
    SENSOR = 200

class MessageType(Enum):
    REGISTER = 0
    REGISTERED = 1
    CONFIRMATION = 50
    MESSAGE = 100
    MOVECOMMAND = 200
    REQUEST = 300
    DATA = 400
    IMAGEDATA = 41

_devastator = Devastator()
_registered = False

_camera_enabled = False

class Axis(object):
    def __init__(self, x, y, *args, **kwargs):
        self.X = x
        self.Y = y

class Message(object):
    def __init__(self, messageId, messageType, action, *args, **kwargs):
        self.MessageId = messageId
        self.MessageType = messageType
        self.Action = action

def on_message(ws, msg):
    global _registered

    data = json.loads(msg)

    message = Message(**data)  

    if message.MessageType == MessageType.REGISTERED.value:
        print("### registered ###")
        _registered = True
    elif message.MessageType == MessageType.MOVECOMMAND.value:
        axis = Axis(**message.Action)
        print("### move command received: X:%s Y:%s" %(axis.X, axis.Y))
        # _devastator.move(int(axis.X), int(axis.Y))
    elif message.MessageType == MessageType.CONFIRMATION.value:
        print('### message receipt for \'%s\' received ###' %(message.MessageId))
    else:
        print("### received unexpected message type: %s ###" %(message.MessageType))
       
def on_error(ws, error):
    print(error)

def on_close(ws):
    global _registered
    _registered = False
    print("### connection closed ###")

def on_open(ws):
    print("### connection open ###")
    do_register(ws)
    
def do_register(ws):
    print("### registering on network ###")
    action = {"clientName": "Devastator", "clientType": ClientType.ACTOR.value}
    message = {"messageId": "reg-devastator",
               "messageType": MessageType.REGISTER.value,
               "clientId": "actor-devastator-1",
               "action": action}
    reg = json.dumps(message, separators=(',', ':'))
    ws.send(reg)

def run(*args):
    stream = io.BytesIO()
    camera = PiCamera()

    if _camera_enabled == True:
        print("### initiate camera ###")
        camera.resolution = (320, 240)
        camera.vflip = 1
        camera.hflip = 1
        camera.framerate = 30
        sleep(2)

    while True:
        if _camera_enabled == True & _registered == True:
            print("### run camera continuous capture ###")
            for foo in camera.capture_continuous(stream, format='jpeg', use_video_port=True):
                data = base64.b64encode(stream.getvalue()).decode()

                #TODO: send image data as base64 string

                stream.truncate()
                stream.seek(0)

        time.sleep(1)


thread.start_new_thread(run, ())

if __name__ == "__main__":
    websocket.enableTrace(False)
    
    ws = websocket.WebSocketApp("ws://your-hub-address",
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)
    ws.on_open = on_open
    ws.run_forever()
