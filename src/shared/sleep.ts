export function sleep(timeMs: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, timeMs))
}
