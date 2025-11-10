import { withStyle } from "client/helpers/withStyle"
import React from "react"
import { hPadding, vPadding } from "./Button"

// TODO: lets use css here with colors.
// Also dark mode force.

export function Input(props: JSX.IntrinsicElements["input"]) {
	return (
		<input
			{...props}
			className={["feedback", props.className].filter(Boolean).join(" ")}
			style={{
				// Keep a border so its the same size as Button
				border: "1px solid transparent",
				padding: `${vPadding}px ${hPadding}px`,
				borderRadius: 4,
				fontFamily: "inherit",
				cursor: props.disabled ? "not-allowed" : "auto",
				...props.style,
			}}
		/>
	)
}

// export const NakedInput = passthroughRef((props: JSX.IntrinsicElements["input"]) => {
// 	return _Input({
// 		...props,
// 		style: {
// 			borderColor: "transparent",
// 			...props.style,
// 		},
// 	})
// })

export const NakedInput = withStyle(Input, {
	borderColor: "transparent",
	backgroundColor: "transparent",
})
