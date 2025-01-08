import { useClientEnvironment } from "../services/ClientEnvironment"
import { useLoader } from "./useLoader"

export function useRemoteGet(key: string) {
	const { api } = useClientEnvironment()
	const loader = useLoader(["okv:", key], async () => {
		const response = await api.get(key)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		return response.body
	})
	const value = loader.suspend()
	return value
}
