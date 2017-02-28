import React from 'react'
import ReactDOM from 'react-dom'
import Counter from './counter/container'
import { Root } from './core'

class Index extends React.PureComponent<{}, {}> {
  render() {
    return (
      <div>
        Hello Chet Corcos
        <Counter/>
      </div>
    )
  }
}

const root = document.createElement('div')
document.body.appendChild(root)

ReactDOM.render((
  <Root>
    <Index/>
  </Root>
), root)
