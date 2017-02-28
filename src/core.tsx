import { applyMiddleware, createStore, compose } from 'redux'
import thunk from 'redux-thunk'
import { Provider } from 'react-redux'
import { combineReducers } from 'redux-immutable'
import reducer from './reducer'

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(reducer, composeEnhancers(applyMiddleware(thunk)), initialState)


// import app from './app/reducer'
// import cube from './cube/reducer'
//
// export const rootRedcer = combineReducers({
//   app,
//   cube,
// })

// export const Root = props =>
//   <Provider store={store}>
//     {props.children}
//   </Provider>
