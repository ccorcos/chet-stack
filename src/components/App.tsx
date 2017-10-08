import * as React from "react"
import Component from "reactive-magic/component"
import * as leaves from "file-loader!../static/leaves.jpg"
import * as world from "../world"

export default class App extends Component<{}> {
	view() {
		const { x } = world.mouse.get()
		return (
			<div>
				<h1>Hello World</h1>
				<img width={x} src={leaves} />
			</div>
		)
	}
}
