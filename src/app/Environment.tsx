import React, { createContext, useContext } from "react"
import { AppState } from "./AppState"

const services = { app: AppState }

// ============================================================================
// Boilerplate
// ============================================================================

export type Environment = {
	[K in keyof typeof services]: InstanceType<typeof services[K]>
}

const EnvironmentContext = createContext<Environment | undefined>(undefined)

export function EnvironmentProvider(props: {
	value: Environment
	children: React.ReactNode
}) {
	return (
		<EnvironmentContext.Provider value={props.value}>
			{props.children}
		</EnvironmentContext.Provider>
	)
}

export function useEnvironment(): Environment {
	const environment = useContext(EnvironmentContext)
	if (!environment) throw new Error("Missing Environment")
	return environment
}
