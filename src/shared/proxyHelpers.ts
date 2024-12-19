export function proxyObj(fn: (key: any, ...args: any[]) => any): any {
	return new Proxy(
		{},
		{
			get(target, key: any, reciever) {
				return (...args: any[]) => {
					return fn(key, ...args)
				}
			},
		}
	)
}
