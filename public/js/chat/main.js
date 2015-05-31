let $ = require('jquery')
let io = require('socket.io-client')
let socket = io()

let facebookId = $('#fromUserId').attr("data-id")

if(facebookId) {
	let toId = '10153022278112655'
	let canvasForm = document.getElementById('canvas')
	console.log(canvasForm)	

	let ctx = canvasForm.getContext('2d')

	let isDrawing	
	let drawOnCanvas = function(inDrawingMode, pos){
		isDrawing = inDrawingMode
		ctx.lineWidth = 10
		ctx.strokeStyle = '#ff0000'
		ctx.lineJoin = ctx.lineCap = 'round'
		ctx.moveTo(pos.x, pos.y)
	}

	let drawOnMove = function(pos) {
		if (isDrawing) {
	  		ctx.lineTo(pos.x, pos.y)
	  		ctx.stroke()
		}        
	}

	canvasForm.onmousedown = function(e) {
        let pos = {
          x : e.clientX,
          y: e.clientY
        }
        drawOnCanvas(true, pos)
        socket.emit('client:mouse-down', {
        	pos : pos,
        	to : toId
        })                     
    }

    canvasForm.onmousemove = function(e) {
    	if(isDrawing) {
	       let pos = {
	          x : e.clientX,
	          y: e.clientY
	        }
	        drawOnMove(pos)
	        socket.emit('client:mouse-move', {
	        	pos : pos,
	        	to : toId
	        })
    	}
    }

    canvasForm.onmouseup = function() {
        isDrawing = false
        socket.emit('client:mouse-up', {
        	isDrawing : false,
        	to : toId
        })
    }

	socket.on('connect', () => {	
		socket.emit('addUser', facebookId)
	})

	socket.on('server:mouse-down', function(pos) {
		drawOnCanvas(true, pos)
	})

	socket.on('server:mouse-move', function(pos) {
		drawOnMove(pos)
	})

	socket.on('server:mouse-up', function(flag) {
		isDrawing = flag
	})
}