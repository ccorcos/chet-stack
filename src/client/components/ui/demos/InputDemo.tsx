import React, { useState } from "react"
import { ComboBoxSelect } from "../ComboBox"
import { Input, NakedInput } from "../Input"
import { MultiSelectInput, SelectInput } from "../MultiSelectInput"

export function InputDemo() {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "auto auto",
				width: "fit-content",
				gap: 8,
				padding: 12,
			}}
		>
			<div>Text Input</div>
			<Input type="text" placeholder="Hello" />
			<div>Disabled Input</div>
			<Input type="text" placeholder="Hello" disabled />
			<div>Number Input</div>
			<Input type="number" placeholder="123" />
			<div>Date Input</div>
			<Input type="date" placeholder="2024-01-01" />
			<div>Naked Input</div>
			<NakedInput type="text" placeholder="Hello" />
			<div>Slider Input</div>
			<Input type="range" min="0" max="100" defaultValue="50" />
			<div>ComboBox</div>
			<ComboBoxDemo />
			<div>SelectInput</div>
			<SelectInputDemo />
			<div>MultiSelectInput</div>
			<MultiSelectInputDemo />
		</div>
	)
}

function MultiSelectInputDemo() {
	const [value, setValue] = useState<string[]>([])
	return <MultiSelectInput items={fruits} value={value} onChange={setValue} />
}

function SelectInputDemo() {
	const [value, setValue] = useState<string | undefined>()
	return <SelectInput items={fruits} value={value} onChange={setValue} />
}

function ComboBoxDemo() {
	const [value, setValue] = useState<string | undefined>()
	return (
		<ComboBoxSelect
			items={fruits}
			value={value}
			onChange={setValue}
			placeholder="Select fruit..."
		/>
	)
}

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
