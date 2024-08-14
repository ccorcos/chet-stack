import * as t from "data-type-ts"
export * from "data-type-ts"

export const uuid = new t.Validator<string>({
	validate: (value) =>
		t.string.validate(value) ||
		!value.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
			? { message: `${JSON.stringify(value)} is not a valid UUID.` }
			: undefined,
	inspect: () => "UUID",
})

export const datetime = new t.Validator<string>({
	validate: (value) =>
		t.string.validate(value) || !value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
			? { message: `${JSON.stringify(value)} is not a valid ISO 8601 datetime string.` }
			: undefined,
	inspect: () => "Datetime",
})
