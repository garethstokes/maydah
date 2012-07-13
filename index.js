var express = require("express"),
	db = require("./lib/db"),
	assert = require("node-assert-extras"),
	uuid = require("uuid"),
	_ = require("underscore"),
	config = require("./config");

var app = express.createServer();

db.open(config.database);

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
}
app.error(function(err, req, res) {
	console.error(err);
	var code = err.status || 500;
	res.send({
		error: err,
		timestamp: Date.now()
	}, parseInt(err.status));
});

app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "The queen is a cunthammer." }));

app.set("views", __dirname + "/views");
app.set("view engine", "jade");


function checkAuth(req, res, next) {
	if(!req.session.userId) {
		return res.redirect("/landing");
	}
	next();
}

/*
	Web pages
*/

app.get("/", checkAuth, function(req, res, next) {
	res.send("No place like 127.0.0.1");
});

app.get("/landing", function(req, res, next) {
	res.render("landing", { layout: false}); 
});


// fake database
var users = [];
var rooms = [];

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


/*
	API
*/

function standardResponse(responseObject, result) {
	responseObject.send({ 
		result: result, 
		timestamp: Date.now() 
	});
}


app.post("/login", function(req, res, next) {
	try { 
		var username = req.body.username;
		assert.isString(username);
		var userId = uuid.generate();
		var user = {
			id: userId,
			username: username
		};
		users.push(user);
		req.session.userId = userId;
		standardResponse(user);
	} catch(e) {
		console.error("api.login");
		next(e);
	}
});

// - Gets all the rooms the user has access to
app.get("/rooms", checkAuth, function(req, res, next) {
	var result = [];
	rooms.forEach(function(room) {
		if(room.users.indexOf(req.session.userId) !== -1) {
			result.push(room);
		}
	});
	standardResponse(result);
});
// - Create a room
app.post("/rooms", checkAuth, function(req, res, next) {
	var roomName = req.body.name;
	assert.isString(roomName);

	var room = {
		id: uuid.generate(),
		name: roomName,
		users: [req.session.userId],
		messages: []
	}
	rooms.push(room);

	standardResponse(res, room);
});
// - Get room info
app.get("/rooms/:id", checkAuth, function(req, res, next) {
	var roomId = req.params.id;
	assert.isString(roomId);
	var room = findRoomById(roomId);
	if(!room) {
		return next(new Error("ROOM_NOT_FOUND"));
	}
	standardResponse(res, room);
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
	standardResponse(res, result);
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
	room.users.push(userId);
	standardResponse(room);
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
	return room.messages.slice(-1000);
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
	assert.isString(roomId);
	assert.isString(message);
	var msg = {
		userId: req.session.userId,
		message: message,
		timestamp: Date.now()
	}
	var room = findRoomById(roomId);
	if(!room) {
		return next(new Error("ROOM_NOT_FOUND"));
	}
	if(room.users.indexOf(req.session.userId) === -1) {
		return next(new Error("ACCESS_TO_ROOM_DENIED"));
	}
	room.messages.push(msg);
	standardResponse(res, msg);
});


// start the http server
app.listen(config.port, function() {
	console.log("Listening on " + config.port);
});
