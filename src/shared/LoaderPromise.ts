export class LoaderPromise<T = any> {
	public promise: Promise<T>
	public resolved = false
	public value?: T
	public rejected = false
	public error?: any

	constructor(promise: Promise<T>) {
		this.promise = promise
			.then((value) => {
				this.resolved = true
				this.value = value
				return value
			})
			.catch((error) => {
				this.rejected = true
				this.error = error
				throw error
			})
	}

	suspend() {
		if (this.rejected) throw this.error!
		if (this.resolved) return this.value as T
		throw this.promise
	}
}
