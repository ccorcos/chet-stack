export function mergeEvents<T extends Event | React.UIEvent>(
	...args: ((event: T) => boolean | undefined | void)[]
) {
	return (event: T) => {
		for (const fn of args) {
			if (fn(event) === false) break
		}
	}
}
