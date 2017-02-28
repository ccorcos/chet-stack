import { Record } from 'immutable'
import * as Counter from './counter/ducks'

export type Action = Counter.Action

const StateRecord = Record({
  counter: Counter.init,
})
export const init = new StateRecord()
export type Model = typeof init

export const update = (state: Model, action: Action) => {
  return state.withMutations(s =>
    s.update('counter', c => Counter.update(c, action))
  )
}
