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
	static statusCode = 500
	statusCode = 500
}

export class PermissionError extends Error {
	static statusCode = 403
	statusCode = 403
}

/**
 * Among other things, this error is useful for typing switch statements
 * to ensure that every case is handled.
 *
 * @example
 * ```ts
 * let color: "RED" | "BLUE";
 *
 * switch (color) {
 *   case "RED": {
 *     return;
 *   }
 *   case "BLUE": {
 *     return;
 *   }
 *   default: {
 *     // a type error will be thrown if every case isn't handled
 *     throw new UnreachableCaseError(color);
 *   }
 * }
 * ```
 */
export class UnreachableCaseError extends Error {
	constructor(public value: never, public msg?: string) {
		super(msg || `Unexpected value: ${value}`)
	}
}
