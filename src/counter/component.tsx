import React from 'react'
import { ActionCreators, Model } from './ducks'

type Props = {state: Model} & ActionCreators

export default class Counter extends React.PureComponent<Props, {}> {
  render() {
    return (
      <div>
        <button onClick={this.props.decrement}>{'-'}</button>
        <span>{this.props.state.get('count')}</span>
        <button onClick={this.props.increment}>{'+'}</button>
      </div>
    )
  }
}
