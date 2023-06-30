/**
 * Server errors have a status and do not leak sensitive information in the message.
 */
export abstract class ServerError extends Error {
	abstract statusCode: number
}

// These custom errors should never contain sensitive information in the message.
export class ValidationError extends ServerError {
	static statusCode = 400
	statusCode = 400
}

export class TransactionConflictError extends ServerError {
	static statusCode = 409
	statusCode = 409
}

export class BrokenError extends ServerError {
	static statusCode = 500
	statusCode = 500
}
