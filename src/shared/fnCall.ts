export type ToFnCall<T extends { [key: string]: (...args: any) => any }> = {
	[K in keyof T]: [K, ...Parameters<T[K]>]
}[keyof T]

export function FnCallProxy<T extends { [key: string]: (...args: any) => any }>(): {
	[K in keyof T]: (...parameters: Parameters<T[K]>) => [K, ...Parameters<T[K]>]
} {
	return new Proxy(
		{},
		{
			get(target, prop: string) {
				return (...args: any[]) => [prop, ...args]
			},
		}
	) as any
}
