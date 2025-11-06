import React from "react"
import { Input } from "../components/Input"

// Label above input
// Label left of input

function Form(props: {
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
	children?: React.ReactNode
}) {
	return (
		<form
			style={{
				display: "flex",
				flexDirection: "column",
			}}
			onSubmit={(e) => {
				e.preventDefault()
				props.onSubmit?.(e)
			}}
		>
			{props.children}
		</form>
	)
}

export function FormsDemo() {
	return (
		<div>
			<div>FormsDemo</div>

			<Form>
				<h4>This is a form</h4>
				<p>This is just a description.</p>

				<div>Name:</div>
				<Input placeholder="John Doe" />

				<div>Email</div>
				<Input type="email" placeholder="joe@acme.com" />
			</Form>
		</div>
	)
}
