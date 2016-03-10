module.exports = (function (libs) {
	
	/**
	 * Internal utilities used by this module
	 * 
	 * @type {Object}
	 */
	var internals = {

		/**
		 * Omit sensitive or unused data from the DB response
		 *
		 * @type {Function}
		 */
		omit: libs._.partial(libs._.omit, libs._, ['_id']),

		/**
		 * Currently connected database
		 *
		 * @type {Object}
		 */
		database: null,

		/**
		 * On MongoDB connect handler
		 *
		 * @param  {Function} resolve  Promise resolve function
		 * @param  {Function} reject   Promise reject function
		 * @param  {Object}   error    Error or null
		 * @param  {Object}   database MongoDB Database object
		 *
		 * @return {Promise}
		 *
		 * @private
		 */
		onConnect: function (resolve, reject, error, database) {

			if (!error) {
				internals.database = database;
				resolve();
			} else {
				reject(error);
			}
		},

		/**
		 * Process various MongoDB responses
		 * 
		 * @type {Object}
		 */
		process: {

			/**
			 * Process upsert MongoDB response
			 * 
			 * @param  {Object} mongoResponse MongoDB response
			 *
			 * @return {Object}               Processed message
			 *
			 * @private
			 */
			upsert: function (mongoResponse) {
 				
 				if (mongoResponse.ok === 1 && mongoResponse.value._id) {
 					return internals.omit(mongoResponse.value);
 				}
 				return {
 					error: Errors.spawn(400, 100, mongoResponse.lastErrorObject)
 				};
			},

			/**
			 * Process list MongoDB response
			 * 
			 * @param  {Object} mongoResponse MongoDB response
			 *
			 * @return {Object}               Processed message
			 *
			 * @private
			 */
			list: function (mongoResponse) {

				if (mongoResponse && mongoResponse.length > 0) {
					return libs._.map(mongoResponse, internals.omit);
				}
				return [];
			},

			/**
			 * Process remove MongoDB response
			 * 
			 * @param  {Object} mongoResponse MongoDB response
			 *
			 * @return {Object}               Processed message
			 *
			 * @private
			 */
			remove: function (mongoResponse) {

				if (mongoResponse.result.ok === 1 && mongoResponse.result.n > 0) {
					return {
						success: ['Removed', mongoResponse.result.n, 'record(s)'].join(' ')
					}
				}
				return {
					error: Errors.NothingToRemoveError
				}
			}
		}
	};

	/**
	 * Public API exposed by this module
	 *
	 * @type {Object}
	 */
	var api = {

		/**
		 * Connect to a database, based on URL
		 *
		 * @param  {String} url Database connection URL
		 *
		 * @return {Promise}
		 *
		 * @public
		 */
		connect: function (url) {

			var action = function (resolve, reject) {
				
				var client = new libs.mongo.MongoClient();
				client.connect(url, internals.onConnect.bind(this, resolve, reject));
			};

			return new libs.Promise(action);
		},

		/**
		 * Insert or update a row
		 *
		 * @param  {String} collection Collection name
		 * @param  {Object} data       Data to be interted or updated
		 * @param  {Object} filters    Filters for selecting data, when updating. Omit when inserting
		 *
		 * @return {Promise}
		 *
		 * @public
		 */
		upsert: function (collection, data, filters) {

			var sort = [];
			var operation = {
				$set: data
			};
			var options = {
				upsert: true,
				new: true
			};

			if (filters) {
				return internals.database.collection(collection)
					.findAndModify(filters, sort, operation, options)
					.then(internals.process.upsert);
			} else {
				return internals.database.collection(collection)
					.insert(data)
					.then(internals.process.upsert);
			}

		},

		/**
		 * Delete one or more rows
		 *
		 * @param  {String} collection Collection name
		 * @param  {Object} filters    Filters for selecting data
		 *
		 * @return {Promise}
		 *
		 * @public
		 */
		remove: function (collection, filters) {
			
			return internals.database.collection(collection)
				.deleteMany(filters)
				.then(internals.process.remove);;
		},

		/**
		 * List one or more rows
		 *
		 * @param  {String} collection Collection name
		 * @param  {Object} filters    Filters for selecting data
		 * @param  {Object} sort       Sort options
		 *
		 * @return {Promise}
		 *
		 * @public
		 */
		list: function (collection, filters, sort) {

			var cursor = internals.database.collection(collection)
				.find(filters || {});

			if (sort) {
				cursor.sort(sort)
			}
			return cursor
				.toArray()
				.then(internals.process.list);
		}
	};

	libs.mongo = libs.Promise.promisifyAll(libs.mongo);
	return api;

})({
	mongo:		require('mongodb'),
	_:			require('underscore'),
	Promise:	require('bluebird/js/release/promise')()
});