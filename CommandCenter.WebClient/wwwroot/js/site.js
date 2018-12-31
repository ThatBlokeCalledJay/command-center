const CLIENT_TYPE = {};
CLIENT_TYPE["Actor"] = 0;
CLIENT_TYPE["Control"] = 10;
CLIENT_TYPE["Sensor"] = 200;

const MESSAGE_TYPE = {};
MESSAGE_TYPE["Register"] = 0;
MESSAGE_TYPE["Registered"] = 1;
MESSAGE_TYPE["Confirmation"] = 50;
MESSAGE_TYPE["Message"] = 100;
MESSAGE_TYPE["MoveCommand"] = 200;
MESSAGE_TYPE["Request"] = 300;
MESSAGE_TYPE["Data"] = 400;
MESSAGE_TYPE["ImageData"] = 410;

class HubClient {
    constructor(url, clientId, clientName, clientType) {
        this.clientId = clientId;
        this.clientName = clientName;
        this.clientType = clientType;
        this.url = url;

        this.state = null;
        this.socket = null;

        this.lastX = 0;
        this.lastY = 0;
    }

    SendMoveCommand(targetId, x, y) {
        if (this.lastX === x && this.lastY === y)
            return;

        this.lastX = x;
        this.lastY = y;

        let axis = { x: x, y: y };
        let action = { clientId: targetId, axis: axis };

        let ctrlMessage = {
            messageType: MESSAGE_TYPE["MoveCommand"],
            clientId: this.clientId,
            action: action
        };

        this.SendMessage(ctrlMessage);
    }

    SendMessage(message) {
        if (this.socket === null || this.socket.readyState !== WebSocket.OPEN)
            return;

        this.socket.send(JSON.stringify(message));
    }

    Connect() {
        let self = this;

        if (self.socket !== null && self.socket.readyState === WebSocket.OPEN)
            return;

        self.socket = new WebSocket(self.url);

        this.socket.onmessage = function (msg) {
            var data = JSON.parse(msg.data);

            switch (data.messageType) {
                case MESSAGE_TYPE["Registered"]:
                    console.log(`${self.clientName}: Registered`);
                    break;
                case MESSAGE_TYPE["Confirmation"]:
                    console.log(`${self.clientName}: Message '${data.messageId}' received by hub.`);
                    break;
                case MESSAGE_TYPE["MoveCommand"]:
                    console.log(`${self.clientName}: Move X:${data.action.x} Y:${data.action.y}`);
                    break;
                default:
                    console.log(data);
            }
        };

        this.socket.onopen = function (ev) {
            var registerAction = { clientName: self.clientName, clientType: self.clientType };

            var action = {
                messageId: "reg-" + self.clientId.toLowerCase(),
                messageType: MESSAGE_TYPE["Register"],
                clientId: self.clientId,
                action: registerAction
            };

            this.send(JSON.stringify(action));
        };

        this.socket.onclose = function (ev) {
            console.log(`${self.clientName}: Connection closed.`);
        };

        return;
    }

    Disconnect() {
        if (this.socket === null || this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING)
            return;

        this.socket.close();
    }
}

class AxisValues {
    constructor(x, y) {
        this.X = x;
        this.Y = y;
    }
}

class InputManager {
    constructor() {
        //## Trim the center axis (x and y) of a controller's joystick.
        this.deadcenter = { xLeft: -20, xRight: 10, yTop: -16, yBottom: 10 };
        //## The min and max expected x and y axis values
        this.axis = { xRight: 100, xLeft: -100, yTop: -100, yBottom: 100 };
        this.decimalsPlaces = 0;
    }

    ProcessInput(stringX, stringY) {
        let inputX = parseInt(stringX);
        let inputY = parseInt(stringY);

        inputX = Math.max(this.axis.xLeft, Math.min(this.axis.xRight, inputX));
        inputY = Math.max(this.axis.yTop, Math.min(this.axis.yBottom, inputY));

        let rangeLeft = Math.abs(this.axis.xLeft) - Math.abs(this.deadcenter.xLeft);
        let rangeRight = Math.abs(this.axis.xRight) - Math.abs(this.deadcenter.xRight);
        let rangeTop = Math.abs(this.axis.yTop) - Math.abs(this.deadcenter.yTop);
        let rangeBottom = Math.abs(this.axis.yBottom) - Math.abs(this.deadcenter.yBottom);

        let axis = new AxisValues(0, 0);

        if (inputX < this.deadcenter.xLeft) {
            let actualLeft = inputX - this.deadcenter.xLeft;
            let leftPos = (100 / rangeLeft * actualLeft).toFixed(this.decimalsPlaces);

            axis.X = leftPos;
        }

        if (inputX > this.deadcenter.xRight) {
            let actualRight = inputX - this.deadcenter.xRight;
            let rightPos = (100 / rangeRight * actualRight).toFixed(this.decimalsPlaces);

            axis.X = rightPos;
        }

        if (inputY < this.deadcenter.yTop) {
            let actualTop = inputY - this.deadcenter.yTop;
            let topPos = (100 / rangeTop * actualTop).toFixed(this.decimalsPlaces);

            axis.Y = topPos;
        }

        if (inputY > this.deadcenter.yBottom) {
            let actualBottom = inputY - this.deadcenter.yBottom;
            let bottomPos = (100 / rangeBottom * actualBottom).toFixed(this.decimalsPlaces);

            axis.Y = bottomPos;
        }

        return axis;
    }
}

var actors = {};
var control = null;
var inputManager = new InputManager();
var mouseDown = false;

$(function () {

    let hubUrl = "wss://localhost:44396/";

    control = new HubClient(hubUrl, "control1", "Control", CLIENT_TYPE["Control"]);

    let actor1 = new HubClient(hubUrl, "actor-alpha", "Actor Alpha", CLIENT_TYPE["Actor"]);
    actors["actor-alpha"] = actor1;

    let actor2 = new HubClient(hubUrl, "actor-bravo", "Actor Bravo", CLIENT_TYPE["Actor"]);
    actors["actor-bravo"] = actor2;

    $(".purple-square").on("mousedown", function () {
        mouseDown = true;
    });

    $(".purple-square").on("mouseup", function () {
        mouseDown = false;
        sendStopCommand();
    });

    $(".purple-square").on("mouseleave", function () {
        mouseDown = false;
        sendStopCommand();
    });

    $(".purple-square").mousemove((evt) => {
        let parentOffset = $(".purple-square").offset();

        let cordX = evt.pageX - parentOffset.left;
        let cordY = evt.pageY - parentOffset.top;

        let controlX = (cordX - 100).toFixed(0);
        let controlY = (cordY - 100).toFixed(0);

        var actor = document.getElementById("select-actors").value;

        if (!$("#chk-controller-input").is(":checked")) {
            let axis = inputManager.ProcessInput(controlX, controlY);

            $("#stat-text").text(`X:${axis.X} Y:${axis.Y}`);

            if (mouseDown)
                control.SendMoveCommand(actors[actor].clientId, axis.X, axis.Y);
        }
    });

    var purpleSquare = document.getElementById("purple-square");

    purpleSquare.addEventListener("touchstart", (evt) => {
        mouseDown = true;
    });

    purpleSquare.addEventListener("touchend", (evt) => {
        mouseDown = false;
        sendStopCommand();
    });

    purpleSquare.addEventListener("touchcancel", (evt) => {
        mouseDown = false;
        sendStopCommand();
    });

    purpleSquare.addEventListener("touchmove", (evt) => {
        let parentOffset = $(".purple-square").offset();

        let cordX = evt.touches[0].pageX - parentOffset.left;
        let cordY = evt.touches[0].pageY - parentOffset.top;

        let controlX = (cordX - 100).toFixed(0);
        let controlY = (cordY - 100).toFixed(0);
        if (!$("#chk-controller-input").is(":checked")) {
            let axis = inputManager.ProcessInput(controlX, controlY);

            $("#stat-text").text(`X:${axis.X} Y:${axis.Y}`);

            if (mouseDown) {
                var actor = document.getElementById("select-actors").value;
                control.SendMoveCommand(actors[actor].clientId, axis.X, axis.Y);
            }
        }
    });

    window.addEventListener("touchmove", function (e) {
        if (mouseDown) e.preventDefault();
    }, { passive: false });

    $("#btn-connect").click(function () {

        setTimeout(function () {
            doConnect(control);
        }, 10);

        setTimeout(function () {
            doConnect(actors["actor-alpha"]);
        }, 20);

        setTimeout(function () {
            doConnect(actors["actor-bravo"]);
        }, 30);
    });

    $("#btn-disconnect").click(function () {
        control.Disconnect();
        actors["actor-alpha"].Disconnect();
        actors["actor-bravo"].Disconnect();
    });
});

function doConnect(client) {
    client.Connect();
}

function sendStopCommand() {
    $("#stat-text").text(`X:${0} Y:${0}`);
    var actor = document.getElementById("select-actors").value;
    control.SendMoveCommand(actors[actor].clientId, 0, 0);
}

function checkMouseDown() {
    $span = $("#mouse-state");
    if (mouseDown) {
        $span.removeClass("badge-danger");
        $span.addClass("badge-success");
    } else {
        $span.removeClass("badge-success");
        $span.addClass("badge-danger");
    }

    mdAF(checkMouseDown);
}

var mdAF = window.requestAnimationFrame;

mdAF(checkMouseDown);

//Game pad source: http://luser.github.io/gamepadtest/

var haveEvents = 'GamepadEvent' in window;
var controllers = {};
var rAF = window.requestAnimationFrame;
var selectElement = document.getElementById("select-gamepad");

function connecthandler(e) {
    addgamepad(e.gamepad);
}
function addgamepad(gamepad) {
    controllers[gamepad.index] = gamepad;

    console.log(`Gamepad found: ${gamepad.id}`);

    var select = document.getElementById("select-gamepad");

    var o = document.createElement("option");
    o.innerHTML = gamepad.id;
    o.setAttribute("value", gamepad.index);

    select.appendChild(o);

    rAF(updateStatus);
}

function disconnecthandler(e) {
    removegamepad(e.gamepad);
}

function removegamepad(gamepad) {
    var d = document.getElementById("controller" + gamepad.index);
    document.body.removeChild(d);
    delete controllers[gamepad.index];
}

var preX = 0;
var preY = 0;

function updateStatus() {
    scangamepads();

    let controller = controllers[selectElement.value];

    if (controller !== undefined && controller !== null) {
        for (var i = 0; i < controller.axes.length; i++) {
            switch (i) {
                case 0:
                    if (controller.axes[i].toFixed(2) !== preX) {
                        preX = controller.axes[i].toFixed(2);
                    }
                    break;
                case 1:
                    if (controller.axes[i].toFixed(2) !== preY) {
                        preY = controller.axes[i].toFixed(2);
                    }

                    break;
            }
        }

        if ($("#chk-controller-input").is(":checked")) {
            var actor = document.getElementById("select-actors").value;

            var axisValues = inputManager.ProcessInput((preX * 100).toFixed(0), (preY * 100).toFixed(0));
            $("#stat-text").text(`X:${axisValues.X} Y:${axisValues.Y}`);

            control.SendMoveCommand(actors[actor].clientId, axisValues.X, axisValues.Y);
        }
    }
    rAF(updateStatus);
}

function scangamepads() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            if (!(gamepads[i].index in controllers)) {
                addgamepad(gamepads[i]);
            } else {
                controllers[gamepads[i].index] = gamepads[i];
            }
        }
    }
}

if (haveEvents) {
    window.addEventListener("gamepadconnected", connecthandler);
    window.addEventListener("gamepaddisconnected", disconnecthandler);
} else {
    setInterval(scangamepads, 500);
}