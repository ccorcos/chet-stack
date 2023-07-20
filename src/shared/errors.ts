// These custom errors should never contain sensitive information in the message.
export class ValidationError extends Error {
	static statusCode = 400
	statusCode = 400
}

export class TransactionConflictError extends Error {
	static statusCode = 409
	statusCode = 409
}

export class BrokenError extends Error {
	static statusCode = 424
	statusCode = 424
}

export class PermissionError extends Error {
	static statusCode = 403
	statusCode = 403
}
