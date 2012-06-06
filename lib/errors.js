var errorlist = {
	DB_NOT_OPEN: "Database not open",
	EMAIL_IN_USE: "Email address already in use",
	EMAIL_DOES_NOT_EXIST: "Email address does not exist in the system",
	PASSWORD_INCORRECT: "Password was incorrect"
};

for (var key in errorlist) {
	module.exports["ERR_".concat(key)] = new Error(errorlist[key]);
	module.exports[key] = errorlist[key];
}
