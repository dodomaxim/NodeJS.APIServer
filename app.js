/**
 * Make the config global
 * 
 * @type {Object}
 *
 * @public
 */
config = require('./config.js');

/**
 * Application starting point
 * 
 * @param  {Object} libs Libraries used by this module
 * 
 * @return {void}
 *
 * @public
 */
(function (libs) {
	
	/**
	 * Functions used by this module internally
	 *
	 * @type {Object}
	 */
	var internals = {

		/**
		 * ExpressJS application
		 * 
		 * @type {Object}
		 */
		app: null,

		/**
		 * Setup functions for the ExpressJS app
		 *
		 * @type {Object}
		 */
		setup: {

			/**
			 * Setup express application
			 *
			 * @return {void}
			 *
			 * @private
			 */
			application: function () {

				internals.app = libs.express();
				internals.app.listen(config.port);
				internals.app.disable('x-powered-by');
				internals.app.disable('etag');
				internals.app.use(libs.bodyParser.json());
			},

			/**
			 * Setup a single route
			 *
			 * @param  {Object} route Route w/ URL, method and actions
			 *
			 * @return {void}
			 *
			 * @private
			 */
			route: function (route) {

				var options = [route.url].concat(route.actions);
				internals.app[route.method].apply(internals.app, options);
				libs.console.log('debug', 'Route enabled:', route.method, route.url);
			},

			/**
			 * Setup an array of routes from a controller
			 *
			 * @param  {Array} routes Array of routes
			 *
			 * @return {void}
			 *
			 * @private
			 */
			routes: function (routes) {

				libs._.each(routes, internals.setup.route);
			},

			/**
			 * Setup log levels and files for operations,
			 * errors and access
			 *
			 * @return {void}
			 *
			 * @private
			 */
			loggers: function () {

				internals.app.use(libs.morgan(config.logs.access.format, config.logs.access));
				libs.console.add(libs.console.transports.File, config.logs.operations);
				libs.console.level = 'debug';
			},

			/**
			 * Setup error handling for routes
			 *
			 * @return {void}
			 *
			 * @private
			 */
			errorHandlers: function () {

				internals.app.use(libs.ErrorHandler);
			}
		}
	};

	internals.setup.application(internals.app);
	internals.setup.loggers();
	internals.setup.routes(libs.Security.routes);
	internals.setup.errorHandlers();
	libs.console.info('Application started');

})({
	express: require('express'),
	_: require('lodash'),
	console: require('winston'),
	morgan: require('morgan'),
	bodyParser: require('body-parser'),
	Security: require(config.path + 'controllers/SecurityController'),
	ErrorHandler: require(config.path + 'utilities/ErrorHandler')
});