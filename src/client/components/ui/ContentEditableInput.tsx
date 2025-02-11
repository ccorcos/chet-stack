import React, { useLayoutEffect, useRef } from "react"
import { mergeRefs } from "../../helpers/mergeRefs"
import { passthroughRef } from "../../helpers/passthroughRef"

export const ContentEditableInput = passthroughRef(_ContentEditableInput)

function _ContentEditableInput(
	props: Omit<React.HTMLProps<HTMLDivElement>, "value" | "onChange"> & {
		value: string
		onChange?: (value: string) => void
		onSubmit?: (value: string) => void
		multiline?: boolean
	}
) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		ref.current.textContent = props.value
		if (props.autoFocus) {
			ref.current.focus()
			// Set selection at the end.
			const range = document.createRange()
			range.selectNodeContents(ref.current)
			range.collapse(false)
			const selection = window.getSelection()
			selection?.removeAllRanges()
			selection?.addRange(range)
		}
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
				// This gets called on every keystroke, but this is not a controlled input.
				onChange?.(e.currentTarget.textContent || "")
			}}
			onKeyDown={(e) => {
				props.onKeyDown?.(e)
				if (!props.multiline && e.key === "Enter" && !e.shiftKey) {
					const elm = e.target as HTMLDivElement
					e.preventDefault()
					elm.blur()
				} else if (e.key === "Escape") {
					const elm = e.target as HTMLDivElement
					e.preventDefault()
					elm.blur()
				}
			}}
			onBlur={(e) => {
				props.onBlur?.(e)
				const value = e.currentTarget.textContent || ""
				if (props.value === value) return
				props.onSubmit?.(value)
			}}
			suppressContentEditableWarning={true}
		></div>
	)
}
