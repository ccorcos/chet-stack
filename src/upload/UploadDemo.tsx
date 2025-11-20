import { formatResponseError } from "client/services/api"
import { useClientEnvironment } from "client/services/ClientEnvironment"
import React from "react"
import {
	FileUploadDropZone,
	uploadFile,
	UploadPreview,
	useFileUpload,
} from "ui/components/FileUpload"

export function useUpload() {
	const { api } = useClientEnvironment()
	const { uploads, handleDrop } = useFileUpload(async (uploads) => {
		const response = await api.getUploadUrls({
			files: uploads.map((upload) => ({ id: upload.id, filename: upload.file.name })),
		})
		if (response.status !== 200) {
			const message = formatResponseError(response)
			for (const upload of uploads) upload.setState({ error: message })
			return
		}

		// First step complete.
		const initialStep = 10
		for (const upload of uploads) upload.setState({ progress: initialStep })

		const scaleProgress = (progress: number) => progress * (100 - initialStep) + initialStep

		const urls = response.body.urls
		await Promise.all(
			uploads.map(async (upload) => {
				const uploadUrl = urls[upload.id]
				if (!uploadUrl) {
					upload.setState({ error: `Missing upload url for ${upload.id}` })
					return
				}
				try {
					// Make things slower for demo purposes
					await uploadFile(upload.file, uploadUrl, (progress) =>
						upload.setState({ progress: scaleProgress(progress) })
					)
					upload.setState({ uploaded: true })
				} catch (error) {
					upload.setState({ error: error.message })
				}
			})
		)
	})
	return { uploads, handleDrop }
}

export function UploadDemo() {
	const { uploads, handleDrop } = useUpload()

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
