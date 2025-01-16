import React, { useState } from "react"
import { passthroughRef } from "../../helpers/passthroughRef"
import { useRefCurrent } from "../../hooks/useRefCurrent"
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

	const draftRef = useRefCurrent(draft)
	const valueRef = useRefCurrent(value)

	const submit = () => {
		if (draftRef.current === valueRef.current) return
		onSubmit(draftRef.current)
	}

	// Submit if we unrender as well as kind of blur.
	// useEffect(
	// 	() => () => {
	// 		submit()
	// 	},
	// 	[]
	// )

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
