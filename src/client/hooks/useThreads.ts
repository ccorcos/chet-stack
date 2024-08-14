import { useCallback, useEffect, useSyncExternalStore } from "react"
import { toSubscriptionKey } from "../../shared/PubSubKeys"
import { loadThreads } from "../loaders/loadThreads"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useRerender } from "./useRerender"

export const GET_THREADS_LIMIT = 5
export const GET_THREADS_STEP = 5

export function useThreads(userId: string, limit: number) {
	const environment = useClientEnvironment()
	const { subscriptionCache, recordCache } = environment

	const loader = loadThreads(environment, { userId, limit })

	// Suspend on initial load only.
	if (!loader.resolved && limit === GET_THREADS_LIMIT) throw loader.promise

	// Subscribe to updates.
	useEffect(
		() => subscriptionCache.subscribe(toSubscriptionKey({ type: "getThreads", userId })),
		[]
	)

	// Query the in-memory cache.
	const subscribe = useCallback(
		(update: () => void) => {
			return recordCache.subscribeThreads(userId, update)
		},
		[userId]
	)

	// Repeated calls to getSnapshot must return the same reference, otherwise infinite loop.
	const getSnapshot = useCallback(() => {
		return recordCache.getThreads(userId)
	}, [userId])

	const cached = useSyncExternalStore(subscribe, getSnapshot)

	// Filter down threads to display only the limited number.
	const allThreads = cached?.threadIds || []

	// While fetching the next batch, we want to maintain the previous limit.
	const currentLimit = loader.resolved ? limit : limit - GET_THREADS_STEP

	// We overfetch 1 item so we know if there's more to load.
	const result = {
		threadIds: allThreads.slice(0, currentLimit),
		nextId: allThreads[currentLimit],
	}

	// When the loader resolves, its possible that it doesn't update the cache to
	// cause a re-render so we're going to force that to happen.
	const rerender = useRerender()
	useEffect(() => {
		if (loader.resolved) return
		let canceled = false
		loader.promise.then(() => {
			if (canceled) return
			rerender()
		})
		return () => {
			canceled = true
		}
	}, [loader])

	return {
		...result,
		loadingMore: !loader.resolved,
	}
}
