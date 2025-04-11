import {
	ArrayEncoding,
	BooleanEncoding,
	Codec,
	Encoding,
	NullEncoding,
	NumberEncoding,
	ObjectEncoding,
	StringEncoding,
} from "lexicodec"

const DateEncoding: Encoding<Date> = {
	match: (value: unknown) =>
		typeof value === "object" && Object.getPrototypeOf(value) === Date.prototype,
	encode: (value) => value.toISOString(),
	decode: (value) => new Date(value),
	compare: (a, b) => (a > b ? 1 : b > a ? -1 : 0),
}

const FunctionEncoding: Encoding<(...args: any[]) => any> = {
	match: (value: unknown) => typeof value === "function",
	encode: (value) => value.toString(),
	decode: (value) => new Function("return " + value)(),
	compare: (a, b, cmp) => cmp(a.toString(), b.toString()),
}

/**
 * It's super convenient to have a codec that is JSON compatible. This avoids the pain
 * of manually serializing over the wire, particularly as it sneaks into not just the
 * records but also arguments like ListArgs.
 * The main trade-off here is that we're using null as a max value which is convenient for
 * prefix queries but not perfect because you have to do things like
 * {lte: [null, null, null, ...]} technically infinite nulls to be mathematically correct.
 */
export const codec = new Codec({
	"?": BooleanEncoding,
	'"': StringEncoding,
	"#": NumberEncoding,
	"[": ArrayEncoding,
	"{": ObjectEncoding,
	// "~": DateEncoding,
	// f: FunctionEncoding,

	// Null is the max value which is convenient for prefix queries.
	"\xff": NullEncoding,
})
