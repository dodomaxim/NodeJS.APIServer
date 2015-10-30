module.exports = (function (libs) {

	var config = {
		path: libs.path.normalize(__dirname + '/'),
		port: 10040
	};

	config.security = {
		secret: 'shhhhhhh'
	};

	config.logs = {
		access: {
			format: ':remote-addr :date[iso] :status :method :url',
			stream: libs.fs.createWriteStream(config.path + 'logs/access.log', {flags: 'a'})
		},
		operations: {
			name: 'operations-log',
			filename: config.path + 'logs/operations.log',
			maxsize: 10000000,
			level: 'debug'
		},
		errors: {
			name: 'errors-log',
			filename: config.path + 'logs/error.log',
			maxsize: 10000000,
			level: 'error'
		}
	}

	return config;

})({
	path: require('path'),
	fs: require('fs')
});