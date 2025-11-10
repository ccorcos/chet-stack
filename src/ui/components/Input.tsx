import React from "react"
import { hPadding, vPadding } from "./Button"

// TODO: lets use css here with colors.
// Also dark mode force.

export const Input = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
	return (
		<input
			{...props}
			ref={ref}
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
})

export const NakedInput = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
	return (
		<input
			{...props}
			ref={ref}
			style={{ borderColor: "transparent", backgroundColor: "transparent", ...props.style }}
		/>
	)
})
