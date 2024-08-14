export type Simplify<T> = { [K in keyof T]: T[K] }

export type Assert<A extends B, B> = {}
