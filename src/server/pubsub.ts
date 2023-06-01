export type PubSubApi = {
	publish(values: { key: string; value: number }[]): Promise<void>
}