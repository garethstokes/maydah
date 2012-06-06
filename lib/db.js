var sqlite3 = require('sqlite3').verbose();
var errors = require("./errors");
var passwords = require("./passwords");
var db = null;

module.exports.open = function(path) {
	if(db != null) {
		console.log("db is already open");
		return;
	}
	db = new sqlite3.Database(path, function(err) {
		if (err) {
			console.error("Error opening database file");
			throw err;
		}
		db.serialize(function() {
			db.exec("CREATE TABLE IF NOT EXISTS project(projectId INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
			db.exec("CREATE TABLE IF NOT EXISTS user(userId INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, password TEXT, salt TEXT, hashIterations INTEGER, settings TEXT)");
			db.exec("CREATE TABLE IF NOT EXISTS projectHasUser(projectId INTEGER, userId INTEGER)");
			db.exec("CREATE TABLE IF NOT EXISTS room(roomId INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
			db.exec("CREATE TABLE IF NOT EXISTS roomHasUser(roomId INTEGER, userId INTEGER, parentMessageId INTEGER)");
			db.exec("CREATE TABLE IF NOT EXISTS message(messageId INTEGER PRIMARY KEY AUTOINCREMENT, roomId INTEGER, userId INTEGER, timestamp INTEGER, message TEXT)");
		});
		console.log("database up and running");
	});
};

module.exports.login = function(opts, callback) {
	this.userExists(opts.email, function(err, userobj) {
		if(err) {
			return callback(err);
		}
		if(!userobj) {
			return callback(errors.ERR_EMAIL_DOES_NOT_EXIST);
		}
		var chksum = passwords.computeWithSalt(opts.password, userobj.hashIterations, userobj.salt);
		if(chksum.hash == userobj.password) {
			return callback(null, userobj);
		}
		return callback(errors.ERR_PASSWORD_INCORRECT);
	});
}

module.exports.userExists = function(email, callback) {
	if (!db) {
		return callback(errors.ERR_DB_NOT_OPEN);
	}
	db.get("SELECT * FROM user WHERE email = ?", [email], callback);
}

module.exports.register = function(opts, callback) {
	if (!db) {
		return callback(errors.ERR_DB_NOT_OPEN);
	}
	// if they already exist then check their password 
	// and return appropriately
	this.userExists(opts.email, function(err, userobj) {
		if(err) {
			return callback(err);
		}
		if(userobj) {
			var chksum = passwords.computeWithSalt(opts.password, userobj.hashIterations, userobj.salt);
			if(chksum.hash == userobj.password) {
				return callback(null, userobj);
			}
			return callback(errors.ERR_EMAIL_IN_USE);
		}
		// new user! let's insert stuff
		var chksum = passwords.compute(opts.password);
		db.run("INSERT INTO user(name, email, password, salt, hashIterations, settings) VALUES(?, ?, ?, ?, ?, ?)", 
				[opts.name, opts.email, chksum.hash, chksum.salt, chksum.iterations, { }], 
				function(err, result) {
					opts.userId = result.lastID;
					callback(null, opts);
			});
	});
}