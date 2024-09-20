import React from "react"
import { passthroughRef } from "../../helpers/passthroughRef"

function _Input(props: JSX.IntrinsicElements["input"]) {
	return (
		<input
			{...props}
			className={["feedback", props.className].filter(Boolean).join(" ")}
			style={{
				borderWidth: 1,
				borderStyle: "solid",
				borderRadius: "0.2em",
				borderColor: props.disabled ? "var(--gray4)" : "var(--black)",
				padding: "0.2em 0.4em",
				...props.style,
			}}
		/>
	)
}

export const Input = passthroughRef(_Input)

export const NakedInput = passthroughRef((props: JSX.IntrinsicElements["input"]) => {
	return _Input({
		...props,
		style: {
			borderColor: "transparent",
			...props.style,
		},
	})
})
