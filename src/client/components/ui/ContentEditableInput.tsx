import { DOMParser, Schema } from "prosemirror-model"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import React, { useEffect, useRef } from "react"
import { passthroughRef } from "../../helpers/passthroughRef"

// Create a schema that only allows plain text
const plainTextSchema = new Schema({
	nodes: {
		doc: {
			content: "text*",
		},
		text: {
			group: "inline",
		},
	},
})

export const ContentEditableInput = passthroughRef(_ContentEditableInput)

function _ContentEditableInput(
	props: Omit<React.HTMLProps<HTMLDivElement>, "value" | "onChange"> & {
		value: string
		onChange?: (value: string) => void
		onSubmit?: (value: string) => void
		multiline?: boolean
	}
) {
	const editorRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<EditorView | null>(null)

	useEffect(() => {
		if (!editorRef.current) return

		// Create initial state
		const state = EditorState.create({
			schema: plainTextSchema,
			doc: DOMParser.fromSchema(plainTextSchema).parse(document.createElement("div")),
			plugins: [],
		})

		// Create view
		const view = new EditorView(
			{ mount: editorRef.current },
			{
				state,
				dispatchTransaction(transaction) {
					const newState = view.state.apply(transaction)
					view.updateState(newState)

					// Get plain text content
					const content = newState.doc.textContent
					props.onChange?.(content)
				},
				handleKeyDown: (view, event) => {
					if (!props.multiline && event.key === "Enter" && !event.shiftKey) {
						event.preventDefault()
						view.dom.blur()
						return true
					}
					if (event.key === "Escape") {
						event.preventDefault()
						view.dom.blur()
						return true
					}
					return false
				},
				handleDOMEvents: {
					blur: () => {
						const content = view.state.doc.textContent
						if (props.value === content) return
						props.onSubmit?.(content)
						return false
					},
				},
			}
		)

		viewRef.current = view

		// Set initial content
		const tr = view.state.tr.insertText(props.value)
		view.dispatch(tr)

		return () => {
			view.destroy()
		}
	}, [])

	// Update content when value prop changes
	useEffect(() => {
		if (!viewRef.current) return
		const view = viewRef.current
		const currentContent = view.state.doc.textContent
		if (currentContent !== props.value) {
			const tr = view.state.tr.replaceWith(
				0,
				view.state.doc.content.size,
				plainTextSchema.text(props.value)
			)
			view.dispatch(tr)
		}
	}, [props.value])

	const { value, onChange, style, ...rest } = props

	return (
		<div
			{...rest}
			ref={editorRef}
			style={{
				whiteSpace: "normal",
				wordBreak: "break-all",
				cursor: "text",
				userSelect: "text",
				...style,
			}}
		/>
	)
}
