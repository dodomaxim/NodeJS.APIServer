module.exports = (function (libs) {

	var config = {
		path: libs.path.normalize(__dirname + '/'),
		port: 10040
	};

	config.security = {
		secret: 'Hash Oregano Potatoes 1900 Guns and £400 in debt'
	};

	return config;

})({
	path: 	require('path')
});