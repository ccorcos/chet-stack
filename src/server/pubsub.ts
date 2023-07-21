export type PubSubApi = {
	publish(values: { key: string; value: number | string }[]): Promise<void>
}
