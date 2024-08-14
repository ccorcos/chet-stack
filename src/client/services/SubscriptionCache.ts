import { SecondMs } from "../../shared/dateHelpers"
import { sleep } from "../../shared/sleep"

const DelayMs = 10 * SecondMs

/** Reference counting for what records are being listened to. */
export class SubscriptionCache {
	constructor(
		private args: {
			onSubscribe(key: string): void
			onUnsubscribe(key: string): void
		}
	) {}

	private subscriptionCounts = new Map<string, number>()

	private inc(key: string) {
		const subscriptionCount = this.subscriptionCounts.get(key)

		if (subscriptionCount === undefined) {
			this.subscriptionCounts.set(key, 1)
			this.args.onSubscribe(key)
		} else {
			this.subscriptionCounts.set(key, subscriptionCount + 1)
		}
	}

	private dec(key: string) {
		let subscriptionCount = this.subscriptionCounts.get(key)
		if (subscriptionCount === undefined || subscriptionCount <= 0)
			throw new Error("We shouldn't be decrementing right now.")

		if (subscriptionCount === 1) {
			this.subscriptionCounts.delete(key)
			this.args.onUnsubscribe(key)
		} else {
			this.subscriptionCounts.set(key, subscriptionCount - 1)
		}
	}

	// TODO: there's a potential bug where we fetch a record which ends up in the RecordCache, but
	// if we never subscribe to the record in the first place it can stay around forever.
	subscribe(key: string): () => void {
		this.inc(key)
		return async () => {
			await sleep(DelayMs)
			this.dec(key)
		}
	}

	keys() {
		return Array.from(this.subscriptionCounts.keys())
	}
}
