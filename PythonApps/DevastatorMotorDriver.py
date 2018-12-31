import time
import math
import atexit
import collections

from Adafruit_MotorHAT import Adafruit_MotorHAT

Speed = collections.namedtuple('Speed', ['left_direction','left','right_direction','right'])

class Devastator(object):
    def __init__(self, addr=0x60, left_id=1, right_id=2, left_trim=0, right_trim=0,
                 stop_at_exit=True):
      
        self._last_left_dir = Adafruit_MotorHAT.RELEASE
        self._last_right_dir = Adafruit_MotorHAT.RELEASE

        self._max_speed = 250

        # Initialize motor HAT and left, right motor.
        self._mh = Adafruit_MotorHAT(addr)
        self._left = self._mh.getMotor(left_id)
        self._right = self._mh.getMotor(right_id)
        self._left_trim = left_trim
        self._right_trim = right_trim
        # Start with motors turned off.
        self._left.run(Adafruit_MotorHAT.RELEASE)
        self._right.run(Adafruit_MotorHAT.RELEASE)
        # Configure all motors to stop at program exit if desired.
        if stop_at_exit:
            atexit.register(self.stop)

    def _left_speed(self, speed):
        """Set the speed of the left motor, taking into account its trim offset.
        """
        assert 0 <= speed <= 255, 'Speed must be a value between 0 to 255 inclusive!'
        speed += self._left_trim
        speed = max(0, min(self._max_speed, speed))  # Constrain speed to 0-255 after trimming.
        self._left.setSpeed(speed)

    def _right_speed(self, speed):
        """Set the speed of the right motor, taking into account its trim offset.
        """
        assert 0 <= speed <= 255, 'Speed must be a value between 0 to 255 inclusive!'
        speed += self._right_trim
        speed = max(0, min(self._max_speed, speed))  # Constrain speed to 0-255 after trimming.
        self._right.setSpeed(speed)

    def stop(self):
        """Stop all movement."""
        try:
            self._left.run(Adafruit_MotorHAT.RELEASE)
            self._right.run(Adafruit_MotorHAT.RELEASE)
            self._last_right_dir = Adafruit_MotorHAT.RELEASE
            self._last_left_dir = Adafruit_MotorHAT.RELEASE
        finally:
            pass
    
    def calculate_speed(self, position_x, position_y):

        # translate x:-100 to 100 and y:-100 to 100
        # into left/right motor forward/backward speed (byte)

        position_x = position_x * -1

        position_x = max(-100, min(100,position_x))
        position_y = max(-100, min(100,position_y))
                
        # convert to polar
        r = math.hypot(position_y, position_x)
        t = math.atan2(position_x, position_y)

        # rotate by 45 degrees
        t += math.pi / 4

        # back to cartesian
        left = r * math.cos(t)
        right = r * math.sin(t)

        # rescale the new coords
        left = left * math.sqrt(2)
        right = right * math.sqrt(2)

        left_speed = max(0, min(int(abs(left) * 2.5), self._max_speed))
        right_speed = max(0, min(int(abs(right) * 2.5), self._max_speed))

        if(left >= 0):
            ldir = Adafruit_MotorHAT.FORWARD
        else:
            ldir = Adafruit_MotorHAT.BACKWARD

        if(right >= 0):
            rdir = Adafruit_MotorHAT.FORWARD
        else:
            rdir = Adafruit_MotorHAT.BACKWARD

        result = Speed(ldir, left_speed, rdir, right_speed)

        return result


    def move(self, position_x, position_y):     
        
        speed = self.calculate_speed(position_x, position_y)

        ltxt = "F" if (speed.left_direction == 1) else "B"
        rtxt = "F" if (speed.right_direction == 1) else "B"
        # print("PX:{} PY:{} Left: {} {} Right: {} {}".format(position_x,position_y,ltxt,speed.left,rtxt,speed.right))

        try:
            if(speed.left_direction != self._last_left_dir):
                self._left.run(speed.left_direction)
                self._last_left_dir = speed.left_direction

            if(speed.right_direction != self._last_right_dir):
                self._right.run(speed.right_direction)
                self._last_right_dir = speed.right_direction

            self._left_speed(speed.left)
            self._right_speed(speed.right)
            
        finally:
            pass

  

