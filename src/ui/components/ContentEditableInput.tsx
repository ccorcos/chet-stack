import { passthroughRef } from "client/helpers/passthroughRef"
import { useRefCurrent } from "client/hooks/useRefCurrent"
import { Schema } from "prosemirror-model"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import React, { useEffect, useLayoutEffect, useRef } from "react"

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

type NodeJSON = {
	type: string
	text?: string
	content?: Array<NodeJSON>
}

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

	const textStateRef = useRef<string>(props.value)
	const propsRef = useRefCurrent(props)

	useEffect(() => {
		if (!editorRef.current) return

		const initialDoc: NodeJSON = {
			type: "doc",
			content: props.value.length ? [{ type: "text", text: props.value }] : [],
		}

		// Create initial state
		const state = EditorState.create({
			schema: plainTextSchema,
			doc: plainTextSchema.nodeFromJSON(initialDoc),
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
					if (content === textStateRef.current) return

					propsRef.current.onChange?.(content)
					textStateRef.current = content
				},
				handleKeyDown: (view, event) => {
					if (!propsRef.current.multiline && event.key === "Enter" && !event.shiftKey) {
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
						if (propsRef.current.value === content) return
						propsRef.current.onSubmit?.(content)
						return false
					},
				},
			}
		)

		viewRef.current = view

		return () => {
			view.destroy()
		}
	}, [])

	// Update content when value prop changes
	useLayoutEffect(() => {
		if (!viewRef.current) return
		if (textStateRef.current === props.value) return
		textStateRef.current = props.value

		const view = viewRef.current
		const tr = view.state.tr.replaceWith(
			0,
			view.state.doc.content.size,
			props.value.length ? plainTextSchema.text(props.value) : []
		)
		view.dispatch(tr)
	}, [props.value])

	const { value, onChange, style, ...rest } = props

	return (
		<div
			{...rest}
			ref={editorRef}
			style={{
				whiteSpace: "pre-wrap",
				wordBreak: "break-all",
				cursor: "text",
				userSelect: "text",
				...style,
			}}
		/>
	)
}
