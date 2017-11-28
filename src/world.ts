import { Value } from "reactive-magic"

export const mouse = new Value({ x: 0, y: 0 })

window.addEventListener("mousemove", event => {
	mouse.set({
		x: event.clientX,
		y: event.clientY,
	})
})
