import React from "react"
import ReactDOM from "react-dom"
import { AppState, newGame } from "./AppState"
import { App } from "./components/App"
import { Environment, EnvironmentProvider } from "./Environment"
import "./index.css"

// Build the environment.
let initialGame = newGame()
try {
	initialGame = JSON.parse(localStorage.getItem("state")!)
} catch (error) {}

const app = new AppState(initialGame)
app.addListener(() => {
	localStorage.setItem("state", JSON.stringify(app.state))
})

const environment: Environment = { app }

// Render the app.
const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(
	<EnvironmentProvider value={environment}>
		<App />
	</EnvironmentProvider>,
	root
)

// For debugging from the Console.
;(window as any)["environment"] = environment
Object.assign(window as any, environment)
