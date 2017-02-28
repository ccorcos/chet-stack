import { Record } from 'immutable'

export const enum ActionTypes { increment, decrement }

type Increment = { type: ActionTypes.increment }
type Decrement = { type: ActionTypes.decrement }

export type Action = Increment | Decrement

export const actions = {
  increment: () : Increment => ({ type: ActionTypes.increment }),
  decrement: () : Decrement => ({ type: ActionTypes.decrement }),
}

export type ActionCreators = typeof actions

const StateRecord = Record({ count: 0 })
export const init = new StateRecord()
export type Model = typeof init

export const update = (state: Model, action: Action) => {
  switch(action.type) {
    case ActionTypes.increment: {
      return state.update('count', n => n + 1)
    }
    case ActionTypes.decrement: {
      return state.update('count', n => n - 1)
    }
    // redux init action hits this path even though the type system doesnt
    // catch it. unsound type systems are bonkers
    default: {
      return state
    }
  }
}
