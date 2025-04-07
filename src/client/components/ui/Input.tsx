import React from "react"
import { passthroughRef } from "../../helpers/passthroughRef"
import { withStyle } from "../../helpers/withStyle"

// TODO: lets use css here with colors.
// Also dark mode force.

function _Input(props: JSX.IntrinsicElements["input"]) {
	return (
		<input
			{...props}
			className={["feedback", props.className].filter(Boolean).join(" ")}
			style={{
				// borderWidth: 1,
				// borderStyle: "solid",

				border: "none",
				borderRadius: "0.2em",
				padding: "0.2em 0.4em",
				fontFamily: "inherit",
				cursor: props.disabled ? "not-allowed" : "auto",
				...props.style,
			}}
		/>
	)
}

export const Input = passthroughRef(_Input)

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
