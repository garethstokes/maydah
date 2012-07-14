(function(maydah){
	var scrollDiv = $('<div class="scroller"></div>');
	$("body").empty().append(scrollDiv);
	function appendRoom(room) {
		// first lets create some divs and stuff that the layout needs
		var roomDiv = $('<div class="room"></div>');
		var titleDiv = $('<div class="title"></div>').text(room.name);
		var outputDiv = $('<div class="output"></div>');
		var inputDiv = $('<div class="input"></div>');
		var inputBox = $('<input type="text"></input>');
		inputBox.keypress(function(e) {
			if (e.keyCode == '13') {
				maydah.chat(room.id, this.value, function(err, success) {
					if(err) {
						alert("could not send message");
					}
				});
				setTimeout(function(){
					inputBox.val("");
				},100);
				
				return false;
			}
		});
		inputDiv.append(inputBox);
		roomDiv.append(titleDiv).append(outputDiv).append(inputDiv).removeClass("show-template-choice");
		scrollDiv.append(roomDiv);

		var h = $(window).height();
		var titleHeight = titleDiv.outerHeight();
		var inputHeight = inputDiv.outerHeight();
		$(outputDiv).height(h - titleHeight - inputHeight - 16);

		inputDiv.width(390);

		function getUser(userId) {
			var result = null;
			for(var i=0, ii=room.users.length; i<ii && !result; i++) {
				if(room.users[i].id === userId) {
					result = room.users[i];
				}
			}
			return result;
		}

		function formatDate(date) {
			if(date.constructor !== Date) {
				date = new Date(date);
			}
			return date.getHours() + ":" + date.getMinutes();
		}

		function log(msg) {
			$('<div class="log"></div>').text(msg).appendTo(outputDiv);
		}

		function addMessage(msg) {
			var usr = getUser(msg.userId);
			var msgObj = $('<div class="chat-item" id="msg_' + msg.id + '"></div>');
			var msgAuthor = $('<div class="user"></div>').text(usr.username);
			var msgInner = $('<div class="message"></div>').text(msg.message);
			var msgDate = $('<div class="date"></div>').text(formatDate(msg.timestamp));
			msgObj.append(msgAuthor).append(msgInner).append(msgDate);
			var lastMsg = $("#msg_".concat(msg.previousMessageId));
			if(lastMsg.length) {
				msgObj.insertAfter(lastMsg);
			} else {
				// need to draw a gap
				outputDiv.append(msgObj);
			}
		}

		maydah.on("chat", function(chat) {
			if(chat.roomId == room.id) {
				addMessage(chat);
			}
		});

		maydah.messages(room.id);
	}
	
	function onGetRooms(err, rooms) {
		if(err) {
			return log(err);
		}
		for (var i = rooms.length - 1; i >= 0; i--) {
			var room = rooms[i];
			appendRoom(room);
		};
	}

	// maydah.on("invited", function(roomId, userId) {
	// 	maydah.roomInfo(roomId);
	// });
	
	maydah.on("room", function(room) {
		appendRoom(room);
	});

	$(window).resize(function() {
		var h = $(window).height();
		var rooms = $(".room");
		scrollDiv.width(rooms.length * (410));
		rooms.each(function(r) {
			var titleHeight = $(r).children("div.title").outerHeight();
			var inputHeight = $(r).children("div.input").outerHeight();
			$(r).children("div.output").height(h - titleHeight - inputHeight - 16);
		});
	});

	// start up things
	maydah.startListening();
	// might as well get the list of rooms
	maydah.getRooms(onGetRooms);
})(maydah);

// hacky
// add all users to our chat room
function addAllUsers() {
	maydah.getRooms(function(err, rooms) {
		$.get("/users/*", function(response) {
			response.result.forEach(function(user) {
				rooms.forEach(function(room) {
					maydah.addUserToRoom(room.id, user.id);
				});
			});
		});
	});
}