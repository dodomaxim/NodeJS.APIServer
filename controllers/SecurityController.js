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

		contentSecurityPolicy: [
			"default-src 'none'",
			"script-src 'none'",
			"object-src 'none'",
			"img-src 'none'",
			"media-src 'none'",
			"frame-src 'none'",
			"font-src 'none'",
			"connect-src 'none'",
			"style-src 'none'"
		].join(';'),

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
		},

		/**
		 * Validate whether the input for generating
		 * a token is expected or incorrect
		 * 
		 * @param  {Object}  payload Object with id & scope [& validity]
		 *
		 * @return {Boolean}         Returns true if payload is valid
		 *
		 * @private
		 */
		validateTokenPayload: function (payload) {

			return typeof payload === 'object' &&
				payload.hasOwnProperty('id') &&
				payload.hasOwnProperty('scope') &&
				payload.scope.length >= 1;
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
		 * Verifies token format: confirms whether it has
		 * id & scope. Also adds some security headers
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

			response.header('X-Frame-Options', 'Deny');
			response.header('Content-Security-Policy', internals.contentSecurityPolicy);
			response.header('X-XSS-Protection', '1; mode=block');
			response.header('X-Content-Type-Options', 'nosniff');
			if (request.token &&
				request.token.id &&
				request.token.scope &&
				request.token.scope.length >= 1) {
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

			if (request.get('authorization') &&
				request.get('authorization').indexOf('Bearer ') === 0) {
				var verify = libs.Promise.promisify(libs.jwt.verify);
				var token = libs._.last(request.get('authorization').split(' ')) || '';
				verify(token, config.security.secret)
					.then(internals.onTokenDecodeSuccess.bind(this, request, response, next))
					.catch(internals.onTokenDecodeError.bind(this, request, response, next));
			} else {
				next({name:'DefaultError'});
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

			if (internals.validateTokenPayload(request.body)) {
				var options = {
					algorithm: 'HS256',
					expiresIn: request.body.validity || '24 hours'
				};
				var token = libs.jwt.sign(request.body, config.security.secret, options);
				response.status(200).json({token: token});
				libs.console.info(
					request.token.id, 'generated a', options.expiresIn,
					'valid token for', request.body.id,
					'with:', request.body.scope.join(', ')
				);
			} else {
				next({name: 'InvalidPayloadError'});
			}
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
		actions: [actions.authenticate, actions.secure, actions.require(['General.Access'])],
		method: 'all'
	}, {
		url: '/token/generate',
		actions: [actions.require(['Token.Generate']), actions.generate],
		method: 'post'
	}];

	return {
		actions: actions,
		routes: routes
	};

})({
	jwt: require('jsonwebtoken'),
	_: require('lodash'),
	console: require('winston'),
	Promise: require('bluebird')
});