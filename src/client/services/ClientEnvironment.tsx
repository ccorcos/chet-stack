import React, { createContext, useContext } from "react"
import { JSONValue, OkvCache, Tuple } from "tupledb/types"
import type { Router } from "ui/services/Router"
import type { ClientApi } from "./api"
import type { ClientConfig } from "./ClientConfig"
import { CommandService } from "./Command"
import { LocalPreferences } from "./LocalPreferences"
import { PubsubApi } from "./Pubsub"

export type ClientEnvironment = {
	config: ClientConfig
	router: Router
	api: ClientApi
	pubsub: PubsubApi
	prefs: LocalPreferences
	cache: OkvCache<Tuple, JSONValue>
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
