import React from 'react'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import { update, init, Model } from './ducks'

// const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
// const store = createStore(reducer, composeEnhancers(applyMiddleware(thunk)), initialState)

export const store = createStore<Model>(update, init)

export const Root = (props: React.HTMLProps<HTMLDivElement>) =>
  <Provider store={store}>
    {props.children}
  </Provider>
