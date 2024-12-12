import vcf from "vcf"

export type vCard = ReturnType<typeof vcf.parse>[number]

export function parseVCards(str: string): vCard[] {
	const vcards = vcf.parse(str)
	return vcards
}

export function mergeVCards(cards: vCard[]) {}

export function simplifyVCard(str: string) {
	const card = vcf.parse(str)[0].toJSON()[1]
	const names = card.filter((x) => x[0] === "fn").map((x) => x[3] as string)
	const orgs = card.filter((x) => x[0] === "org").map((x) => x[3].slice(0, -1) as string)
	const emails = card.filter((x) => x[0] === "email").map((x) => x[3] as string)
	const phones = card.filter((x) => x[0] === "tel").map((x) => x[3].toString().replace(/\D/g, ""))

	return { name: names[0], org: orgs[0], emails, phones }
}
