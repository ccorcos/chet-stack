export class DeferredPromise<T> {
	public resolve!: (value: T) => void
	public reject!: (error: any) => void
	public promise: Promise<T>

	constructor() {
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve
			this.reject = reject
		})
	}
}
