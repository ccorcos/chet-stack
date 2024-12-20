import React, { useEffect, useRef, useState } from "react"
import { passthroughRef } from "../../helpers/passthroughRef"
import { ContentEditableInput } from "./ContentEditableInput"

export const TextInput = passthroughRef(_TextInput)

function _TextInput(
	props: {
		value: string
		multiline?: boolean
		onSubmit: (value: string) => void
	} & React.HTMLProps<HTMLDivElement>
) {
	const { value, onSubmit, multiline, ...rest } = props
	const [draft, setDraft] = useState(value)

	const submit = () => {
		if (draft === value) return
		onSubmit(draft)
	}

	// Submit if we unrender as well as kind of blur.
	const submitRef = useRef(submit)
	submitRef.current = submit
	useEffect(
		() => () => {
			submitRef.current()
		},
		[]
	)

	return (
		<ContentEditableInput
			{...rest}
			value={draft}
			onChange={(value) => setDraft(value)}
			onBlur={() => {
				submit()
			}}
			onKeyDown={(e) => {
				rest.onKeyDown?.(e)
				if (!multiline && e.key === "Enter" && !e.shiftKey) {
					const elm = e.target as HTMLDivElement
					e.preventDefault()
					elm.blur()
				} else if (e.key === "Escape") {
					const elm = e.target as HTMLDivElement
					e.preventDefault()
					elm.blur()
				}
			}}
		/>
	)
}
