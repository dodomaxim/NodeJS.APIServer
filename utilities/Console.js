module.exports = (function (libs) {

	var internals = {

	};

	/**
	 * Public API exposed by this module
	 *
	 * @type {Object}
	 */
	var api = {

		save: function (entry, info) {

			entry = entry || {};
			var log = {
				time:		libs.moment().format(),
				type:		entry.type		|| 'operation',
				user:		entry.user		|| '',
				ip:			entry.ip		|| '',
				token:		entry.token		|| '',
				method:		entry.method	|| '',
				endpoint:	entry.endpoint	|| '',
				payload:	entry.payload	|| '',
				info:		info 			|| ''
			};

			libs.Database.upsert('logs', log);
		},

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

})({
	moment: 	require('moment'),
	Database: 	require(config.path + 'utilities/Database')
});