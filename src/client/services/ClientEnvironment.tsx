import React, { createContext, useContext } from "react"
import type { ClientConfig } from "./ClientConfig"
import type { LoaderCache } from "./LoaderCache"
import type { RecordCache } from "./RecordCache"
import type { RecordStorage } from "./RecordStorage"
import { Router } from "./Router"
import type { SubscriptionCache } from "./SubscriptionCache"
import type { TransactionQueue } from "./TransactionQueue"
import { UndoRedoStack } from "./UndoRedoStack"
import type { WebsocketPubsubClient } from "./WebsocketPubsubClient"
import type { ClientApi } from "./api"

export type ClientEnvironment = {
	config: ClientConfig

	recordCache: RecordCache
	recordStorage: RecordStorage
	subscriptionCache: SubscriptionCache
	loaderCache: LoaderCache

	api: ClientApi
	pubsub: WebsocketPubsubClient
	transactionQueue: TransactionQueue
	undoRedo: UndoRedoStack

	router: Router
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
