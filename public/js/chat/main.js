let $ = require('jquery')
let io = require('socket.io-client')
let socket = io()

let facebookId = $('#fromUserId').attr("data-id")
$(function(){
	if(facebookId) {
		let $currentSelectedFriend;
		let toId;
		let canvasForm = document.getElementById('canvas')
		console.log(canvasForm)	

		let ctx = canvasForm.getContext('2d')
		$(".js-friends-list-item").click(function(e){
			let $target = $(e.currentTarget);
			toId = $target.data("id");
			if($currentSelectedFriend) {
				$target.find(".js-friend-item").removeClass("teal");
				$target.find(".js-friend-name").removeClass("white-text");
			}

			$target.find(".js-friend-item").addClass("teal");
			$target.find(".js-friend-name").addClass("white-text");
			$currentSelectedFriend = $target;				
		});

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
	          x : e.clientX - canvasForm.offsetLeft,
	          y: e.clientY - canvasForm.offsetTop
	        }

	        if(toId){
		        drawOnCanvas(true, pos)
		        socket.emit('client:mouse-down', {
		        	pos : pos,
		        	to : toId
		        })       
	        }              
	    }

	    canvasForm.onmousemove = function(e) {
	    	if(isDrawing) {
		       let pos = {
		          x : e.clientX - canvasForm.offsetLeft,
	          	  y: e.clientY - canvasForm.offsetTop
		        }
		       if(toId){
			        drawOnMove(pos)
			        socket.emit('client:mouse-move', {
			        	pos : pos,
			        	to : toId
			        })
		    	}
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
})