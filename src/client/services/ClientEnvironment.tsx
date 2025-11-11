import React, { createContext, useContext } from "react"
import { BaseOKVCache, JSONValue, Tuple } from "tupledb/types"
import type { Router } from "../../ui/Router"
import type { ClientApi } from "./api"
import type { ClientConfig } from "./ClientConfig"
import { CommandService } from "./Command"
import { LocalPreferences } from "./LocalPreferences"
import type { WebsocketPubsubClient } from "./WebsocketPubsubClient"

export type ClientEnvironment = {
	config: ClientConfig
	router: Router
	api: ClientApi
	pubsub: WebsocketPubsubClient
	prefs: LocalPreferences
	cache: BaseOKVCache<Tuple, JSONValue>
	cmd: CommandService
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
