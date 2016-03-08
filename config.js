module.exports = (function (libs) {

	var config = {
		path: libs.path.normalize(__dirname + '/'),
		port: 10040,
		ip: '127.0.0.1'
	};

	config.database = {
		url: 'mongodb://localhost:27017/NodeJSAPI'
	};

	config.security = {
		secret: 'Hash Oregano Potatoes 1900 Guns and £400 in debt'
	};

	return config;

})({
	path: 	require('path')
});