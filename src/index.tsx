import React from 'react'
import ReactDOM from 'react-dom'

class Index extends React.PureComponent<{}, {}> {
  render() {
    return (
      <div>
        Hello Chet Corcos
      </div>
    )
  }
}

const root = document.createElement('div')
document.body.appendChild(root)

ReactDOM.render(<Index/>, root)
