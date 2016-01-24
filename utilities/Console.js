module.exports = (function (libs) {

	var internals = {

	};

	var api = {

		log: function () {

			console.log.apply(console, arguments);
		},

		info: function () {

			console.info.apply(console, arguments);
		},

		error: function () {

			console.info.apply(console, arguments);
		}
	};

	return api;

})({});