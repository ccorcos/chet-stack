import React from "react"
import { passthroughRef } from "../helpers/passthroughRef"

function _Input(props: JSX.IntrinsicElements["input"]) {
	return (
		<input
			{...props}
			style={{
				border: "1px solid gray",
				padding: "0.2em 0.4em",
				borderRadius: "0.2em",
				...props.style,
			}}
		/>
	)
}

export const Input = passthroughRef(_Input)
