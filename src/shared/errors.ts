// Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses

// These custom errors should never contain sensitive information in the message.
// The static statusCode allows the client to check response.status === ValidationError.statusCode.
export class ValidationError extends Error {
	static statusCode = 400
	statusCode = 400
}

export class PermissionError extends Error {
	static statusCode = 403
	statusCode = 403
}

export class NotFoundError extends Error {
	static statusCode = 404
	statusCode = 404
}

export class ConflictError extends Error {
	static statusCode = 409
	statusCode = 409
}

export class BrokenError extends Error {
	static statusCode = 500
	statusCode = 500
}
