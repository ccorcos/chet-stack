import React from 'react'
import { connect, bindActionCreators } from 'react-redux'
import { actions, initialState, Action } from './ducks'

type Dispatch = (a: Action) => void
const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators(actions, dispatch)

const mapStateToProps = state => state.get('counter')

type Props = { state: typeof initialState } & typeof actions

class Counter extends React.PureComponent<Props, {}> {
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

