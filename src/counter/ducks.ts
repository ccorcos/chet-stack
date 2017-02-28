import { Record } from 'immutable'

export const enum ActionTypes {
  increment,
  decrement,
}

type Increment = {
  type: ActionTypes.increment,
}

type Decrement = {
  type: ActionTypes.decrement,
}

export type Action = Increment | Decrement

export const actions = {
  increment: () : Increment => ({ type: ActionTypes.increment }),
  decrement: () : Decrement => ({ type: ActionTypes.decrement }),
}

const State = Record({
  count: 0,
})

export const initialState = new State()

export const reducer = (state=initialState, action: Action) => {
  switch(action.type) {
    case ActionTypes.increment: {
      return state.update('count', n => n + 1)
    }
    case ActionTypes.decrement: {
      return state.update('count', n => n - 1)
    }
    default: {
      return state
    }
  }
}
