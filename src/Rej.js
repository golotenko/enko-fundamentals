
// "Rej" stands for "Rejections"
// this module defines shortcuts for classified
// errors to distinct them programmatically
// (to decide whether or not to write it to Diag, for example)

let toReject = (httpStatusCode, okByDefault = false) => {
	/**
	 * @param {{passToClient: boolean, isOk: boolean, anythingElse: *}} data
	 */
	let makeExc = (msg, data = undefined) => {
		let exc;
		let isOk = (data || {}).isOk;
		if (isOk === undefined) {
			isOk = okByDefault;
		}
		if (!isOk) {
			exc = new Error(msg);
		} else {
			// this is probably faster, and saves you few days of life
			// when you see tons of meaningless stack traces in the log
			exc = {message: msg, toString: () => msg};
		}
		exc.httpStatusCode = httpStatusCode;
		exc.isOk = isOk;
		exc.data = data;
		return exc;
	};
	let reject = (msg, data = undefined) => {
		let exc = makeExc(msg, data);
		let rejection = Promise.reject(exc);
		let cls = Object.entries(classes)
			.filter(([, reject]) => {
				return +reject.httpStatusCode === +httpStatusCode;
			})
			.map(([cls]) => cls)[0] || httpStatusCode;
		/**
		 * for code mistakes when you `throw Rej.NotImplemented()`
		 * instead if `throw Rej.NotImplemented.makeExc()`
		 */
		rejection.toString = () => 'Rej.' + cls + '(' + msg + ')';
		rejection.exc = exc;
		return rejection;
	};
	reject.httpStatusCode = httpStatusCode;
	reject.matches = (otherCode) => otherCode == httpStatusCode;
	reject.makeExc = makeExc;
	return reject;
};

let isOk = true;

let classes = {
	// non-error responses
	NoContent: toReject(204, isOk),
	ResetContent: toReject(205, isOk),
	PartialContent: toReject(206, isOk),

	// user errors
	BadRequest: toReject(400),
	NotAuthorized: toReject(401),
	Forbidden: toReject(403, isOk),
	NotFound: toReject(404),
	MethodNotAllowed: toReject(405),
	NotAcceptable: toReject(406),
	ProxyAuthenticationRequired: toReject(407),
	RequestTimeout: toReject(408),
	Conflict: toReject(409),
	Gone: toReject(410),
	// unable to process the requested instructions, I'll use it
	// as cannot satisfy in RBS - when GDS returns error and such
	UnprocessableEntity: toReject(422),
	Locked: toReject(423),
	FailedDependency: toReject(424),
	TooEarly: toReject(425),
	TooManyRequests: toReject(429),
	LoginTimeOut: toReject(440),

	// server errors
	InternalServerError: toReject(500),
	NotImplemented: toReject(501),
	BadGateway: toReject(502),
	ServiceUnavailable: toReject(503),
	GatewayTimeout: toReject(504),
	InsufficientStorage: toReject(507),
	NotExtended: toReject(510),
};

module.exports = {
	...classes,
	dict: classes,
	list: Object.values(classes),
	/** @deprecated - please, use from 'Lang.js' */
	nonEmpty: (msg = '(no description)', reject = null) => (value) => {
		reject = reject || classes.NoContent;
		return value ? Promise.resolve(value)
			: reject('Value is empty - ' + msg);
	},
};
