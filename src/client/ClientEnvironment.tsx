import React, { createContext, useContext } from "react"
import type { ClientApi } from "./api"
import type { RecordCacheApi } from "./RecordCache"
import type { RecordLoaderApi } from "./RecordLoader"
import type { TransactionQueue } from "./TransactionQueue"

export type ClientEnvironment = {
	cache: RecordCacheApi
	loader: RecordLoaderApi
	api: ClientApi
	transactionQueue: TransactionQueue
}

const ClientEnvironmentContext = createContext<ClientEnvironment | undefined>(undefined)

export function ClientEnvironmentProvider(props: {
	value: ClientEnvironment
	children: React.ReactNode
}) {
	return (
		<ClientEnvironmentContext.Provider value={props.value}>
			{props.children}
		</ClientEnvironmentContext.Provider>
	)
}

export function useClientEnvironment(): ClientEnvironment {
	const clientEnvironment = useContext(ClientEnvironmentContext)
	if (!clientEnvironment) throw new Error("Missing ClientEnvironment")
	return clientEnvironment
}
