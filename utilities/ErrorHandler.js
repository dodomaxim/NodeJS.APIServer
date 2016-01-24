/**
 * Error handling middleware
 *
 * @param  {Object}    libs Libraries used by this module
 *
 * @return {Function}       Middleware for ExpressJS use
 *
 * @public
 */
module.exports = (function (libs) {

	/**
	 * Error handling middleware
	 *
	 * @param  {Error}    error       Error or Object with name & message
	 * @param  {Object}   request     Request
	 * @param  {Object}   response    Response
	 * @param  {Function} next        Next handler
	 * 
	 * @return {void}
	 *
	 * @public
	 */
	return function (error, request, response, next) {

		var info = {
			id: (request.token && request.token.id ? request.token.id:'Unknown ID'),
			scope: (request.token && request.token.scope ? request.token.scope.join(', ') : 'Unknown Scope'),
			ip: request.get('X-Forwarded-For') || request.connection.remoteAddress,
			payload: (request.body ? request.body: false),
			url: [request.method, request.originalUrl].join(' ')
		};

		/**
		 * Messages based on error types
		 * 
		 * @type {Object}
		 */
		var messages = {
			'DefaultError': [
				403, 'Not allowed', info.url, 'accessed by', info.id, 'from', info.ip, 'using:', info.scope, 'and payload:', info.payload
			],
			'SyntaxError': [
				400, 'Malformed data', info.url, 'accessed by', info.id, 'from', info.ip, 'using:', info.scope, 'and payload:', info.payload
			],
			'TokenPermissionError': [
				401, 'Not enough permissions', info.url, 'accessed by', info.id, 'from', info.ip, 'using:', info.scope, 'and payload:', info.payload
			],
			'TokenExpiredError': [
				401, 'Token has expired', info.url, 'accessed by', info.id, 'from', info.ip, 'using:', info.scope, 'and payload:', info.payload
			],
			'JsonWebTokenError': [
				401, 'Token is invalid', info.url, 'accessed by', info.id, 'from', info.ip, 'using:', info.scope, 'and payload:', info.payload
			],
			'InvalidPayloadError': [
				400, 'Token or request body payload is invalid', info.url, 'accessed by', info.id, 'from', info.ip, 'using:', info.scope, 'and payload:', info.payload
			]
		};

		if (messages.hasOwnProperty(error.name)) {
			response.status(
				messages[error.name][0]
			).json({
				error: messages[error.name][1]
			});
			libs.console.error(messages[error.name].join(' '))
		} else {
			response.status(
				messages.DefaultError[0]
			).json({
				error: messages.DefaultError[1]
			});
			libs.console.error(messages.DefaultError.join(' '))
		}
		libs.console.error('Details:', error);
	};
})({
	_: 			require('underscore'),
	console: 	require(config.path + 'utilities/Console')
});