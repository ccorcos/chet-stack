export class ValidationError extends Error {
	statusCode: 400
}

export class TransactionConflictError extends Error {
	statusCode: 409
}
