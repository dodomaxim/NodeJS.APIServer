module.exports = (function (libs) {

	var internals = {

	};

	/**
	 * Public API exposed by this module
	 *
	 * @type {Object}
	 */
	var api = {

		/**
		 * Log regular actions
		 * 
		 * @return {void}
		 *
		 * @public
		 */
		log: function () {

			console.log.apply(console, arguments);
		},

		/**
		 * Log info
		 * 
		 * @return {void}
		 *
		 * @public
		 */
		info: function () {

			console.info.apply(console, arguments);
		},

		/**
		 * Log errors
		 * 
		 * @return {void}
		 *
		 * @public
		 */
		error: function () {

			console.info.apply(console, arguments);
		}
	};

	return api;

})({});