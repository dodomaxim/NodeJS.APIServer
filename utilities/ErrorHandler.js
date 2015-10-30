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
			id: (request.token&&request.token.id?request.token.id:'Unknown ID'),
			scope: (request.token&&request.token.scope?request.token.scope.join(', '):'Unknown Scope'),
			ip: request.connection.remoteAddress,
			url: ['', request.originalUrl, ''].join('')
		};

		/**
		 * Messages based on error types
		 * 
		 * @type {Object}
		 */
		var messages = {
			'DefaultError': [
				403, 'Not allowed', info.url, 'accessed by', info.id, 'from', info.ip, 'using', info.scope
			],
			'SyntaxError': [
				400, 'Malformed data', info.url, 'accessed by', info.id, 'from', info.ip, 'using', info.scope
			],
			'TokenPermissionError': [
				401, 'Not enough permissions', info.url, 'accessed by', info.id, 'from', info.ip, 'using', info.scope
			],
			'TokenExpiredError': [
				401, 'Token has expired', info.url, 'accessed by', info.id, 'from', info.ip, 'using', info.scope
			],
			'JsonWebTokenError': [
				401, 'Token is invalid', info.url, 'accessed by', info.id, 'from', info.ip, 'using', info.scope
			],
			'InvalidPayloadError': [
				400, 'Token payload is invalid', info.url, 'accessed by', info.id, 'from', info.ip, 'using', info.scope
			]
		};

		if (messages.hasOwnProperty(error.name)) {
			response.status(
				messages[error.name][0]
			).json({
				error: messages[error.name][1]
			});
			libs.console.log('error', messages[error.name].join(' '))
		} else {
			response.status(
				messages.DefaultError[0]
			).json({
				error: messages.DefaultError[1]
			});
			libs.console.log('error', messages.DefaultError.join(' '))
		}
		console.info(error);
	};
})({
	console: require('winston'),
	_: require('lodash')
});