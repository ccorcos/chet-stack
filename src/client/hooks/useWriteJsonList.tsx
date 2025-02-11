import { useWrite } from "./useDatabase"

export function useWriteJsonList(key: string, value: string[]) {
	const write = useWrite()

	const onInsert = () => {
		if (value.length === 0) {
			write({ set: [{ key: key, value: JSON.stringify([0]) }] })
		} else {
			const last = Math.max(...value.map((i) => parseInt(i))) || 0
			write({
				set: [{ key: key, value: JSON.stringify([...value, (last + 1).toString()]) }],
			})
		}
	}

	const onReorder = ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
		const newList = value.slice()
		newList.splice(toIndex, 0, newList.splice(fromIndex, 1)[0])
		write({ set: [{ key: key, value: JSON.stringify(newList) }] })
	}

	const onDelete = (items: Set<string>) => {
		write({
			set: [
				{
					key: key,
					value: JSON.stringify(value.filter((item) => !items.has(item))),
				},
			],
		})
	}

	return { onInsert, onReorder, onDelete }
}
