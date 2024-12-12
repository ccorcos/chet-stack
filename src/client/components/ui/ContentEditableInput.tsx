import React, { useLayoutEffect, useRef } from "react"

export function ContentEditableInput(
	props: {
		value: string
		onChange: (value: string) => void
	} & React.HTMLProps<HTMLDivElement>
) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		ref.current.textContent = props.value
	}, [])

	const { value, onChange, style, ...rest } = props

	return (
		<div
			ref={ref}
			{...rest}
			contentEditable
			style={{
				...style,
				// whiteSpace: "pre-wrap",
				whiteSpace: "normal",
				wordBreak: "break-all",
				cursor: "text",
				userSelect: "text",
				WebkitUserModify: "read-write-plaintext-only",
			}}
			onPaste={(e) => {
				e.preventDefault()
				const text = e.clipboardData.getData("text/plain")
				document.execCommand("insertText", false, text)
			}}
			onInput={(e) => {
				onChange(e.currentTarget.textContent || "")
			}}
			suppressContentEditableWarning={true}
		></div>
	)
}
