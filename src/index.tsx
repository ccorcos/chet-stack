import * as React from "react"
import * as ReactDOM from "react-dom"
import { css } from "glamor"
import Router from "./components/Router"

css.global("a", {
	color: "inherit",
	textDecoration: "none",
})

const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(<Router />, root)
