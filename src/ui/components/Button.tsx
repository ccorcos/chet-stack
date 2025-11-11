import React from "react"

export const vPadding = 4
export const hPadding = 8

export function Button(props: React.JSX.IntrinsicElements["button"]) {
	return (
		<button
			{...props}
			className={["feedback", props.className].filter(Boolean).join(" ")}
			tabIndex={0}
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

export function PrimaryButton(props: React.JSX.IntrinsicElements["button"]) {
	return <Button {...props} className="primary" />
}

export function NakedButton(props: React.JSX.IntrinsicElements["button"]) {
	return (
		<Button {...props} className="naked" style={{ borderColor: "transparent", ...props.style }} />
	)
}
