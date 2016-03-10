/**
 * Make the config global
 * 
 * @type {Object}
 *
 * @public
 */
config = require('./config.js');

/**
 * Make Security global
 * 
 * @type {Object}
 *
 * @public
 */
Security = require(config.path + 'controllers/SecurityController');

/**
 * Make Errors global
 * 
 * @type {Object}
 *
 * @public
 */
Errors = require(config.path + 'utilities/Errors');

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
				internals.app.listen(config.port, config.ip);
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
				libs.console.info('Route enabled:', route.method, route.url);
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

	libs.Database.connect(config.database.url)
		.then(internals.setup.application.bind(this, internals.app))
		.then(internals.setup.routes.bind(this, Security.routes))
		.then(Security.admin)
		.then(internals.setup.errorHandlers);

	libs.console.info('Application started on port', config.port);

})({
	express: 		require('express'),
	_: 				require('underscore'),
	bodyParser: 	require('body-parser'),
	console: 		require(config.path + 'utilities/Console'),
	Database: 		require(config.path + 'utilities/Database'),
	ErrorHandler: 	require(config.path + 'utilities/ErrorHandler')
});