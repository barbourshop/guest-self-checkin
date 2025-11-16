export type SearchRequestPayload = {
	query: {
		type: 'phone' | 'email' | 'lot';
		value: string;
		fuzzy?: boolean;
	};
	includeMembershipMeta?: boolean;
};

export type SearchResult = {
	customerHash: string;
	displayName: string;
	membership: {
		type: string;
		segmentId: string;
		lastVerifiedAt: string;
		verifiedVia?: 'segment' | 'order' | 'segment_and_order' | 'none';
		membershipPurchaseDate?: string | null;
	};
	contact: {
		email?: string;
		phone?: string;
		lotNumber?: string;
	};
};

export type PassValidationPayload = {
	token: string;
	deviceId?: string;
};

export type OrderLineItem = {
	uid?: string;
	catalogObjectId?: string;
	name?: string;
	variationName?: string;
	quantity?: string;
	basePriceMoney?: { amount?: number; currency?: string };
	totalMoney?: { amount?: number; currency?: string };
};

export type OrderDetails = {
	id: string;
	locationId: string;
	state?: string;
	createdAt?: string;
	lineItems: OrderLineItem[];
	totalMoney?: { amount?: number; currency?: string };
};

export type PassValidationResponse = {
	status: string;
	order: OrderDetails;
};

