import React from "react"
import { passthroughRef } from "../../helpers/passthroughRef"
import { useKeyboardArrowFocus } from "../../hooks/useKeyboardArrowFocus"
import { useMergeCallbacks } from "../../hooks/useMergeCallbacks"
import { useSelectableList } from "../../hooks/useSelectableList"

export function useListBox<T>(args: {
	list: T[]
	selected: T[]
	setSelected: (key: T[]) => void
	multiselect?: boolean
}) {
	const { onKeyDown: onKeyDown1 } = useKeyboardArrowFocus()
	const { onClick, onKeyDown: onKeyDown2 } = useSelectableList(args)
	const onKeyDown = useMergeCallbacks(onKeyDown1, onKeyDown2)
	return { onClick, onKeyDown }
}

export const ListBox = passthroughRef((props: JSX.IntrinsicElements["div"]) => {
	return (
		<div {...props} role="listbox" tabIndex={0}>
			{props.children}
		</div>
	)
})

export const ListItem = passthroughRef(
	(props: JSX.IntrinsicElements["div"] & { item: any; selected: boolean }) => {
		return (
			<div
				{...props}
				data-selectable
				ref={(node: any) => {
					if (node) node._selectable = props.item
				}}
				role="listitem"
				tabIndex={-1}
				style={{
					userSelect: "none",
					cursor: "pointer",
					background: props.selected ? "var(--accent0)" : "",
					// color: props.selected ? "var(--white0)" : "",
					...props.style,
				}}
			>
				{props.children}
			</div>
		)
	}
)
