var crypto = require('crypto');

function computeWithSalt(value, iterations, salt){
	var hash = new Buffer(value + salt, 'utf8');
	for(var i=0;i<iterations;i++){
		hash = new Buffer(crypto.createHash('md5').update(hash).digest('binary'), 'binary');
	}
	return {
		hash: hash.toString('base64'),
		iterations: iterations,
		salt: salt
	}
}

function compute(value, iterations){
	if(!iterations) {
		iterations = Math.floor(Math.random() * 20);
	}
	var salt = createRandomSalt();
    return computeWithSalt(value, iterations, salt);
}

var allowedChars = "abcdefghijkmnopqrstuvwxyzABCDEFGH­ JKLMNOPQRSTUVWXYZ0123456789!@$?",
	allowedCharsLen = allowedChars.length;
function createRandomSalt(){
    var salt = "";
    for(var i=0;i<8;i++){
    	salt += allowedChars[Math.floor(Math.random() * allowedCharsLen)];
    }
    return salt;
}

module.exports.computeWithSalt = computeWithSalt;
module.exports.compute = compute;
module.exports.createRandomSalt = createRandomSalt;