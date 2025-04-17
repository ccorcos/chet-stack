export function reifyFn(fn: string) {
	return new Function("return " + fn)()
}
