export function* reverse<T>(list: T[]) {
	for (let i = list.length - 1; i >= 0; i--) yield list[i]
}
