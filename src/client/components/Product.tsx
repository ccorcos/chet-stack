import React from "react"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { Button } from "./ui/Button"

export function Product() {
	const { router } = useClientEnvironment()

	const handleNavigateLogin = () => router.navigate({ type: "login" })

	return (
		<div style={{ maxWidth: "42em", margin: "4em auto" }}>
			<h1>Cool Product</h1>
			<p>This is a cool new product! Log in or sign up to use it.</p>
			<Button onClick={handleNavigateLogin}>Login / Signup</Button>
		</div>
	)
}
