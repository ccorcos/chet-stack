import React from "react"
import { getCurrentUserId } from "../helpers/getCurrentUserId"
import { App } from "./App"
import { Product } from "./Product"

export function Root() {
	const userId = getCurrentUserId()
	if (userId) return <App userId={userId} />
	else return <Product />
}
