import crypto from "node:crypto"

export class BloomFilter {
	buckets: number[] // each number is between 0 and 7 (base 8, octal)

	constructor(
		public numBytes: number,
		public numHashes: number
	) {
		this.buckets = Array(numBytes).fill(0)
	}

	add(item: string) {
		for (let i = 0; i < this.numHashes; i++) {
			const salt = i.toString(16).padStart(4, "0")
			const hash = hashStr(salt + item)
			const index = binaryStrToMod(hash, this.numBytes)
			this.buckets[index] = (this.buckets[index] + 1) % 8
		}
	}

	test(item: string) {
		for (let i = 0; i < this.numHashes; i++) {
			const salt = i.toString(16).padStart(4, "0")
			const hash = hashStr(salt + item)
			const index = binaryStrToMod(hash, this.numBytes)
			if (this.buckets[index] === 0) return false
		}
		return true
	}

	// Returns a string of octal numbers.
	toString() {
		return this.buckets.map((bucket) => bucket.toString(8)).join("")
	}

	// Converts a string of octal numbers to filter buckets.
	fromString(str: string) {
		this.buckets = str.split("").map((char) => parseInt(char, 8))
	}
}

function hashStr(item: string) {
	const hash = crypto.createHash("sha256")
	hash.update(item)
	return hexToBinary(hash.digest("binary"))
}

function hexToBinary(hex: string) {
	return hex
		.split("")
		.map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
		.join("")
}

// This function converts a binary string to a number modulo some value
// It works by processing each bit from left to right:
// - For each bit, multiply previous result by 2 (shift left)
// - Add the current bit (0 or 1)
// - Take modulo to keep numbers manageable
// Example: "1101" with mod 7
// Start: result = 0
// 1: result = (0*2 + 1) % 7 = 1
// 1: result = (1*2 + 1) % 7 = 3
// 0: result = (3*2 + 0) % 7 = 6
// 1: result = (6*2 + 1) % 7 = 6
function binaryStrToMod(binaryStr: string, mod: number): number {
	let result = 0
	for (let i = 0; i < binaryStr.length; i++) {
		// For each bit, multiply previous result by 2 and add current bit
		result = (result * 2 + parseInt(binaryStr[i])) % mod
	}
	return result
}
