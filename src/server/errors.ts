// These custom errors should never contain sensitive information in the message.
export class ValidationError extends Error {
	statusCode = 400
}

export class TransactionConflictError extends Error {
	statusCode = 409
}

export class BrokenError extends Error {
	statusCode = 500
}
