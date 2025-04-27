export type Simplify<T> = { [K in keyof T]: T[K] }

export type Assert<A extends B, B> = {}

export function unreachable(arg: never) {
	throw new Error("Unreachable: " + JSON.stringify(arg))
}
