function nextElement(element: Element): Element | undefined {
	// Start by looking for the first child.
	if (element.firstElementChild) {
		return element.firstElementChild
	}

	return nextNonChildElement(element)
}

function nextNonChildElement(element: Element): Element | undefined {
	// If no children, look for next sibling.
	let currentElement: Element | undefined = element
	while (currentElement) {
		if (currentElement.nextElementSibling) {
			return currentElement.nextElementSibling
		}

		// If no next sibling, move up to the parent and look for its next sibling.
		currentElement = currentElement.parentElement || undefined
	}
}

/** Does not yield container or start elements. */
export function* iterateNextElement(args: { container: Element; start: Element; wrap: boolean }) {
	const { container, start, wrap } = args

	let cursor: Element | undefined = start
	while ((cursor = nextElement(cursor))) {
		// Break if we escape the container.
		if (cursor === container || !container.contains(cursor)) break
		yield cursor
	}

	if (wrap) {
		// Start over from the beginning
		if (start === container) return
		cursor = container
		while ((cursor = nextElement(cursor))) {
			if (cursor === start) break
			yield cursor
		}
	}
}

function prevElement(element: Element): Element | undefined {
	// If element has a previous sibling, find its last descendant.
	let prevSibling = element.previousElementSibling
	if (prevSibling) {
		return lastChildElement(prevSibling) || prevSibling
	}

	// If no previous sibling, return the parent.
	return element.parentElement || undefined
}

function lastChildElement(element: Element): Element | undefined {
	let lastChild = element.lastElementChild || undefined
	if (!lastChild) return
	while (lastChild.lastElementChild) {
		lastChild = lastChild.lastElementChild || undefined
	}
	return lastChild
}

/** Does not yield container or start elements. */
export function* iteratePrevElement(args: { container: Element; start: Element; wrap: boolean }) {
	const { container, start, wrap } = args

	let cursor: Element | undefined = start
	while ((cursor = prevElement(cursor))) {
		// Break if we escape the container.
		if (cursor === container || !container.contains(cursor)) break
		yield cursor
	}

	if (wrap || start === container) {
		// Start over from the end

		const last = lastChildElement(container)
		if (!last) return
		if (last === start) return
		yield last

		cursor = last
		while ((cursor = prevElement(cursor))) {
			if (cursor === start) break
			yield cursor
		}
	}
}

function getContainerFocus(container: Element) {
	if (!document.activeElement) return container
	if (container.contains(document.activeElement)) return document.activeElement
	return container
}

export function nextFocusable(container: Element) {
	const start = getContainerFocus(container)
	for (const element of iterateNextElement({ container, start, wrap: false })) {
		if (isFocusable(element)) return element as HTMLElement
	}
}

export function prevFocusable(container: Element) {
	const start = getContainerFocus(container)
	for (const element of iteratePrevElement({ container, start, wrap: false })) {
		if (isFocusable(element)) return element as HTMLElement
	}
}

export function isFocusable(element: Element) {
	if (element.hasAttribute("tabindex")) return true
	const tagName = element.tagName.toLowerCase()
	if (tagName === "input") return true
	if (tagName === "button") return true
}

/*


How to properly manage browser focus and keyboard events.

- set tabindex=0 if you want something to be focusable AND tabbable.
- set tabindex=-1 if you want something to be focusable and NOT tabbable, e.g. arrowing around a list box.
- element.focus() is slow and triggers a reflow!
	- hover and focus must be different, otherwise you'll kill your performance.
- listen to keyboard events on the element. leverage browser focus for events to bubble up so you don't have conflicting shortcuts.

*/
