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
			'DefaultError': 		{ status: 400, code: 100, message: 'Not allowed' },
			'SyntaxError': 			{ status: 400, code: 101, message: 'Malformed data' },
			'TokenPermissionError': { status: 401, code: 102, message: 'Not enough permissions' },
			'TokenExpiredError': 	{ status: 401, code: 103, message: 'Token has expired' },
			'JsonWebTokenError': 	{ status: 401, code: 104, message: 'Token is invalid' },
			'InvalidPayloadError': 	{ status: 400, code: 105, message: 'Token or request body payload is invalid' },
			'NoDataAvailableError': { status: 400, code: 106, message: 'No data matches given filters' },
			'NothingToRemoveError': { status: 409, code: 107, message: 'Nothing to remove' }
		};

		var result = {
			status: messages.DefaultError.status,
			code: messages.DefaultError.code,
			message: messages.DefaultError.message
		};

		if (messages.hasOwnProperty(error.name)) {
			result.status = messages[error.name].status;
			result.code = messages[error.name].code;
			result.message = messages[error.name].message;
		}

		var log = {
			type: 		'error',
			time: 		libs.moment().format(),
			user: 		info.id,
			ip: 		request.get('X-Forwarded-For'),
			token: 		request.get('authorization'),
			method: 	request.method,
			endpoint: 	request.originalUrl,
			payload: 	request.body,
			info: 		{ error: error.name, message: error.message }
		};

		libs.Database.upsert('logs', log);

		request.analytics.exception(error.name).send();

		Security.respond.call(Security.scope(request, response, next), {error: result});
		libs.console.error('Details:', error);
	};
})({
	_: 			require('underscore'),
	moment: 	require('moment'),
	console: 	require(config.path + 'utilities/Console'),
	Database: 	require(config.path + 'utilities/Database')
});