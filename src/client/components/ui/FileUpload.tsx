import React, { useState } from "react"
import { DeferredPromise } from "../../../shared/DeferredPromise"
import { randomId } from "../../../shared/randomId"
import { passthroughRef } from "../../helpers/passthroughRef"
import { useAsync } from "../../hooks/useAsync"

type Upload = {
	id: string
	file: File
	progress: number
	error?: string
	uploaded?: boolean
}

export function useFileUpload(
	handleUpload: (
		upload: { id: string; file: File },
		onProgress: (progress: number) => void
	) => Promise<void>
) {
	const [uploads, setUploads] = useState<Upload[]>([])

	const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		const fileData = Array.from(e.dataTransfer.files) as File[]

		const uploads: Upload[] = fileData.map((file) => {
			return { id: randomId(), file, progress: 0 }
		})

		setUploads((ups) => [...ups, ...uploads])

		for (const upload of uploads) {
			const update = (obj: Partial<Upload>) =>
				setUploads((ups) => ups.map((up) => (up.id === upload.id ? { ...up, ...obj } : up)))

			handleUpload(upload, (progress) => update({ progress }))
				.catch((error) => update({ error: error.toString() }))
				.then(() => update({ uploaded: true }))
		}
	}

	const reset = () => setUploads([])

	return { handleDrop, uploads, reset }
}

export function UploadPreview(props: Upload) {
	const { file, progress, error, uploaded, id } = props
	const preview = useAsync(renderPreview, [file])

	return (
		<div
			style={{
				height: 120,
				width: 120,
				alignItems: "end",
				padding: 4,
				display: "flex",

				...(preview && {
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundImage: `url(${preview})`,
				}),
			}}
		>
			<div style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", fontSize: "0.6em" }}>
				{file.name}
			</div>
			<div>{uploaded ? "✅" : error ? "❌" : `${progress}%`}</div>
		</div>
	)
}

export const FileUploadDropZone = passthroughRef(
	(
		props: JSX.IntrinsicElements["div"] & {
			selected?: boolean
		}
	) => {
		const [isDragging, setIsDragging] = useState(false)

		const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()
			setIsDragging(true)
		}

		const handleDragExit = (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()
			setIsDragging(false)
		}

		const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()
		}

		const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
			setIsDragging(false)
			props.onDrop?.(e)
		}

		return (
			<div
				{...props}
				onDragEnter={handleDragEnter}
				onDragExit={handleDragExit}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				style={{
					border: isDragging ? "3px dashed var(--blue)" : "3px solid transparent",
					...props.style,
				}}
			/>
		)
	}
)

async function uploadFile(file: File, url: string, onProgress: (progress: number) => void) {
	const xhr = new XMLHttpRequest()
	xhr.open("PUT", url, true)

	// Update progress
	xhr.upload.addEventListener("progress", (event) => {
		if (!event.lengthComputable) return
		const progress = Math.round((event.loaded / event.total) * 100)
		onProgress(progress)
	})

	const deferred = new DeferredPromise<void>()

	// Handle errors
	xhr.onerror = (error) => {
		deferred.reject(error)
	}

	xhr.onreadystatechange = () => {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				deferred.resolve()
			} else {
				const error = new Error(`UploadError: ${xhr.status} ${xhr.statusText}`)
				deferred.reject(error)
			}
		}
	}

	xhr.send(file)

	return deferred.promise
}

const MB = 1024 * 1024

async function renderPreview(file: File) {
	const deferred = new DeferredPromise<string | undefined>()

	if (file.type.startsWith("image/") && file.size <= 10 * MB) {
		const reader = new FileReader()
		reader.onload = (e) => {
			const preview = e.target?.result as string
			deferred.resolve(preview)
		}
		reader.readAsDataURL(file)
	} else {
		deferred.resolve(undefined)
	}

	return deferred.promise
}
