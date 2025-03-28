import {
	ArrayEncoding,
	BooleanEncoding,
	Codec,
	Encoding,
	MAX,
	MIN,
	MaxEncoding,
	MinEncoding,
	NullEncoding,
	NumberEncoding,
	ObjectEncoding,
	StringEncoding,
} from "lexicodec"

export { MAX, MIN }

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

export const codec = new Codec({
	"\x00": MinEncoding,
	_: NullEncoding,
	"?": BooleanEncoding,
	'"': StringEncoding,
	"#": NumberEncoding,
	"[": ArrayEncoding,
	"{": ObjectEncoding,
	"~": DateEncoding,
	// f: FunctionEncoding,
	"\xff": MaxEncoding,
})
