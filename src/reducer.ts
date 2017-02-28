import { combineReducers } from 'redux-immutable'
import { reducer as counter } from './counter/ducks'

export default combineReducers({
  counter,
})
