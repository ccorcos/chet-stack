import React, { Suspense } from "react"
import { RecordPointer } from "../../shared/schema"
import { useRecord } from "../hooks/useRecord"

export function RetainRecord(props: RecordPointer) {
	return (
		<Suspense>
			<RetainRecordInner {...props} />
		</Suspense>
	)
}

function RetainRecordInner(props: RecordPointer) {
	useRecord(props)
	return <></>
}
