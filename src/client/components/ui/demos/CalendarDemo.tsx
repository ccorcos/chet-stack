import React, { useMemo, useState } from "react"

// TODO: this is very much a work in progress!
export function CalendarDemo() {
	const initialDatetime = useMemo(() => {
		const tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate() + 1)
		tomorrow.setHours(9, 0, 0, 0)

		const tzOffset = tomorrow.getTimezoneOffset() * 60000
		const localISOTime = new Date(tomorrow.getTime() - tzOffset)
		return localISOTime.toISOString().slice(0, "YYYY-MM-DDTHH:MM".length)
	}, [])

	const [datetime, setDatetime] = useState(initialDatetime)

	return (
		<div>
			<input
				type="datetime-local"
				value={datetime}
				onChange={(event) => setDatetime(event.target.value)}
			/>
		</div>
	)
}
