/**
 * Security controller module
 *
 * @param  {Object} libs Libraries used by this module
 *
 * @return {Object}      Actions and routes
 *
 * @public
 */
module.exports = (function (libs) {

	/**
	 * Internal utility functions used
	 * by this module
	 * 
	 * @type {Object}
	 *
	 * @private
	 */
	var internals = {

		/**
		 * Validate utilities
		 *
		 * @type {Object}
		 */
		validate: {

			/**
			 * Token format
			 *
			 * @type {RegExp}
			 */
			tokenFormat: /^(Bearer )([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)$/,

			/**
			 * Verify a token's signature
			 *
			 * @type {Function}
			 */
			signature: libs.Promise.promisify(libs.jwt.verify),

			/**
			 * Verifies whether a token structure is valid
			 *
			 * @param  {Object} payload Decoded token object
			 *
			 * @return {Boolean}        Returns true if token is valid
			 *
			 * @private
			 */
			token: function (payload) {
				
				return libs._.isObject(payload) &&
					payload.hasOwnProperty('id') &&
					libs._.isString(payload.id) &&
					payload.hasOwnProperty('scope') &&
					libs._.isArray(payload.scope);
			},

			/**
			 * Verifies whether a request body is valid
			 *
			 * @param  {Object} body JSON decoded request body
			 *
			 * @return {Boolean}     Returns true if payload is valid
			 *
			 * @private
			 */
			payload: function (body) {

				try {
					return libs._.isObject(body) || libs._.isEmpty(body);
				} catch (error) {
					return false;
				}
			}
		},

		/**
		 * Success handler for token verification
		 *
		 * @param  {Object}   request     Request
		 * @param  {Object}   response    Response
		 * @param  {Function} next        Next handler
		 * @param  {Object}   token       Decoded token
		 *
		 * @return {void}
		 *
		 * @private
		 */
		onTokenDecodeSuccess: function (request, response, next, token) {

			request.token = token;
			next();
		},

		/**
		 * Error handler for token verification
		 *
		 * @param  {Object}   request     Request
		 * @param  {Object}   response    Response
		 * @param  {Function} next        Next handler
		 * @param  {Error}    error       Error or object with error name & message
		 *
		 * @return {void}
		 *
		 * @private
		 */
		onTokenDecodeError: function (request, response, next, error) {

			next(error);
		},

		/**
		 * Middleware function that confirms or denies access
		 * based on token scope and specified required permissions
		 *
		 * @param  {Array}    permissions List of permissions
		 * @param  {Object}   request     Request
		 * @param  {Object}   response    Response
		 * @param  {Function} next        Next handler
		 *
		 * @return {void}
		 *
		 * @private
		 */
		processPermissions: function (permissions, request, response, next) {

			if (libs._.intersection(permissions, request.token.scope).length === permissions.length) {
				next();
			} else {
				next({name: 'TokenPermissionError'});
			}
		}
	};

	/**
	 * Actions for routes
	 *
	 * @type {Object}
	 *
	 * @public
	 */
	var actions = {

		/**
		 * Logs all access to endpoints
		 *
		 * @param  {Object}   request  Request
		 * @param  {Object}   response Response
		 * @param  {Function} next     Next handler
		 *
		 * @return {void}
		 *
		 * @public
		 */
		access: function (request, response, next) {

			libs.console.log(
				libs.moment().format(), request.token.id,
				'( ip:', request.get('X-Forwarded-For'), ')',
				request.method, request.originalUrl,
				'with payload: ', JSON.stringify(request.body)
			);
			next();
		},

		/**
		 * Verifies token & request body format.
		 *
		 * @param  {Object}   request  Request
		 * @param  {Object}   response Response
		 * @param  {Function} next     Next handler
		 *
		 * @return {void}
		 *
		 * @public
		 */
		secure: function (request, response, next) {

			if (internals.validate.token(request.token) &&
				internals.validate.payload(request.body)) {
				next();
			} else {
				next({name: 'InvalidPayloadError'});
			}
		},

		/**
		 * Verifies token authenticity based on Authorization
		 * header value (Bearer [token])
		 *
		 * @param  {Object}   request  Request
		 * @param  {Object}   response Response
		 * @param  {Function} next     Next handler
		 *
		 * @return {void}
		 *
		 * @public
		 */
		authenticate: function (request, response, next) {

			if (internals.validate.tokenFormat.test(request.get('authorization'))) {
				var token = libs._.last(request.get('authorization').split(' ')) || '';
				internals.validate.signature(token, config.security.secret)
					.then(internals.onTokenDecodeSuccess.bind(this, request, response, next))
					.catch(internals.onTokenDecodeError.bind(this, request, response, next));
			} else {
				next({name: 'InvalidPayloadError'});
			}
		},

		/**
		 * Generates a token for an ID with a specified scope
		 *
		 * @param  {Object}   request  Request
		 * @param  {Object}   response Response
		 * @param  {Function} next     Next handler
		 *
		 * @return {void}
		 *
		 * @public
		 */
		generate: function (request, response, next) {

			if (internals.validate.token(request.body)) {
				var options = {
					algorithm: 'HS256',
					expiresIn: request.body.validity || '24 hours'
				};
				var token = libs.jwt.sign(request.body, config.security.secret, options);
				response.status(200).json({token: token});
			} else {
				next({name: 'InvalidPayloadError'});
			}
		},

		/**
		 * Generates an overall status response
		 *
		 * @param  {Object}   request  Request
		 * @param  {Object}   response Response
		 * @param  {Function} next     Next handler
		 *
		 * @return {void}
		 *
		 * @public
		 */
		status: function (request, response, next) {

			var apiStatus = {
				status: 'Running on internal port ' + config.port
			};

			response
				.status(200)
				.json(apiStatus);
		},

		/**
		 * Returns a function that verifies permissions attached
		 * to a token, in order to confirm access to a route
		 * 
		 * @param  {Array} 		permissions List of required permissions
		 *
		 * @return {Function}          		Middleware function
		 *
		 * @public
		 */
		require: function (permissions) {

			return internals.processPermissions.bind(this, permissions);
		}
	};

	/**
	 * Routes exposed by this module
	 * 
	 * @type {Array}
	 *
	 * @public
	 */
	var routes = [{
		url: '*',
		actions: [
			actions.authenticate,
			actions.secure,
			actions.require(['General.Access']),
			actions.access
		],
		method: 'all'
	}, {
		url: '/token',
		actions: [
			actions.require(['Token.Generate']),
			actions.generate
		],
		method: 'post'
	}, {
		url: '/status',
		actions: [
			actions.require(['General.Status']),
			actions.status
		],
		method: 'get'
	}];

	return {
		routes: routes,
		require: actions.require
	};

})({
	moment: 	require('moment'),
	_: 			require('underscore'),
	jwt: 		require('jsonwebtoken'),
	Promise: 	require('bluebird/js/release/promise')(),
	console: 	require(config.path + 'utilities/Console'),
});