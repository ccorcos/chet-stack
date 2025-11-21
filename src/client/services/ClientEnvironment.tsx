import { ClientApi } from "api/client"
import React, { createContext, useContext } from "react"
import type { ApiType } from "server/api"
import { JSONValue, OkvCache, Tuple } from "tupledb/types"
import type { Router } from "ui/services/Router"
import type { ClientConfig } from "./ClientConfig"
import { CommandService } from "./Command"
import { LocalPreferences } from "./LocalPreferences"

export type PubsubApi = {
	subscribe(key: string): void
	unsubscribe(key: string): void
	publish(key: string, value: any): void
	onMessage(listener: (key: string, value: any) => void): () => void
}

export type Api = ClientApi<ApiType>

export type ClientEnvironment = {
	config: ClientConfig
	router: Router
	api: Api
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
