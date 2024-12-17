import React, { useState } from "react"
import { passthroughRef } from "../../helpers/passthroughRef"
import { ContentEditableInput } from "./ContentEditableInput"

export const TextInput = passthroughRef(_TextInput)

function _TextInput(
	props: {
		value: string
		onSubmit: (value: string) => void
	} & React.HTMLProps<HTMLDivElement>
) {
	const { value, onSubmit, ...rest } = props
	const [draft, setDraft] = useState(value)

	const submit = () => {
		if (draft === value) return
		onSubmit(draft)
	}

	return (
		<ContentEditableInput
			{...rest}
			value={draft}
			onChange={(value) => setDraft(value)}
			onBlur={() => {
				submit()
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" && !e.shiftKey) {
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
