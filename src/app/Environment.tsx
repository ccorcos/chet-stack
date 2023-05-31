import React, { createContext, useContext } from "react"

export type Environment = {}

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
