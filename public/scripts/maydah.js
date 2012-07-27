var maydah = { };
(function(maydah){

	// going to put a layer between socket and the frontend
	// frontend <-> maydah <-> socket.io <-> backend
	// this way plugins can hook into the maydah layer
	// even if there isn't a socket.io portion to it

	/* 
	 * Event listener stuff
	 */
	var _eventListeners = { };
	function getEventListeners(eventName) {
		if(!_eventListeners[eventName]) {
			_eventListeners[eventName] = [];
		}
		return _eventListeners[eventName];
	}

	function addEventListener(eventName, callback, isOneTime) {
		var listeners = getEventListeners(eventName);
		if(listeners.indexOf(callback) === -1) {
			listeners.push({ 
				isOneTime: isOneTime,
				callback: callback
			});
		}
	}

	// register an event listener to be called every time
	maydah.on = function(eventName, callback) {
		addEventListener(eventName, callback, false);
	};

	maydah.once = function(eventName, callback) {
		addEventListener(eventName, callback, true);
	};

	function emit(eventName) {
		var args = [];
		for(var k=1, kk=arguments.length; k<kk; k++) {
			args.push(arguments[k]);
		}
		var listeners = getEventListeners(eventName);
		for(var i=listeners.length - 1; i >= 0; i--) {
			var obj = listeners[i];
			obj.callback.apply(null, args);
			if(obj.isOneTime) {
				listeners.splice(i, 1);
			}
		}
	}
	maydah.emit = emit;

	/*
	 * List of known events
	 * login (userObject) - user has logged in
	 * room (roomObject) - this user was added to a room
	 * invited (roomId, userId) - new user invited to the room
	 * userInfo (userObject) - info for this user retrieved
	 * chat (messageObject) - new chat message received
	 *
	 * Failure events
	 * usersInRoomFailed (roomId) - failed to get list of users in a room
	 * loginFailed - user failed to login
	 * createRoomFailed (roomName) - failed to create a room
	 * addUserToRoomFailed (roomId, userId) - failed to add a user to the room
	 * loadMessagesFailed (roomId) - failed to get a list of messages  
	 */

	/*
	 * User Management stuff
	 */
	 var _userList = { };
	 var _isLoggedIn = false;
	 maydah.isLoggedIn = function() {
	 	return _isLoggedIn;
	 };

	// Login the user
	maydah.login = function(email, password) {
		var params = { 
			email: email, 
			password: password 
		};
		$.post("/login", params).success(function(response) {
				_isLoggedIn = true;
				var user = response.result;
				_userList[user.id] = user;
				emit("login", user);
				emit("userInfo", user);
			}).error(function() {
				_isLoggedIn = false;
				emit("loginFailed");
			});
	};

	/*
	 * Room stuff
	 */
	var _rooms = [];
	// Get all rooms the user has access to
	maydah.getRooms = function(callback) {
		if(_rooms.length) {
			callback(null, _rooms);
		}
		$.get("/rooms").success(function(response) {
			_rooms = response.result;
			callback(null, _rooms);
		}).error(function() {
			callback(new Error("ROOM_LIST_UNAVAILABLE"));
		});
	};

	function roomInfo(roomId) {
		var room = null;
		for(var i=0, ii=_rooms.length; i<ii && !room; i++) {
			if(_rooms[i].id === roomId) {
				room = _rooms[i];
			}
		}
		if(!room) {
			$.get("/rooms/".concat(roomId)).success(function(response) {
				room = response.result;
				_rooms.push(room);
				emit("room", room);
			});
		}
		return room;
	}

	maydah.roomInfo = roomInfo;

	// creates a new room - when new room is created the
	// room event will be raised with the room object
	maydah.createRoom = function(roomName) {
		var params = { 
			name: roomName 
		};
		$.post("/rooms", params).success(function(response){
			var room = response.result;
			_rooms.push(room);
			emit("room", room);
		}).error(function(){
			emit("createRoomFailed", roomName);
		});
	};

	// gets full objects for all users in the room
	// useful because the room object only contains userIds
	// this will emit a userInfo event for each user
	maydah.usersInRoom = function(roomId) {
		$.get("/rooms/".concat(roomId, "/users")).success(function(response) {
			var users = response.result;
			for(var i=0, ii=users.length; i<ii; i++) {
				var user = users[i];
				_userList[user.id] = user;
				emit("userInfo", user);
			}
		}).error(function() {
			emit("usersInRoomFailed", roomId);
		});
	};

	// add a user to the room
	maydah.addUserToRoom = function(roomId, userId) {
		var params = {
			userId: userId
		};
		$.post("/rooms/".concat(roomId, "/users"), params).success(function(response) {
			var room = roomInfo(roomId);
			room.users.push(userId);
		}).error(function() {
			emit("addUserToRoomFailed", roomId, userId);
		});
	};

	maydah.chat = function(roomId, message, callback) {
		var params = {
			message: message,
			type: "text"
		};
		$.post("/rooms/".concat(roomId,"/messages"), params).success(function(){
			callback(null, true);
		}).error(function(){
			callback(new Error("MESSAGE_FAILED"));
		});
	};

	// last N messages for a room
	maydah.messages = function(roomId) {
		$.get("/rooms/".concat(roomId,"/messages")).success(function(response) {
			var msgs = response.result;
			for(var i=0, ii=msgs.length; i<ii; i++) {
				emit("chat", msgs[i]);
			}
		}).error(function() {
			emit("loadMessagesFailed", roomId);
		});
	};

	// get N messages before lastMessageId for a room
	maydah.messagesBefore = function(roomId, lastMessageId) {
		$.get("/rooms/".concat(roomId,"/messages/before/", lastMessageId)).success(function(response) {
			var msgs = response.result;
			for(var i=0, ii=msgs.length; i<ii; i++) {
				emit("chat", roomId, msgs[i]);
			}
		}).error(function() {
			emit("loadMessagesFailed", roomId);
		});
	};

	// get N messages since lastMessageId for a room
	maydah.messagesSince = function(roomId, lastMessageId) {
		$.get("/rooms/".concat(roomId,"/messages/since/", lastMessageId)).success(function(response) {
			var msgs = response.result;
			for(var i=0, ii=msgs.length; i<ii; i++) {
				emit("chat", roomId, msgs[i]);
			}
		}).error(function() {
			emit("loadMessagesFailed", roomId);
		});
	};

	maydah.loadInterface = function(scriptUrl, styleUrl) {
		if(styleUrl) {
			var styleNode = $('<link type="text/css" rel="stylesheet" href="'.concat(styleUrl, '" />'));
			$("head").append(styleNode);
		}
		var scriptNode = $('<script type="text/javascript" src="'.concat(scriptUrl, '"></script>'));
		$("head").append(scriptNode);
	};

	maydah.startListening = function() {
		var socket = io.connect();
		socket.on("chat", function(msg){ 
			emit("chat", msg.data);
		});
		socket.on("room", function(msg){
			console.log("room event", msg);
		});
		socket.on("invited", function(msg) {
			if(msg.user) {
				_userList[msg.user.id] = msg.user;
				emit("userInfo", msg.user);
			}
			emit("invited", msg.roomId, msg.userId);
		});
	}
	// expected startup sequence:
	// 1: load interface
	//
	// interface then does:
	// 1: get rooms
	// 2: pick and get user info for that room
	// 3: start chatting
})(maydah);