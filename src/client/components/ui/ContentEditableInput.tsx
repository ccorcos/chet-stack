import React, { useLayoutEffect, useRef } from "react"
import { mergeRefs } from "../../helpers/mergeRefs"
import { passthroughRef } from "../../helpers/passthroughRef"

export const ContentEditableInput = passthroughRef(_ContentEditableInput)

function _ContentEditableInput(
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
			{...rest}
			ref={mergeRefs([ref, props.ref])}
			contentEditable
			style={{
				whiteSpace: "normal",
				wordBreak: "break-all",
				cursor: "text",
				userSelect: "text",
				WebkitUserModify: "read-write-plaintext-only",
				...style,
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
