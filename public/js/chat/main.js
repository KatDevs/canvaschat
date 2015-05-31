let $ = require('jquery')
let io = require('socket.io-client')
let socket = io()

let facebookId = $('#fromUserId').attr("data-id")
$(function(){
	if(facebookId) {
		let $currentSelectedFriend;
		let toId;
		let canvasForm = document.getElementById('canvas')
		
		let colorMap = {
			"red":"#ef5350",
			"blue":"#42a5f5",
			"teal": "#26a69a"			
		}

		let sizeMap = {
			"1x" : "10",
			"2x" : "25",
			"3x" : "40"
		}

		let selectedColor = colorMap["red"];
		let selectedSize = sizeMap["1x"];

		let ctx = canvasForm.getContext('2d')

		let clearActive = function($target) {
			$target.find(".js-friend-item").removeClass("teal");
			$target.find(".js-friend-name").removeClass("white-text");
		}

		let setActive = function($target) {
			$target.find(".js-friend-item").addClass("teal");
			$target.find(".js-friend-name").addClass("white-text");
		}

		$(".js-friends-list-item").click(function(e){
			console.log("clicked")
			let $target = $(e.currentTarget);
			toId = $target.data("id");
			if($currentSelectedFriend) {
				clearActive($target);
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
		});

		$(".js-canvas-color").click(function(e){
			e.preventDefault();
			let $target = $(e.currentTarget);
 			selectedColor = colorMap[$target.data("color")];
 			console.log(selectedColor);
		});

		$(".js-canvas-size").click(function(e){
			e.preventDefault();
			let $target = $(e.currentTarget);
 			selectedSize = sizeMap[$target.data("size")];
 			console.log(selectedSize);
		});


		$(".js-clear-canvas").click(function(e){
			e.preventDefault();
			clearCanvas();
			socket.emit('client:erase-canvas', {to : toId})
			Materialize.toast('Canvas cleared', 2000)
		});

		$(".js-save-canvas").click(function(e){
			e.preventDefault()
			 var dataURL = canvasForm.toDataURL()
			 console.log({foo:dataURL})
			 $.ajax({
			 	url:"/save/canvas",
			 	type:"post",
			 	data: {
			 		userId: $("#fromUserId").data("id"),
			 		fromUser: $("#fromUserFbName").data("name"),
  					toUser: $currentSelectedFriend.find(".js-friend-name").data("name"),
  					imgUrl: dataURL
			 	},
			 	success: function(){
					Materialize.toast('Canvas successfully saved', 2000)
			 	},
			 	error: function(){
					Materialize.toast('Error saving canvas', 2000)
			 	}
			 });
		});

		let clearCanvas = function(){
			ctx.clearRect(0,0,680,405)
		}

		let isDrawing	
		let drawOnCanvas = function(inDrawingMode, pos){
			isDrawing = inDrawingMode
			ctx.beginPath();              
			ctx.lineWidth = pos.size
			ctx.strokeStyle = pos.color
			ctx.lineJoin = ctx.lineCap = 'round'
			ctx.moveTo(pos.x, pos.y)
			ctx.stroke();
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
	          y: e.clientY - canvasForm.offsetTop,
	          color: selectedColor,
	          size: selectedSize
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
	          	  y: e.clientY - canvasForm.offsetTop,
	          	  color: selectedColor,
	          	  size: selectedSize
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

		socket.on('server:erase-canvas', function(update){
			clearCanvas();
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