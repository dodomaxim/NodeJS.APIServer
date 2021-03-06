/**
 * Application errors list
 *
 * @param  {Object}    libs Libraries used by this module
 *
 * @return {Object}         Object with various errors & messages
 *
 * @public
 */
module.exports = (function (libs) {

	/**
	 * Public API exposed by this module
	 * 
	 * @type {Object}
	 */
	var api = {

		DefaultError:			{ status: 400, code: 100, message: 'Not allowed' },
		SyntaxError:			{ status: 400, code: 101, message: 'Malformed data' },
		TokenPermissionError:	{ status: 401, code: 102, message: 'Not enough permissions' },
		TokenExpiredError:		{ status: 401, code: 103, message: 'Token has expired' },
		JsonWebTokenError:		{ status: 401, code: 104, message: 'Token is invalid' },
		InvalidPayloadError:	{ status: 400, code: 105, message: 'Token or request body payload is invalid' },
		NoDataAvailableError:	{ status: 404, code: 106, message: 'No data matches given filters' },
		NothingToRemoveError:	{ status: 409, code: 107, message: 'Nothing to remove' },

		/**
		 * Spawn a new custom error object
		 *
		 * @param  {Number} status  Status code
		 * @param  {Number} code    Error code
		 * @param  {String} message Error message
		 *
		 * @return {Object}         Error object
		 */
		spawn: function (status, code, message) {

			return {
				status:		status,
				code:		code,
				message:	message
			}
		}
	};

	return api;

})({});