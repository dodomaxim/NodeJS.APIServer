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
		 * Returns the scope for sending a response
		 * This utility is public as it can be useful to other modules
		 * 
		 * @param  {Object} request  Request
		 * @param  {Object} response Response
		 * @param  {Object} next     Function
		 *
		 * @return {Object}
		 *
		 * @public
		 */
		scope: function (request, response, next) {

			return {
				request: request,
				response: response,
				next: next
			};
		},

		/**
		 * Send a server response
		 * This utility is public as it can be useful to other modules
		 * Current scope is an object with a request, response & next properties (via .bind)
		 * 
		 * @param  {Object} data JSON object to be returned as response
		 *
		 * @return {void}
		 *
		 * @public
		 */
		send: function (data) {

			this.response.status(200).json(data);
		},

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
		 * Confirm the from the request token is present & enabled in the database
		 * Current scope is an object with a request, response & next properties (via .bind)
		 *
		 * @param  {Object}   token     Decoded token from the request
		 * @param  {Object}   result    Database response with token record
		 *
		 * @return {void}
		 *
		 * @private
		 */
		confirmToken: function (token, result) {

			if (result && result.token === this.request.tokenString) {
				this.request.token = token;
				this.next();
			} else {
				this.next({name: 'JsonWebTokenError'})
			}
		},

		/**
		 * Success handler for token verification
		 * Current scope is an object with a request, response & next properties (via .bind)
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
		onTokenDecodeSuccess: function (token) {

			var filters = {
				scope:  token.scope,
				user: 	token.id,
				status: 'enabled'
			};

			libs.Database.list('tokens', filters)
				.then(libs._.first)
				.then(internals.confirmToken.bind(this, token));
		},

		/**
		 * Error handler for token verification
		 * Current scope is an object with a request, response & next properties (via .bind)
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
		onTokenDecodeError: function (error) {

			this.next(error);
		},

		/**
		 * Middleware function that confirms or denies access
		 * based on token scope and specified required permissions.
		 * Current scope is an object with a 'permissions' property (via .bind)
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
		processPermissions: function (request, response, next) {

			if (libs._.intersection(this.permissions, request.token.scope).length === this.permissions.length) {
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

			var log = {
				type: 		'request',
				time: 		libs.moment().format(),
				user: 		request.token.id,
				ip: 		request.get('X-Forwarded-For'),
				token: 		request.get('authorization'),
				method: 	request.method,
				endpoint: 	request.originalUrl,
				payload: 	JSON.stringify(request.body)
			};

			libs.Database.upsert('logs', log);
			libs.console.log(
				log.time, log.user,
				'(ip: ' + log.ip + ')',
				log.method, log.endpoint,
				'with payload: ', log.payload
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

			var scope = internals.scope(request, response, next);
			if (internals.validate.tokenFormat.test(request.get('authorization'))) {
				request.tokenString = libs._.last(request.get('authorization').split(' ')) || '';
				internals.validate.signature(request.tokenString, config.security.secret)
					.then(internals.onTokenDecodeSuccess.bind(scope))
					.catch(internals.onTokenDecodeError.bind(scope));
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

			var scope = internals.scope(request, response, next);
			if (internals.validate.token(request.body)) {
				var options = {
					algorithm: 'HS256',
					expiresIn: request.body.validity || '24 hours'
				};
				var token = libs.jwt.sign(request.body, config.security.secret, options);
				libs.Database.upsert('tokens', {
					time: 		libs.moment().format(),
					token: 		token,
					user: 		request.body.id,
					validity: 	options.expiresIn,
					scope: 		request.body.scope,
					status: 	'enabled',
					authority: 	request.token.id
				}, {
					user: request.body.id
				});
				internals.send.call(scope, {token: token});
			} else {
				next({name: 'InvalidPayloadError'});
			}
		},

		/**
		 * Shows log entries for a user
		 *
		 * @param  {Object}   request  Request
		 * @param  {Object}   response Response
		 * @param  {Function} next     Next handler
		 *
		 * @return {void}
		 *
		 * @public
		 */
		logs: function (request, response, next) {

			var scope = internals.scope(request, response, next);

			var filters = {
				user: request.params.user,
			};
			var sort = {
				time: -1
			};
			libs.Database.list('logs', filters, sort)
				.then(internals.send.bind(scope));
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

			return internals.processPermissions.bind({permissions: permissions});
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
		url: '/logs/:user',
		actions: [
			actions.require(['General.Logs']),
			actions.logs
		],
		method: 'get'
	}];

	return {
		routes: routes,
		require: actions.require,
		respond: internals.send,
		scope: internals.scope
	};

})({
	moment: 	require('moment'),
	_: 			require('underscore'),
	jwt: 		require('jsonwebtoken'),
	Promise: 	require('bluebird/js/release/promise')(),
	console: 	require(config.path + 'utilities/Console'),
	Database: 	require(config.path + 'utilities/Database'),
});