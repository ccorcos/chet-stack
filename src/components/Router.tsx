import * as React from "react"
import { Router, Route, Switch } from "react-router-dom"
import * as world from "../world"
import App from "./App"

export default () => {
	return (
		<Router history={world.history}>
			<div>
				<Switch>
					<Route exact={true} path="/" component={App} />
					<Route render={() => <div>404</div>} />
				</Switch>
			</div>
		</Router>
	)
}
