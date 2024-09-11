export type ClientConfig = {
	host: string
}

// This variable get compiled into the bundle in build.ts
declare const __CLIENT_CONFIG__: ClientConfig
export const clientConfig = __CLIENT_CONFIG__

window["__config"] = clientConfig
