import { sum } from "lodash-es"

export function getScrollableAncestors(element: Element) {
	const scrollableAncestors: Array<Element> = []
	let ancestor = element.parentElement
	while (ancestor) {
		const style = window.getComputedStyle(ancestor)
		if (style.overflowY === "auto" || style.overflowY === "scroll") {
			scrollableAncestors.push(ancestor)
		}
		if (ancestor === document.body) {
			scrollableAncestors.push(ancestor)
			break
		}
		ancestor = ancestor.parentElement
	}
	return scrollableAncestors
}

export function getScrollTop(element: Element) {
	if (element === document.body) {
		return window.scrollY
	} else {
		return element.scrollTop
	}
}

export function getTotalScrollTop(element: Element) {
	const ancestors = getScrollableAncestors(element)
	const scrollTop = sum(ancestors.map(getScrollTop))
	return scrollTop
}

export function listenToTotalScrollTop(
	element: Element,
	callback: (totalScrollTop: number) => void
) {
	const ancestors = getScrollableAncestors(element)
	const onScroll = () => callback(sum(ancestors.map(getScrollTop)))

	for (const ancestor of ancestors) {
		ancestor.addEventListener("scroll", onScroll)
	}

	return () => {
		for (const ancestor of ancestors) {
			ancestor.removeEventListener("scroll", onScroll)
		}
	}
}

export function scrollIntoView(element: Element) {
	const ancestors = getScrollableAncestors(element)
	const scroller = ancestors[0]
	if (!scroller) {
		console.warn("No parent scroller, can't scroll into view.")
		return
	}
	const elementRect = element.getBoundingClientRect()
	const scrollerRect = scroller.getBoundingClientRect()

	if (elementRect.top < scrollerRect.top) {
		scroller.scrollBy({
			top: elementRect.top - scrollerRect.top,
			behavior: "auto",
		})
	} else if (elementRect.bottom > scrollerRect.bottom) {
		scroller.scrollBy({
			top: elementRect.bottom - scrollerRect.bottom,
			behavior: "auto",
		})
	}
}
