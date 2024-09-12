import React from "react"
import { passthroughRef } from "../../helpers/passthroughRef"

function _Button(props: JSX.IntrinsicElements["button"]) {
	return (
		<button
			{...props}
			className={["feedback", props.className].filter(Boolean).join(" ")}
			style={{
				cursor: "pointer",
				border: "1px solid var(--gray)",
				padding: "0.2em 0.4em",
				borderRadius: "0.2em",
				...props.style,
			}}
		/>
	)
}

export const Button = passthroughRef(_Button)

export const PrimaryButton = passthroughRef((props: JSX.IntrinsicElements["button"]) => {
	return (
		<Button
			{...props}
			style={{ background: "var(--blue)", color: "var(--white)", ...props.style }}
		></Button>
	)
})

export const NakedButton = passthroughRef((props: JSX.IntrinsicElements["button"]) => {
	return <Button {...props} style={{ borderColor: "transparent", ...props.style }}></Button>
})
