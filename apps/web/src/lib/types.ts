export type SearchRequestPayload = {
	query: {
		type: 'phone' | 'email' | 'lot' | 'name';
		value: string;
		fuzzy?: boolean;
	};
	includeMembershipMeta?: boolean;
};

export type SearchResult = {
	customerHash?: string;
	customerId?: string;
	displayName: string;
	membership: {
		type: string;
		segmentIds?: string[];
		segmentNames?: string[];
		lastVerifiedAt: string;
		verifiedVia?: 'segment' | 'none';
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
	accessVerified?: boolean;
};

export type PassValidationResponse = {
	status: string;
	order: OrderDetails;
	customerId?: string; // Customer ID from order, used to look up customer details
};

export type CustomerOrder = {
	id: string;
	createdAt?: string;
	state?: string;
	lineItems: Array<{
		uid?: string;
		catalogObjectId?: string;
		catalogObjectVariantId?: string;
		name?: string;
		variationName?: string;
		quantity?: string;
		grossSalesMoney?: { amount?: number; currency?: string };
		totalMoney?: { amount?: number; currency?: string };
	}>;
	totalMoney?: { amount?: number; currency?: string };
};

export type CustomerOrdersResponse = {
	orders: CustomerOrder[];
};

