import { chunk } from "lodash"
import md5 from "md5"
import { v4 as uuid } from "uuid"

/**
 * When you pass a seed string, then the uuid will be deterministic.
 */
export function randomId(seed?: string) {
	if (!seed) return uuid()

	const hash = md5(seed)
	const hexBytes = chunk(hash, 2).map((pair) => pair.join(""))
	const random = hexBytes.map((hex) => parseInt(hex, 16))
	return uuid({ random })
}
