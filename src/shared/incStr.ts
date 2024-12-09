/**
 * Returns the lexicographically next string after the input.
 * For example:
 * - incStr("") returns "\xff"
 * - incStr("a") returns "b"
 * - incStr("hello") returns "hellp"
 * This is useful for range queries where you want everything with a given prefix.
 */
export function incStr(str: string): string {
	if (str.length === 0) return "\xff"
	const last = str[str.length - 1]
	const prefix = str.slice(0, -1)
	return prefix + String.fromCharCode(last.charCodeAt(0) + 1)
}
