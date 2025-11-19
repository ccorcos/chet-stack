// Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses

// These custom errors should never contain sensitive information in the message.
export class ValidationError extends Error {
	statusCode = 400
}

export class PermissionError extends Error {
	statusCode = 403
}

export class NotFoundError extends Error {
	statusCode = 404
}

export class TransactionConflictError extends Error {
	statusCode = 409
}

/** The request failed due to failure of a previous request. */
export class FailedDependencyError extends Error {
	statusCode = 424
}
