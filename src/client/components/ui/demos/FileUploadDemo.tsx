import React from "react"
import { sleep } from "../../../../shared/sleep"
import { FileUploadDropZone, UploadPreview, useFileUpload } from "../FileUpload"

export function FileUploadDemo() {
	const { uploads, handleDrop } = useFileUpload(async (upload, onProgress) => {
		for (let i = 0; i < 100; i += Math.round(Math.random() * 10)) {
			await sleep(100)
			onProgress(i)
		}
	})

	return (
		<FileUploadDropZone
			onDrop={handleDrop}
			style={{ display: "inline-flex", flexWrap: "wrap", gap: 12, padding: 12 }}
		>
			{uploads.length === 0 && "Drop files here!"}
			{uploads.map((upload) => (
				<UploadPreview key={upload.id} {...upload} />
			))}
		</FileUploadDropZone>
	)
}
