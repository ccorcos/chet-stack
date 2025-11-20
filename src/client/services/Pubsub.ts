export type PubsubApi = {
	subscribe(key: string): void
	unsubscribe(key: string): void
}
