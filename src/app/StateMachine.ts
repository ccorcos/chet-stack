/**
 * Removes the first element from a tuple.
 * TupleRest<[1,2,3> = [2,3]
 */
export type TupleRest<T extends unknown[]> = T extends [any, ...infer U]
	? U
	: never

export type AnyReducers<S> = { [fn: string]: (state: S, ...args: any[]) => S }

/**
 * Defunctionalized action objects {fn: string, args: any[]}
 */
export type Actions<R extends AnyReducers<any>> = {
	[K in keyof R]: { fn: K; args: TupleRest<Parameters<R[K]>> }
}[keyof R]

/**
 * The dispatch proxy object so that "Rename Symbol" works:
 * https://twitter.com/ccorcos/status/1429545833242894339
 */
export type Dispatcher<R extends AnyReducers<any>> = {
	[K in keyof R]: (...args: TupleRest<Parameters<R[K]>>) => void
}

/**
 * An effect plugin is an API for declaratively controlling the outside
 * world through controlling state. For example, React is an effect plugin.
 *
 * function ReactPlugin<S, R extends AnyReducers<S>>(
 * 	  node: any,
 * 	  render: (state: S) => JSX.Element
 *   ) {
 * 	  return function (app: StateMachine<S, R>) {
 * 		  ReactDOM.render(render(app.state), node)
 * 		  return {
 * 			  update: () => ReactDOM.render(render(app.state), node),
 * 			  destroy: () => ReactDOM.unmountComponentAtNode(node),
 *   		}
 *   	}
 * }
 *
 */
export type EffectPlugin<S, R extends AnyReducers<S>> = (
	app: StateMachine<S, R>
) => Effect<S>

export type Effect<S> = {
	update(prevState: S): void
	destroy(): void
}

/**
 * A Redux-like pattern that minimizes boilerplate and maximizes code editor UX.
 */
export class StateMachine<S, R extends AnyReducers<S>> {
	private effects: Effect<S>[]

	constructor(
		public state: S,
		private reducers: R,
		plugins: EffectPlugin<S, R>[] = []
	) {
		// Initialize all effects.
		this.effects = plugins.map((plugin) => plugin(this))
	}

	/**
	 * Effects can dispatch more actions, but we want to make sure that we don't run
	 * the next action until the previous finishes and updates the state. So we queue
	 * up actions but everything still runs synchronously.
	 */
	private actions: Actions<R>[] = []
	private dispatchAction(action: Actions<R>) {
		console.info("dispatch:", action)
		this.actions.push(action)
		if (!this.running) {
			this.running = true
			this.flush()
			this.listeners.forEach((fn) => fn())
		}
	}

	public dispatch = (() => {
		const self = this
		return new Proxy(
			{},
			{
				get(target, fn: any, receiver) {
					return (...args: any[]) => self.dispatchAction({ fn, args } as any)
				},
			}
		)
	})() as Dispatcher<R>

	private running = false
	private flush() {
		if (this.actions.length === 0) {
			this.running = false
			return
		}
		const action = this.actions.shift()!
		const prevState = this.state
		this.state = this.reducers[action.fn](prevState, ...action.args)
		for (const effect of this.effects) {
			effect.update(prevState)
		}
		this.flush()
	}

	public destroy() {
		for (const effect of this.effects) {
			effect.destroy()
		}
	}

	private listeners = new Set<() => void>()

	/**
	 * Listeners are not called on every state/action. They are called after all
	 * actions that are synchronously dispatched are finished processing. Make sure
	 * you use the plugin argument if you want to compare with previous state for an effect.
	 */
	public addListener(listener: () => void) {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}
}
