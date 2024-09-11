import React, { useState } from "react"
import { ComboBoxSelect } from "../ComboBox"

const fruits: string[] = [
	"Apple",
	"Banana",
	"Cherry",
	"Date",
	"Elderberry",
	"Fig",
	"Grape",
	"Honeydew",
	"Indian Plum",
	"Jackfruit",
	"Kiwi",
	"Lemon",
	"Mango",
	"Nectarine",
	"Orange",
	"Papaya",
	"Quince",
	"Raspberry",
	"Strawberry",
	"Tangerine",
	"Ugli Fruit",
	"Vitamin C",
	"Watermelon",
	"Xigua",
	"Yellow Passion Fruit",
	"Zucchini",
	"Apricot",
	"Blackberry",
	"Cantaloupe",
	"Dragon Fruit",
	"Eggfruit",
	"Gooseberry",
	"Huckleberry",
	"Jujube",
	"Kumquat",
	"Lychee",
	"Mulberry",
	"Olive",
	"Peach",
	"Pear",
	"Rambutan",
	"Soursop",
	"Tomato",
	"Uva",
	"Vanilla",
	"White Currant",
	"Xoconostle",
	"Yellow Sapote",
	"Zigzag Vine Fruit",
	"Avocado",
]

export function ComboBoxDemo() {
	const [value, setValue] = useState<string | undefined>()
	return (
		<div>
			<ComboBoxSelect
				items={fruits}
				value={value}
				onChange={setValue}
				placeholder="Select fruit..."
			/>
		</div>
	)
}
