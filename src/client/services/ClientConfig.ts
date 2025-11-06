export type ClientConfig = {
	production: boolean
}

export const clientConfig = { production: import.meta.env.mode === "production" }

window["__config"] = clientConfig
