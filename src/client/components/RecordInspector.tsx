import React, { useEffect, useRef, useState } from "react"
import { RecordPointer } from "../../shared/schema"
import { useRecord } from "../hooks/useRecord"

function RecordInfo(props: RecordPointer) {
	const record = useRecord(props)
	if (!record) return <div>Record not found.</div>

	return <div style={{ whiteSpace: "pre" }}>{JSON.stringify(record, null, 2)}</div>
}

/** Use this so that you can right-click on a record in the UI to inspect it's value. */
export function useRecordInspector(pointer: RecordPointer) {
	const [open, setOpen] = useState(false)

	const onClick = (event: React.MouseEvent) => {
		if (event.altKey) {
			event.preventDefault()
			event.stopPropagation()
			setOpen(true)
			return false
		}
	}

	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			if (!event.target) return
			if (!ref.current) return
			const clicked = event.target as HTMLElement
			if (!ref.current.contains(clicked)) setOpen(false)
		}

		window.addEventListener("click", handleClick)
		return () => window.removeEventListener("click", handleClick)
	}, [])

	let inspectPane: JSX.Element | undefined
	if (open) {
		const { id, table } = pointer
		inspectPane = (
			<div ref={ref} style={{ position: "fixed", bottom: 20, right: 20 }}>
				<RecordInfo id={id} table={table} />
			</div>
		)
	}

	return { onClick, inspectPane }
}
