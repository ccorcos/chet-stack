import { createHmac } from "crypto"
import secureCompare from "secure-compare"

type Data = { [key: string]: string | number }

export function createSignature(args: { data: string | Data; secretKey: Buffer }) {
	const { data, secretKey } = args
	const str = typeof data === "string" ? data : serialize(data)
	const hmac = createHmac("sha512", secretKey)
	hmac.update(str)
	return hmac.digest("base64")
}

export function verifySignature(args: {
	data: string | Data
	signature: string
	secretKey: Buffer
}): boolean {
	const { data, signature, secretKey } = args
	const validSiganture = createSignature({ data, secretKey })
	return secureCompare(validSiganture, signature)
}

function serialize(data: Data) {
	return JSON.stringify(
		Object.keys(data)
			.sort()
			.map((key) => [key, data[key]])
	)
}
