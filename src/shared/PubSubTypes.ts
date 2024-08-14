export type ClientPubsubMessage =
	| { type: "subscribe"; key: string }
	| { type: "unsubscribe"; key: string }

export type ServerPubsubMessage = { type: "update"; key: string; value: any }
