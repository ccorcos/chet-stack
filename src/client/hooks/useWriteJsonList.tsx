import { useWrite } from "./useDatabase"

export function useWriteJsonList(args: { key: string; value: string[]; onNewItem: () => string }) {
	const { key, value, onNewItem } = args

	const write = useWrite()

	const onInsert = () => {
		if (value.length === 0) {
			write({ set: [{ key: key, value: JSON.stringify([onNewItem()]) }] })
		} else {
			write({
				set: [{ key: key, value: JSON.stringify([...value, onNewItem()]) }],
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
