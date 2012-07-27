var express = require("express"),
	//db = require("./lib/db"),
	io = require('socket.io'),
	assert = require("node-assert-extras"),
	uuid = require("uuid-js"),
	_ = require("underscore"),
	config = require("./config");

var connect = require('express/node_modules/connect'),
	MemoryStore = connect.middleware.session.MemoryStore,
	parseCookie = connect.utils.parseCookie,
	sessionStore = new MemoryStore();

var app = express.createServer();

/*
 * Socket.IO stuff
 */
var sockets = { };
var socketManager = io.listen(app).set('authorization', function (data, accept) {
	// all this is to get the cookie out of the session info
	if (!data.headers.cookie) {
		console.log("no cookie");
		return accept('No cookie transmitted.', false);
	}
	var cookie = parseCookie(data.headers.cookie);
	var sessionID = cookie["maydah"];
	sessionStore.load(sessionID, function (err, session) {
		if (err || !session || !session.userId) {
			return accept('Error', false);
		}
		data.userId = session.userId;
		return accept(null, true);
	});
}).sockets.on('connection', function (_socket) {
  var userId = _socket.handshake.userId;
  sockets[userId] = _socket;
});


/*
	GENERIC ERROR HANDLER
 */
var errMsgs = {
	"401": "Mmmm... you're not supposed to go there.",
	"403": "Mmmm... you're not supposed to go there.",
	"404": "That file could not be found.",
	"418": "I'm a teapot all short and stout.",
	"500": "Looks like the server misplaced a bit. Sorry.",
	"501": "Those lazy software engineers haven't implemented this."
};
app.error(function(err, req, res) {
	console.error(err);
	var code = err.status || 500;
	res.send({
		error: err,
		timestamp: Date.now()
	}, parseInt(err.status, 10));
});

app.use(express["static"](__dirname + '/public'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "The queen is a cunthammer.", key:"maydah", store: sessionStore }));

app.set("views", __dirname + "/views");
app.set("view engine", "jade");


function checkAuth(req, res, next) {
	if(!req.session.userId) {
		return res.redirect("/landing");
	}
	next();
}

var templateList = {
	"console": {
		script: "/scripts/console-template.js",
		style: "/styles/console-template.css"
	}
};
/*
	Web pages
*/

app.get("/", checkAuth, function(req, res, next) {
	res.render("home", { layout: false, templateList: templateList });
});

app.get("/landing", function(req, res, next) {
	res.render("landing", { layout: false}); 
});

// fake database
var users = [];
var rooms = [];

app.get("/db", function(req, res) {
	res.send({users: users, rooms: rooms, eventList: eventList });
})

function findUserById(userId) {
	return _.find(users, function(u) {
		return u.id === userId;
	});
}

function findRoomById(roomId) {
	return _.find(rooms, function(r) {
		return r.id === roomId;
	});
}

var alltitles = ["captain", "ludicrious", "senator", "general"];
var allusernames = ["evil", "danger", "typhoon", "disaster", "snowflake"];
function randomUsername() {
	return alltitles[~~(Math.random() * alltitles.length)] + " " + allusernames[~~(Math.random() * allusernames.length)];
}


/*
	API
*/

require("http").ServerResponse.prototype.apiResponse = function(result) {
	this.send({ 
		result: result, 
		timestamp: Date.now() 
	});
}

function formatRoomObject(roomObj) {
	var result = {
		id: roomObj.id,
		name: roomObj.name,
		users: roomObj.users.map(findUserById)
	}
	return result;
}

var globalRoom = {
	id: uuid.create(1).toString(),
	name:  "Global Room",
	users: [],
	messages: []	
}
rooms.push(globalRoom);

app.post("/login", function(req, res, next) {
	try { 
		var email = req.body.email;
		assert.isString(email);
		var username = randomUsername();
		var userId = uuid.create(1).toString();
		var user = {
			id: userId,
			username: username,
			email: email
		};
		users.push(user);
		req.session.userId = userId;

		// hack so that new users automatically have a room
		// this should be done on signup not signin
		globalRoom.users.push(userId);
		if(sockets[userId]) {
			sockets[userId].join(globalRoom.id);
			socketManager.in(roomId).emit('invited', { roomId: roomId, userId: userId, user: user });
		}
		res.apiResponse(user);
	} catch(e) {
		console.error("api.login");
		next(e);
	}
});

app.get("/users/:searchTerm", checkAuth, function(req, res, next) {
	var term = req.params.searchTerm;
	assert.isString(term);
	if(term.length < 4) {
		// hack so that i can see all users in the system
		if(term == "*") {
			return res.apiResponse(users);
		}
		return next(new Error("SEARCH_TERM_TOO_SHORT"));
	}
	var result = users.filter(function(u) {
		return u.name == searchTerm || u.email == searchTerm;
	});
	res.apiResponse(result);
});

// - Gets all the rooms the user has access to
app.get("/rooms", checkAuth, function(req, res, next) {
	var result = [];
	rooms.forEach(function(room) {
		if(room.users.indexOf(req.session.userId) !== -1) {
			result.push(formatRoomObject(room));
		}
	});
	res.apiResponse(result);
});
// - Create a room
app.post("/rooms", checkAuth, function(req, res, next) {
	var roomName = req.body.name;
	var userId = req.session.userId;
	assert.isString(roomName);

	var room = {
		id: uuid.create(1).toString(),
		name: roomName,
		users: [userId],
		messages: []
	};
	rooms.push(room);

	if(sockets[userId]) {
		sockets[userId].join(room.id)
	}

	res.apiResponse(formatRoomObject(room));
});
app.get("/rooms/:id", checkAuth, function(req, res, next) {
	var roomId = req.params.id;
	assert.isString(roomId);
	var room = findRoomById(roomId);
	if(!room) {
		return next(new Error("ROOM_NOT_FOUND"));
	}
	if(room.users.indexOf(req.session.userId) === -1) {
		return next(new Error("ACCESS_TO_ROOM_DENIED"));
	}
	res.apiResponse(formatRoomObject(room));
});
// - Get all users in a room 
app.get("/rooms/:id/users", checkAuth, function(req, res, next) {
	var roomId = req.params.id;
	assert.isString(roomId);
	var room = findRoomById(roomId);
	if(!room) {
		return next(new Error("ROOM_NOT_FOUND"));
	}
	if(room.users.indexOf(req.session.userId) === -1) {
		return next(new Error("ACCESS_TO_ROOM_DENIED"));
	}
	var result = [];
	room.users.forEach(function(userId) {
		var user = _.find(users, function(u) {
			return u.id == userId;
		});
		if(user) {
			result.push(user);
		}
	});
	res.apiResponse(result);
});
// - Add a user to a room - i.e. invite
app.post("/rooms/:id/users", checkAuth, function(req, res, next) {
	var roomId = req.params.id;
	var userId = req.body.userId;
	assert.isString(roomId);
	assert.isString(userId);
	var room = findRoomById(roomId);
	if(!room) {
		return next(new Error("ROOM_NOT_FOUND"));
	}
	if(room.users.indexOf(req.session.userId) === -1) {
		return next(new Error("ACCESS_TO_ROOM_DENIED"));
	}
	if(room.users.indexOf(userId) === -1) {
		room.users.push(userId);

		if(sockets[userId]) {
			sockets[userId].join(roomId);
			sockets[userId].emit("room", { room: formatRoomObject(room) });
		}
	}

	socketManager.in(roomId).emit('invited', { roomId: roomId, userId: userId });

	res.apiResponse(room);
});
// - Get last N messages for a room
// where N == 1000
app.get("/rooms/:id/messages", checkAuth, function(req, res, next) {
	var roomId = req.params.id;
	assert.isString(roomId);
	var room = findRoomById(roomId);
	if(!room) {
		return next(new Error("ROOM_NOT_FOUND"));
	}
	if(room.users.indexOf(req.session.userId) === -1) {
		return next(new Error("ACCESS_TO_ROOM_DENIED"));
	}
	return res.apiResponse(room.messages.slice(-1000));
});
// - Get last N messages before lastMessageId for a room 
app.get("/rooms/:id/messages/before/:lastMessageId", checkAuth, function(req, res, next) {
	// too hard basket for now
	res.send([]);
});
// - Get last N messages since lastMessageId for a room 
app.get("/rooms/:id/messages/since/:lastMessageId", checkAuth, function(req, res, next) {
	// too hard basket for now
	res.send([]);
});
// - Add a message to a room
app.post("/rooms/:id/messages", checkAuth, function(req, res, next) {
	var message = req.body.message;
	var roomId = req.params.id;
	var userId = req.session.userId;

	assert.isString(roomId);
	assert.isString(message);	
	var msg = {
		id: uuid.create(1).toString(),
		previousMessageId: null,
		userId: userId,
		roomId: roomId,
		message: message,
		timestamp: Date.now()
	};
	var room = findRoomById(roomId);
	if(!room) {
		return next(new Error("ROOM_NOT_FOUND"));
	}
	if(room.users.indexOf(req.session.userId) === -1) {
		return next(new Error("ACCESS_TO_ROOM_DENIED"));
	}
	if(room.messages.length) {
		msg.previousMessageId = room.messages[room.messages.length - 1].id;
	}
	room.messages.push(msg);

	// in case the user is not part of the socketio room
	if(sockets[userId]) {
		sockets[userId].join(roomId);
	}
	socketManager.in(roomId).emit('chat', {data: msg, roomId: roomId});

	res.apiResponse(msg);
});

// start the http server
app.listen(config.port, function() {
	console.log("Listening on " + config.port);
});

