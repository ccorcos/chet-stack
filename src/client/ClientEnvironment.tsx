import React, { createContext, useContext } from "react"
import type { ClientApi } from "./api"
import { ClientConfig } from "./ClientConfig"
import { OfflineStorage } from "./OfflineStorage"
import type { RecordCacheApi } from "./RecordCache"
import type { RecordLoaderApi } from "./RecordLoader"
import type { TransactionQueue } from "./TransactionQueue"
import { WebsocketPubsubClient } from "./WebsocketPubsubClient"

export type ClientEnvironment = {
	cache: RecordCacheApi
	loader: RecordLoaderApi
	api: ClientApi
	transactionQueue: TransactionQueue
	config: ClientConfig
	subscriber: WebsocketPubsubClient
	storage: OfflineStorage
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
