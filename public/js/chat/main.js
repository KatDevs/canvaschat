let $ = require('jquery')
let _ = require('lodash')
let io = require('socket.io-client')
let ChatUtils = require('./chat-utils')
let socket = io()

//==============================================================================
// ORBITER VARIABLES
//==============================================================================
// A hash of client attribute names used in this application. Each client sets a
// "thickness" attribute and a "color" attribute, specify the thickness and
// color of the current line being drawn.
var Attributes = {THICKNESS:"thickness",
                  COLOR:"color"};
// A hash of room message names used in this application. MOVE means move the
// drawing pen to the specified position. PATH supplies a list of points to be
// drawn.
var Messages = {MOVE:"MOVE",
                PATH:"PATH"};

 
//==============================================================================
// LOCAL USER VARIABLES
//==============================================================================
// A flag to track whether the user is drawing or not
var isPenDown = false;

let facebookId = $('#fromUserId').attr("data-id")
 
// Line defaults
var defaultLineColor = "#000000";
var defaultLineThickness = 1;
var maxLineThickness = 100;
 
// Tracks the current location of the user's drawing pen
var localPen = {};
 
// The user's line styles
var localLineColor = defaultLineColor;
var localLineThickness = defaultLineThickness;
 
// A list of points in a path to send to other connected users
var bufferedPath = [];
// A timestamp indicating the last time a point was added to the bufferedPath
var lastBufferTime = new Date().getTime();
var toId
var $currentSelectedFriend

//==============================================================================
// REMOTE USER VARIABLES
//==============================================================================
// A hash of pen positions for remote users, in the following
// format ("2345" is an example client ID):
//  {"2345": {x:10, y:10}}
var userCurrentPositions = {};
// A hash of pending drawing commands sent by remote users, the following format:
//  {"2345": [{commandName:moveTo, arg:{x:10, y:10}}, {commandName:lineTo, arg:{x:55, y:35}}]};
var userCommands = {};
// A hash of line colors for remote users, in the following format:
//  {"2345": "#CCCCCC"};
var userColors = {};
// A hash of line thicknesses for remote users, in the following format:
//  {"2345": 5};
var userThicknesses = {};
 
//==============================================================================
// DRAWING VARIABLES
//==============================================================================
// The HTML5 drawing canvas
var canvas;
// The drawing canvas's context, through which drawing commands are performed
var context;
// A hash of drawing commands executed by UnionDraw's rendering process
var DrawingCommands = {LINE_TO:       "lineTo",
                       MOVE_TO:       "moveTo",
                       SET_THICKNESS: "setThickness",
                       SET_COLOR:     "setColor"};
 
//==============================================================================
// TIMER VARIABLES
//==============================================================================
// The ID for a timer that sends the user's drawing path on a regular interval
var broadcastPathIntervalID;
// The ID for a timer that executes drawing commands sent by remote users
var processDrawingCommandsIntervalID;
 
//==============================================================================
// INITIALIZATION
//==============================================================================
// Trigger init() when the document finishes loading
window.onload = init;
 
// Main initialization function
function init () {
  initCanvas();
  registerInputListeners();
  initSocket();
  initClientHandlers()
}
 
// Set up the drawing canvas
function initCanvas () {
  // Retrieve canvas reference
  canvas = document.getElementById("canvas");

  // Size canvas
  canvas.width  = 600;
  canvas.height = 400;
 
  // Retrieve context reference, used to execute canvas drawing commands
  context = canvas.getContext('2d');
  context.lineCap = "round";
}
 
// Register callback functions to handle user input
function registerInputListeners () {
  canvas.onmousedown = pointerDownListener;
  document.onmousemove = pointerMoveListener;
  document.onmouseup = pointerUpListener;  
  document.getElementById("lineWidth").onchange = thicknessSelectListener;
  document.getElementById("js-red").onchange = colorSelectListener;
  document.getElementById("js-blue").onchange = colorSelectListener;
  document.getElementById("js-green").onchange = colorSelectListener;
}
 
// Initialize socket, which handles multiuser communications
function initSocket () {
  socket.on('connect', () => {  
  		console.log('connected', facebookId)
      socket.emit('addUser', facebookId)
      processDrawingCommandsIntervalID = setInterval(processDrawingCommands, 20)
  })
  socket.on('server:erase-canvas', function(update){
      clearCanvas();
  })

  socket.on('server:MOVE', (response) => {
		console.log('inside move handler', response)
	  var fromClientID = response.from
	  var coordsString = response.position
	  // Parse the specified (x, y) coordinate
	  var coords = coordsString.split(",");
	  var position = {x:parseInt(coords[0]), y:parseInt(coords[1])};
	  // Push a "moveTo" command onto the drawing-command stack for the sender
	  addDrawingCommand(fromClientID, DrawingCommands.MOVE_TO, position);
	})

  socket.on('server:PATH', (response) => {
		console.log('inside path handler', response)
		var fromClientID = response.from
		var pathString = response.bufferedPath
	  // Parse the specified list of points
	  var path = pathString.split(",");
	 
	  // For each point, push a "lineTo" command onto the drawing-command stack
	  // for the sender
	  var position;
	  for (var i = 0; i < path.length; i+=2) {
	    position = {x:parseInt(path[i]), y:parseInt(path[i+1])};
	    addDrawingCommand(fromClientID, DrawingCommands.LINE_TO, position);
	  }
	})

	socket.on('server:attributes', clientAttributeUpdateListener)

  socket.on('server:image-upload' , function(update) {
    drawImageOnCanvas(update.imageUrl)
  })

  socket.on('disconnected', () => {
    clearInterval(processDrawingCommandsIntervalID)
  })
}

let setActive = function($target) {
			$target.find(".js-friend-item").addClass("teal");
			$target.find(".js-friend-name").addClass("white-text");
}

function initClientHandlers() {
      $(".js-friends-list-item").click(function(e) {
      console.log("clicked")
      let $target = $(e.currentTarget);
      toId = $target.data("id");
      if($currentSelectedFriend) {
        clearActive($currentSelectedFriend);
        // if the same friend is selected again.
        let curDataId = $currentSelectedFriend.data("id");
        if(toId === curDataId) {
          toId = null;
          $currentSelectedFriend = null;
          return;
        }       
      }
      setActive($target)      
      $currentSelectedFriend = $target;       
    })
}
 
//==============================================================================
// HANDLE INCOMING CLIENT ATTRIBUTES
//==============================================================================

 
// Triggered when one of the clients in the drawing room changes an attribute
// value. When an attribute value changes, check to see whether it was either
// the "thickness" attribute or the "color" attribute.
function clientAttributeUpdateListener (response) {
	console.log('inside clientAttributeupdate handler', response)
	let clientID = response.from
	let attrName = response.attrName
	let attrValue = response.attrValue
  processClientAttributeUpdate(clientID, attrName, attrVal);
}
 
// Triggered when a clients leaves the drawing room.
function clientRemovedFromRoomListener (roomID, clientID) {
  // The client is gone now, so remove all information pertaining to that client
  delete userThicknesses[clientID];
  delete userColors[clientID];
  delete userCommands[clientID];
  delete userCurrentPositions[clientID];
}
 
// Checks for changes to the the "thickness" and "color" attributes.
function processClientAttributeUpdate (clientID, attrName, attrVal) {
  if (attrName == Attributes.THICKNESS) {
    // The "thickness" attribute changed, so push a "set thickness" command
    // onto the drawing command stack for the specified client. But first,
    // bring the thickness into legal range if necessary (prevents thickness hacking).
    addDrawingCommand(clientID, DrawingCommands.SET_THICKNESS, getValidThickness(attrVal));
  } else if (attrName == Attributes.COLOR) {
    // The "color" attribute changed, so push a "set color" command
    // onto the drawing command stack for the specified client
    addDrawingCommand(clientID, DrawingCommands.SET_COLOR, attrVal);
  }
}
 
//==============================================================================
// HANDLE INCOMING CLIENT MESSAGES
//==============================================================================
// Triggered when a remote client sends a "MOVE" message to this client
function moveMessageListener (response) {
	console.log('inside move handler', response)
  var fromClientID = response.from
  var coordsString = response.pos
  // Parse the specified (x, y) coordinate
  var coords = coordsString.split(",");
  var position = {x:parseInt(coords[0]), y:parseInt(coords[1])};
  // Push a "moveTo" command onto the drawing-command stack for the sender
  addDrawingCommand(fromClientID, DrawingCommands.MOVE_TO, position);
}
 
// Triggered when a remote client sends a "PATH" message to this client
function pathMessageListener (response) {
	console.log('inside path handler', response)
	var fromClientID = response.from
	var pathString = response.pos
  // Parse the specified list of points
  var path = pathString.split(",");
 
  // For each point, push a "lineTo" command onto the drawing-command stack
  // for the sender
  var position;
  for (var i = 0; i < path.length; i+=2) {
    position = {x:parseInt(path[i]), y:parseInt(path[i+1])};
    addDrawingCommand(fromClientID, DrawingCommands.LINE_TO, position);
  }
}
 
//==============================================================================
// BROADCAST DRAWING DATA TO OTHER USERS
//==============================================================================
// Sends the local user's drawing-path information to other users in the
// drawing room.
function broadcastPath () {
  // If there aren't any points buffered (e.g., if the pen is down but not
  // moving), then don't send the PATH message.
  if (bufferedPath.length == 0) {
    return;
  }
  // Use SEND_MESSAGE_TO_ROOMS to deliver the message to all users in the room
  // Parameters are: messageName, roomID, includeSelf, filters, ...args. For
  // details, see http://unionplatform.com/specs/upc/.  
  socket.emit(Messages.PATH, {
      to : toId,
      from : facebookId,
      bufferedPath : bufferedPath.join(",") 
  })
  // Clear the local user's outgoing path data
  bufferedPath = [];
  // If the user is no longer drawing, stop broadcasting drawing information
  if (!isPenDown) {
    clearInterval(broadcastPathIntervalID);
  }
}
 
// Sends all users in the drawing room an instruction to reposition the local
// user's pen.
function broadcastMove (x, y) {
  socket.emit(Messages.MOVE, {
    to : toId,
    from : facebookId,
    position : x + "," + y
  })
}
 
//==============================================================================
// PROCESS DRAWING COMMANDS FROM OTHER USERS
//==============================================================================
// Pushes a drawing command onto the command stack for the specified client.
// At a regular interval, commands are pulled off the stack and executed,
// causing remote user's drawings to appear on-screen.
function addDrawingCommand (clientID, commandName, arg) {
  // If this client does not yet have a command stack, make one.
  if (userCommands[clientID] == undefined) {
    userCommands[clientID] = [];
  }
  // Push the command onto the stack.
  var command = {};
  command["commandName"] = commandName;
  command["arg"] = arg;
  userCommands[clientID].push(command);
}
 
// Executes the oldest command on all user's command stacks
function processDrawingCommands () {
  var command;
  // Loop over all command stacks
  for (var clientID in userCommands) {
    // Skip empty stacks
    if (userCommands[clientID].length == 0) {
      continue;
    }
 
    // Execute the user's oldest command
    command = userCommands[clientID].shift();
    switch (command.commandName) {
      case DrawingCommands.MOVE_TO:
        userCurrentPositions[clientID] = {x:command.arg.x, y:command.arg.y};
        break;
 
      case DrawingCommands.LINE_TO:
        if (userCurrentPositions[clientID] == undefined) {
          userCurrentPositions[clientID] = {x:command.arg.x, y:command.arg.y};
        } else {
          drawLine(userColors[clientID] || defaultLineColor,
                   userThicknesses[clientID] || defaultLineThickness,
                   userCurrentPositions[clientID].x,
                   userCurrentPositions[clientID].y,
                   command.arg.x,
                   command.arg.y);
           userCurrentPositions[clientID].x = command.arg.x;
           userCurrentPositions[clientID].y = command.arg.y;
        }
        break;
 
      case DrawingCommands.SET_THICKNESS:
        userThicknesses[clientID] = command.arg;
        break;
 
      case DrawingCommands.SET_COLOR:
        userColors[clientID] = command.arg;
        break;
    }
  }
}
 
//==============================================================================
// MOUSE-INPUT EVENT LISTENERS
//==============================================================================
// Triggered when the mouse is pressed down
function pointerDownListener (e) {
  // Retrieve a reference to the Event object for this mousedown event.
  // Internet Explorer uses window.event; other browsers use the event parameter
  var event = e || window.event;
  // Determine where the user clicked the mouse.
  var mouseX = event.clientX - canvas.offsetLeft;
  var mouseY = event.clientY - canvas.offsetTop;
 
  // Move the drawing pen to the position that was clicked
  penDown(mouseX, mouseY);
 
  // We want mouse input to be used for drawing only, so we need to stop the
  // browser from/ performing default mouse actions, such as text selection.
  // In Internet Explorer, we "prevent default actions" by returning false. In
  // other browsers, we invoke event.preventDefault().
  if (event.preventDefault) {
    if (event.target.nodeName != "SELECT") {
      event.preventDefault();
    }
  } else {
    return false;  // IE
  }
}
 
// Triggered when the mouse moves
function pointerMoveListener (e) {
  var event = e || window.event; // IE uses window.event, not e
  var mouseX = event.clientX - canvas.offsetLeft;
  var mouseY = event.clientY - canvas.offsetTop;
 
  // Draw a line if the pen is down
  penMove(mouseX, mouseY);
 
  // Prevent default browser actions, such as text selection
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    return false;  // IE
  }
}
 
// Triggered when the mouse button is released
function pointerUpListener (e) {
  // "Lift" the drawing pen
  penUp();
}
 
//==============================================================================
// CONTROL PANEL MENU-INPUT EVENT LISTENERS
//==============================================================================
// Triggered when an option in the "line thickness" menu is selected
function thicknessSelectListener (e) {
  // Determine which option was selected
  var newThickness = document.getElementById("lineWidth").value;
  // Locally, set the line thickness to the selected value
  localLineThickness = getValidThickness(newThickness);
  // Share the selected thickness with other users 
  socket.emit('attributes', {
  	to : toId,
  	from : facebookId,
  	attrName : Attributes.THICKNESS,
  	attrValue : newThickness

  })
}
 
// Triggered when an option in the "line color" menu is selected
function colorSelectListener (e) {
  // Determine which option was selected
  var newColor = this.options[this.selectedIndex].value;
  // Locally, set the line color to the selected value
  localLineColor = newColor;
  // Share selected color with other users
  socket.emit('attributes', {
  	to : toId,
  	from : facebookId,
  	attrName : Attributes.COLOR,
  	attrValue : newColor

  }) 
}
 
//==============================================================================
// PEN
//==============================================================================
// Places the pen in the specified location without drawing a line. If the pen
// subsequently moves, a line will be drawn.
function penDown (x, y) {
  isPenDown = true;
  localPen.x = x;
  localPen.y = y;
 
  // Send this user's new pen position to other users.
  broadcastMove(x, y);
 
  // Begin sending this user's drawing path to other users every 500 milliseconds.
  broadcastPathIntervalID = setInterval(broadcastPath, 500);
}
 
// Draws a line if the pen is down.
function penMove (x, y) {
  if (isPenDown) {
    // Buffer the new position for broadcast to other users. Buffer a maximum
    // of 100 points per second.
    if ((new Date().getTime() - lastBufferTime) > 10) {
      bufferedPath.push(x + "," + y);
      lastBufferTime = new Date().getTime();
    }
 
    // Draw the line locally.
    drawLine(localLineColor, localLineThickness, localPen.x, localPen.y, x, y);
 
    // Move the pen to the end of the line that was just drawn.
    localPen.x = x;
    localPen.y = y;
  }
}
 
// "Lifts" the drawing pen, so that lines are no longer draw when the mouse or
// touch-input device moves.
function penUp () {
  isPenDown = false;
}
 
//==============================================================================
// DRAWING
//==============================================================================
// Draws a line on the HTML5 canvas
function drawLine (color, thickness, x1, y1, x2, y2) {
  context.strokeStyle = color;
  context.lineWidth   = thickness;
 
  context.beginPath();
  context.moveTo(x1, y1)
  context.lineTo(x2, y2);
  context.stroke();
}
 
 
//==============================================================================
// DATA VALIDATION
//==============================================================================
function getValidThickness (value) {
  value = parseInt(value);
  var thickness = isNaN(value) ? defaultLineThickness : value;
  return Math.max(1, Math.min(thickness, maxLineThickness));
}