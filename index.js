var express = require("express"),
	db = require("./lib/db"),
	assert = require("node-assert-extras"),
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
	console.log(err);
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

/*
	API
*/

// - Gets all the rooms
app.get("/rooms", checkAuth, function(req, res, next) {
	res.send([]);
});
// - Get room info
app.get("/rooms/:id", checkAuth, function(req, res, next) {
	res.send({});
});
// - Get all users in a room 
app.get("/rooms/:id/users", checkAuth, function(req, res, next) {
	res.send([]);
});
// - Get last N messages for a room
app.get("/rooms/:id/messages", checkAuth, function(req, res, next) {
	res.send([]);
});
// - Get last N messages since lastMessageId for a room 
app.get("/rooms/:id/messages/before/:lastMessageId", checkAuth, function(req, res, next) {
	res.send([]);
});
// - Add a user to a room
app.post("/rooms/:id/users", checkAuth, function(req, res, next) {
	res.send({});
});
// - Add a message to a room
app.post("/rooms/:id/messages", checkAuth, function(req, res, next) {
	res.send({});
});


// start the http server
app.listen(config.port, function() {
	console.log("Listening on " + config.port);
});
