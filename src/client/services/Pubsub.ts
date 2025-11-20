export type PubsubApi = {
	subscribe(key: string): void
	unsubscribe(key: string): void
	publish(key: string, value: any): void
	onMessage(listener: (key: string, value: any) => void): () => void
}
