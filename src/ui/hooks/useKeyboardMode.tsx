import { useEffect } from "react"
import { useDeepState } from "./useDeepState"

export function useKeyboardMode() {
	const [isKeyboardMode, setIsKeyboardMode] = useDeepState(false)

	// Set keyboard mode to true on keyboard interaction and false on mouse movement
	useEffect(() => {
		const handleKeyDown = () => setIsKeyboardMode(true)
		const handleMouseMove = () => setIsKeyboardMode(false)

		// Add event listeners
		document.addEventListener("keydown", handleKeyDown)
		document.addEventListener("mousemove", handleMouseMove)

		// Clean up event listeners on unmount
		return () => {
			document.removeEventListener("keydown", handleKeyDown)
			document.removeEventListener("mousemove", handleMouseMove)
		}
	}, [])

	return isKeyboardMode
}
