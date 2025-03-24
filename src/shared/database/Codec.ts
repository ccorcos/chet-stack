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
import { ListArgs } from "./types"

export { MAX, MIN }

const DateEncoding: Encoding<Date> = {
	match: (value: unknown) =>
		typeof value === "object" && Object.getPrototypeOf(value) === Date.prototype,
	encode: (value) => value.toISOString(),
	decode: (value) => new Date(value),
	compare: (a, b) => (a > b ? 1 : b > a ? -1 : 0),
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
	"\xff": MaxEncoding,
})

export function prefixScan(prefix: any[]): ListArgs<any> {
	return {
		gt: [...prefix, MIN],
		lt: [...prefix, MAX],
	}
}
