# API Contract Documentation

This document defines the standardized data contract between the frontend (SvelteKit app) and backend (Express.js API). All API endpoints follow consistent data formats to ensure compatibility between mock and real Square API data.

## Data Transformation

All Square API data (which uses `snake_case` field names) is transformed to frontend format (which uses `camelCase` field names) through transformation utilities in `src/server/utils/squareDataTransformers.js`.

### Transformation Rules

1. **Field Names**: All `snake_case` fields are converted to `camelCase`
   - `given_name` → `displayName` (computed from `given_name + family_name`)
   - `email_address` → `contact.email`
   - `phone_number` → `contact.phone`
   - `reference_id` → `contact.lotNumber`
   - `line_items` → `lineItems`
   - `catalog_object_id` → `catalogObjectId`
   - `created_at` → `createdAt`
   - `location_id` → `locationId`

2. **Nested Objects**: Square's flat structure is transformed to nested objects where appropriate
   - Contact info is grouped into `contact: { email, phone, lotNumber }`
   - Membership info is grouped into `membership: { type, segmentId, lastVerifiedAt, verifiedVia, membershipPurchaseDate? }`

3. **Computed Fields**: Some fields are computed from Square data
   - `displayName` = `given_name + ' ' + family_name`
   - `customerHash` = MD5 hash of customer identifying data
   - `verifiedVia` = determined from membership check method

## Endpoints

### POST /api/customers/search

**Request Body** (`SearchRequestPayload`):
```typescript
{
  query: {
    type: 'phone' | 'email' | 'lot';
    value: string;
    fuzzy?: boolean;
  };
  includeMembershipMeta?: boolean;
}
```

**Response** (`{ results: SearchResult[] }`):
```typescript
{
  results: [
    {
      customerHash?: string;
      customerId?: string;
      displayName: string;
      membership: {
        type: string; // "Member" | "Non-Member"
        segmentId: string;
        lastVerifiedAt: string; // ISO timestamp
        verifiedVia?: 'segment' | 'order' | 'segment_and_order' | 'none';
        membershipPurchaseDate?: string | null; // ISO timestamp (if includeMembershipMeta=true)
      };
      contact: {
        email?: string;
        phone?: string;
        lotNumber?: string;
      };
    }
  ]
}
```

**Example Request**:
```json
{
  "query": {
    "type": "phone",
    "value": "+15551234567",
    "fuzzy": false
  },
  "includeMembershipMeta": true
}
```

**Example Response**:
```json
{
  "results": [
    {
      "customerHash": "a1b2c3d4e5f6",
      "customerId": "CUSTOMER_MEMBER_1",
      "displayName": "John Doe",
      "membership": {
        "type": "Member",
        "segmentId": "gv2:TVR6JXEM4N5XQ2XV51GBKFDN74",
        "lastVerifiedAt": "2024-01-15T10:30:00.000Z",
        "verifiedVia": "segment_and_order"
      },
      "contact": {
        "email": "john.doe@example.com",
        "phone": "+15551234567",
        "lotNumber": "LOT123"
      }
    }
  ]
}
```

### POST /api/passes/validate

**Request Body** (`PassValidationPayload`):
```typescript
{
  token: string; // Order ID
  deviceId?: string;
}
```

**Response** (`PassValidationResponse`):
```typescript
{
  status: 'valid' | 'invalid';
  order: OrderDetails | null;
}
```

**OrderDetails**:
```typescript
{
  id: string;
  locationId: string;
  state?: string;
  createdAt?: string; // ISO timestamp
  lineItems: OrderLineItem[];
  totalMoney?: {
    amount: number; // Amount in cents
    currency: string;
  };
  accessVerified?: boolean;
}
```

**OrderLineItem**:
```typescript
{
  uid?: string;
  catalogObjectId?: string;
  name?: string;
  variationName?: string;
  quantity?: string;
  basePriceMoney?: {
    amount: number;
    currency: string;
  };
  totalMoney?: {
    amount: number;
    currency: string;
  };
}
```

**Example Request**:
```json
{
  "token": "ORDER_MEMBERSHIP_MEMBER_3"
}
```

**Example Response**:
```json
{
  "status": "valid",
  "order": {
    "id": "ORDER_MEMBERSHIP_MEMBER_3",
    "locationId": "LOCATION_1",
    "state": "COMPLETED",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "lineItems": [
      {
        "uid": "line_item_membership_3",
        "catalogObjectId": "MEMBERSHIP_CATALOG_ITEM_ID",
        "name": "Membership",
        "variationName": "Annual Membership",
        "quantity": "1",
        "basePriceMoney": {
          "amount": 50000,
          "currency": "USD"
        },
        "totalMoney": {
          "amount": 50000,
          "currency": "USD"
        }
      }
    ],
    "totalMoney": {
      "amount": 50000,
      "currency": "USD"
    },
    "accessVerified": true
  }
}
```

### GET /api/customers/:customerId/orders

**Query Parameters**:
- `catalogItemId` (optional): Filter orders by catalog item ID

**Response** (`CustomerOrdersResponse`):
```typescript
{
  orders: CustomerOrder[];
}
```

**CustomerOrder**:
```typescript
{
  id: string;
  createdAt?: string; // ISO timestamp
  state?: string;
  lineItems: Array<{
    uid?: string;
    catalogObjectId?: string;
    catalogObjectVariantId?: string;
    name?: string;
    variationName?: string;
    quantity?: string;
    grossSalesMoney?: {
      amount: number;
      currency: string;
    };
    totalMoney?: {
      amount: number;
      currency: string;
    };
  }>;
  totalMoney?: {
    amount: number;
    currency: string;
  };
}
```

**Example Request**:
```
GET /api/customers/CUSTOMER_MEMBER_3/orders?catalogItemId=MEMBERSHIP_CATALOG_ITEM_ID
```

**Example Response**:
```json
{
  "orders": [
    {
      "id": "ORDER_MEMBERSHIP_MEMBER_3",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "state": "COMPLETED",
      "lineItems": [
        {
          "uid": "line_item_membership_3",
          "catalogObjectId": "MEMBERSHIP_CATALOG_ITEM_ID",
          "catalogObjectVariantId": "MEMBERSHIP_VARIANT_ID",
          "name": "Membership",
          "variationName": "Annual Membership",
          "quantity": "1",
          "grossSalesMoney": {
            "amount": 50000,
            "currency": "USD"
          },
          "totalMoney": {
            "amount": 50000,
            "currency": "USD"
          }
        }
      ],
      "totalMoney": {
        "amount": 50000,
        "currency": "USD"
      }
    }
  ]
}
```

## Square API Field Mappings

### Customer Fields

| Square API (snake_case) | Frontend (camelCase) | Notes |
|------------------------|---------------------|-------|
| `id` | `customerId` | Direct mapping |
| `given_name` | `displayName` (computed) | Combined with `family_name` |
| `family_name` | `displayName` (computed) | Combined with `given_name` |
| `email_address` | `contact.email` | Nested in `contact` object |
| `phone_number` | `contact.phone` | Nested in `contact` object |
| `reference_id` | `contact.lotNumber` | Nested in `contact` object |
| `segment_ids` | `membership.segmentId` | First segment ID or configured segment |

### Order Fields

| Square API (snake_case) | Frontend (camelCase) | Notes |
|------------------------|---------------------|-------|
| `id` | `id` | Direct mapping |
| `location_id` | `locationId` | Direct mapping |
| `created_at` | `createdAt` | Direct mapping |
| `state` | `state` | Direct mapping |
| `line_items` | `lineItems` | Array, each item transformed |
| `total_money` | `totalMoney` | Direct mapping (object) |

### Order Line Item Fields

| Square API (snake_case) | Frontend (camelCase) | Notes |
|------------------------|---------------------|-------|
| `uid` | `uid` | Direct mapping |
| `catalog_object_id` | `catalogObjectId` | Direct mapping |
| `catalog_object_variant_id` | `catalogObjectVariantId` | For CustomerOrder only |
| `name` | `name` | Direct mapping |
| `variation_name` | `variationName` | Direct mapping |
| `quantity` | `quantity` | Direct mapping |
| `base_price_money` | `basePriceMoney` | For OrderDetails |
| `gross_sales_money` | `grossSalesMoney` | For CustomerOrder |
| `total_money` | `totalMoney` | Direct mapping (object) |

## Mock Service Structure

The mock service (`src/server/services/mockSquareService.js`) returns data in the exact same structure as the real Square API (using `snake_case`). This ensures:

1. Transformation utilities work identically for both mock and real data
2. Tests accurately reflect production behavior
3. Easy switching between mock and real API for development/testing

### Mock Service Example

```javascript
// Mock service returns Square API format
{
  id: 'CUSTOMER_MEMBER_1',
  given_name: 'John',
  family_name: 'Doe',
  email_address: 'john.doe@example.com',
  phone_number: '+15551234567',
  reference_id: 'LOT123',
  segment_ids: ['MEMBERSHIP_SEGMENT_ID']
}

// Transformation utility converts to frontend format
{
  customerId: 'CUSTOMER_MEMBER_1',
  displayName: 'John Doe',
  contact: {
    email: 'john.doe@example.com',
    phone: '+15551234567',
    lotNumber: 'LOT123'
  },
  membership: {
    type: 'Member',
    segmentId: 'MEMBERSHIP_SEGMENT_ID',
    lastVerifiedAt: '2024-01-15T10:30:00.000Z',
    verifiedVia: 'segment'
  }
}
```

## Required vs Optional Fields

### SearchResult
- **Required**: `displayName`, `membership.type`, `membership.segmentId`, `membership.lastVerifiedAt`
- **Optional**: `customerHash`, `customerId`, `membership.verifiedVia`, `membership.membershipPurchaseDate`, all `contact` fields

### OrderDetails
- **Required**: `id`, `locationId`, `lineItems` (array, can be empty)
- **Optional**: `state`, `createdAt`, `totalMoney`, `accessVerified`

### CustomerOrder
- **Required**: `id`, `lineItems` (array, can be empty)
- **Optional**: `createdAt`, `state`, `totalMoney`

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message description"
}
```

Error responses use standard HTTP status codes:
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Testing

When testing with mock data:
1. Mock service returns Square API format (snake_case)
2. Transformation utilities convert to frontend format (camelCase)
3. Frontend receives standardized camelCase format

When testing with real Square API:
1. Real Square API returns snake_case format
2. Same transformation utilities convert to frontend format
3. Frontend receives identical camelCase format

This ensures seamless switching between mock and production data without frontend changes.

