import { useCallback, useEffect, useSyncExternalStore } from "react"
import { toSubscriptionKey } from "../../shared/PubSubKeys"
import { loadMessages } from "../loaders/loadMessages"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useRerender } from "./useRerender"

export const GET_MESSAGES_LIMIT = 5
export const GET_MESSAGES_STEP = 5

export function useMessages(threadId: string, limit: number) {
	const environment = useClientEnvironment()
	const { subscriptionCache, recordCache } = environment

	const loader = loadMessages(environment, { threadId, limit })

	// Suspend on initial load only.
	if (!loader.resolved && limit === GET_MESSAGES_LIMIT) throw loader.promise

	// Subscribe to updates.
	useEffect(
		() => subscriptionCache.subscribe(toSubscriptionKey({ type: "getMessages", threadId })),
		[]
	)

	// Query the in-memory cache.
	const subscribe = useCallback(
		(update: () => void) => {
			return recordCache.subscribeMessages(threadId, update)
		},
		[threadId]
	)

	// Repeated calls to getSnapshot must return the same reference, otherwise infinite loop.
	const getSnapshot = useCallback(() => {
		return recordCache.getMessages(threadId)
	}, [threadId])

	const cached = useSyncExternalStore(subscribe, getSnapshot)

	// Filter down messages to display only the limited number.
	const allMessages = cached?.messageIds || []

	// While fetching the next batch, we want to maintain the previous limit.
	const currentLimit = loader.resolved ? limit : limit - GET_MESSAGES_STEP

	// We overfetch 1 item so we know if there's more to load.
	const result = {
		messageIds: allMessages.slice(0, currentLimit),
		nextId: allMessages[currentLimit],
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
