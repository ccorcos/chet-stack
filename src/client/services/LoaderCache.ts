export class Loader<T> {
	public resolve: (value: T) => void
	public reject: (error: any) => void
	public promise: Promise<T>

	public resolved = false
	public rejected = false

	public value: T
	public error: any

	// Limit is a little gross here, but lets roll with it for now.
	constructor(public limit: number = 0) {
		this.promise = new Promise((resolve, reject) => {
			this.resolve = (value) => {
				if (this.resolved || this.rejected) return
				this.resolved = true
				this.value = value
				resolve(value)
			}
			this.reject = (error) => {
				if (this.resolved || this.rejected) return
				this.rejected = true
				this.error = error
				reject(error)
			}
		})
	}
}

export class LoaderCache extends Map<string, Loader<any>> {}
