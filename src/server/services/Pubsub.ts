export type PubsubApi = {
	publish(items: { key: string; value: any }[]): Promise<void>
}
