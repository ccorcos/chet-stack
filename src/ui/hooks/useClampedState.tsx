import { clamp } from "lodash-es"
import { useTransformedState } from "./useTransformedState"

export function useClampedState(initialValue: number, range: [number, number]) {
	return useTransformedState(initialValue, (value) => clamp(value, ...range))
}
