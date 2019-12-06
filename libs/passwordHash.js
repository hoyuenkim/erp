const crypto = require('crypto');
require('dotenv').config();

module.exports = function(password) {
	return crypto.createHash('sha512').update(password + process.env.SALT).digest('base64');
};
