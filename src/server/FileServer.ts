import { Express, Request, Response } from "express"
import { createWriteStream, mkdirp, mkdirpSync } from "fs-extra"
import { DayS } from "../shared/dateHelpers"
import { FileSignatureData } from "./helpers/fileHelpers"
import { path } from "./helpers/path"
import { verifySignature } from "./helpers/signatureHelpers"
import { ServerConfig } from "./services/ServerConfig"

function verifyRequest(
	environment: { config: ServerConfig },
	req: Request<{ id: string; filename: string }>,
	res: Response
) {
	const id = req.params.id
	const filename = req.params.filename

	if (typeof req.query.expiration !== "string") {
		res.status(400).send("Missing expiration param.")
		return false
	}

	const expirationMs = parseInt(req.query.expiration)
	const now = Date.now()
	if (expirationMs < now) {
		res.status(400).send("Expired.")
		return false
	}

	const signature = req.query.signature
	if (typeof signature !== "string") {
		res.status(400).send("Missing signature param.")
		return false
	}

	const method = req.method.toLowerCase().trim() as "get" | "put"
	const data: FileSignatureData = { method, id, filename, expirationMs }

	const secretKey = environment.config.signatureSecret
	const validSignature = verifySignature({ data, signature, secretKey })

	if (!validSignature) {
		res.status(400).send("Invalid signature.")
		return false
	}

	return true
}

export function FileServer(environment: { config: ServerConfig }, app: Express) {
	const uploadDir = path("uploads")
	mkdirpSync(uploadDir)

	const MB = 1024 * 1024

	app.put(
		`/uploads/:id/:filename`,
		// express.raw({ limit: 100 * MB, type: "*/*" }),
		async (req, res) => {
			if (!verifyRequest(environment, req, res)) return

			const { id, filename } = req.params
			const fileDir = path.join(uploadDir, id)
			const filePath = path.join(fileDir, filename)
			await mkdirp(fileDir)

			const writeStream = createWriteStream(filePath)
			req.pipe(writeStream)

			writeStream.on("finish", () => {
				res.status(200).send("File uploaded.")
			})

			writeStream.on("error", (error) => {
				console.error(error)
				res.status(500).send("File upload failed.")
			})
		}
	)

	app.get(`/uploads/:id/:filename`, async (req, res) => {
		if (!verifyRequest(environment, req, res)) return

		const { id, filename } = req.params
		const fileDir = path.join(uploadDir, id)
		const filePath = path.join(fileDir, filename)

		const expiration = 60 * DayS
		// Private means it will be cached by the client but not the CDN.
		// Not sure this works though with signature params...
		res.setHeader("Cache-Control", `private, max-age=${expiration}`)
		res.sendFile(filePath)
	})
}

// getUploadUrl
// getFileUrl
