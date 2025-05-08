import React from "react"
import { passthroughRef } from "../../helpers/passthroughRef"

export const vPadding = 4
export const hPadding = 8

function _Button(props: JSX.IntrinsicElements["button"]) {
	return (
		<button
			{...props}
			className={["feedback", props.className].filter(Boolean).join(" ")}
			style={{
				cursor: "pointer",
				border: "1px solid var(--bg2)",
				padding: `${vPadding}px ${hPadding}px`,
				borderRadius: 4,
				...props.style,
			}}
		/>
	)
}

export const Button = passthroughRef(_Button)

export const PrimaryButton = passthroughRef((props: JSX.IntrinsicElements["button"]) => {
	return _Button({
		...props,
		className: "primary",
	})
})

export const NakedButton = passthroughRef((props: JSX.IntrinsicElements["button"]) => {
	return _Button({
		...props,
		className: "naked",
		style: { borderColor: "transparent", ...props.style },
	})
})
