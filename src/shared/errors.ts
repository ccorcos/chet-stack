// These custom errors should never contain sensitive information in the message.
export class ValidationError extends Error {
	static statusCode = 400
}

export class TransactionConflictError extends Error {
	static statusCode = 409
}

export class BrokenError extends Error {
	static statusCode = 500
}
