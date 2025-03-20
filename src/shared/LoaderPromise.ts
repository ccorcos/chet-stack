export class LoaderPromise<T = any> {
	public promise: Promise<T>
	public resolved = false
	public value?: T
	public rejected = false
	public error?: any

	constructor(promise: Promise<T> | T) {
		if (promise instanceof Promise) {
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
		} else {
			this.resolved = true
			this.value = promise
			this.promise = Promise.resolve(promise)
		}
	}

	suspend() {
		if (this.rejected) throw this.error!
		if (this.resolved) return this.value as T
		throw this.promise
	}

	map<U>(fn: (value: T) => U) {
		if (this.resolved) {
			return new LoaderPromise(fn(this.value as T))
		}
		return new LoaderPromise(this.promise.then(fn))
	}
}
