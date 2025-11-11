import { useEffect, useState } from "react"
import { useClientEnvironment } from "../services/ClientEnvironment"

export function useRouterState() {
	const { router } = useClientEnvironment()
	const [state, setState] = useState(router.state)
	useEffect(() => {
		return router.addListener(setState)
	}, [])
	return state
}
