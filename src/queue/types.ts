export type TaskError = {
	name: string
	message: string
	stack: string
}

export type Task = {
	id: string
	name: string
	args: any
	/** ISO date string */
	runAt: string
	startedAt?: string
	error?: TaskError
}

export type TaskHandler<E> = (environment: E, args: any) => Promise<any>

export type TaskHandlers<E> = { [name: string]: TaskHandler<E> }
