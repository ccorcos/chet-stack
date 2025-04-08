import React, { createContext, useContext } from "react"
import { Cache } from "../../shared/database/Cache"
import { JSONValue, Tuple } from "../../shared/database/types"
import type { ClientConfig } from "./ClientConfig"
import { LocalPreferences } from "./LocalPreferences"
import { Router } from "./Router"
import type { WebsocketPubsubClient } from "./WebsocketPubsubClient"
import type { ClientApi } from "./api"

export type ClientEnvironment = {
	config: ClientConfig
	router: Router
	api: ClientApi
	pubsub: WebsocketPubsubClient
	prefs: LocalPreferences
	cache: Cache<Tuple, JSONValue>
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
