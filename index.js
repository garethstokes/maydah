var express = require("express"),
	//db = require("./lib/db"),
	assert = require("node-assert-extras"),
	uuid = require("uuid-js"),
	_ = require("underscore"),
	config = require("./config");

var app = express.createServer();

//db.open(config.database);

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
app.use(express.session({ secret: "The queen is a cunthammer." }));

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
var eventList = {};

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

// add events for a user
function addEventForUser(userId, eventName, object) {
	if(!eventList[userId]) {
		eventList[userId] = [];
	}
	eventList[userId].push({
		name: eventName,
		data: object,
		time: Date.now()
	});
}

function addEventForUsersInRoom(roomId, eventName, object) {
	var room = findRoomById(roomId);
	if(!room) {
		return;
	}
	room.users.forEach(function(userId) {
		addEventForUser(userId, eventName, object);
	});
}

function clearEventForUser(userId, eventName) {
	if(!eventList[userId]) {
		return;
	}
	eventList[userId] = eventList[userId].filter(function(e) {
		return e.name === eventName;
	});
}

function expireEvents() {
	// anything older than 10 mins dies
	var expires = Date.now() - 60000;
	for(var key in eventList) {
		eventList[key] = eventList[key].filter(function(e) {
			return e.time > expires;
		});
	}
}
setInterval(expireEvents, 60000);

var alltitles = ["captain", "ludicrious", "senator", "magical"];
var allusernames = ["evil", "danger", "goodlife", "disaster"];
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
		var room = {
			id: uuid.create(1).toString(),
			name:  username + "'s public room",
			users: [req.session.userId],
			messages: []
		};
		rooms.push(room);

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
			result.push(room);
		}
	});
	res.apiResponse(result);
});
// - Create a room
app.post("/rooms", checkAuth, function(req, res, next) {
	var roomName = req.body.name;
	assert.isString(roomName);

	var room = {
		id: uuid.create(1).toString(),
		name: roomName,
		users: [req.session.userId],
		messages: []
	};
	rooms.push(room);

	res.apiResponse(room);
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
	res.apiResponse(room);
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
	}
	addEventForUser(userId, "room", [room]);
	addEventForUsersInRoom(roomId, "invited", [roomId, userId]);
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
		id: uuid.create(1).toString(),
		previousMessageId: null,
		userId: req.session.userId,
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
	addEventForUsersInRoom(roomId, "chat", [msg]);
	res.apiResponse(msg);
});

app.get("/events", checkAuth, function(req, res, next) {
	var userId = req.session.userId;
	var evts = eventList[userId] || [];
	res.apiResponse(evts);
	eventList[userId] = [];
});

// start the http server
app.listen(config.port, function() {
	console.log("Listening on " + config.port);
});
