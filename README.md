# guest-self-checkin

Web application that allows guests at a recreation center to check in using their phone number or email. It interacts with the Square API to search for customer information and manage check-ins.

## Project Structure

```
.
├── src/                    # Main source code for the frontend
│   ├── api.ts             # Functions to interact with backend API
│   ├── App.tsx            # Main React component
│   ├── main.tsx           # Entry point
│   ├── types.ts           # Type definitions
│   ├── index.css          # Tailwind CSS styles
│   └── vite-env.d.ts      # Vite environment types
├── server/                # Tests for UI and backend code
├── config/                 # Configuration files
│   └── square.js          # Square API configuration
├── tests/                 # Tests for UI and backend code
├── server.js              # Express server
├── package.json           # Project metadata
└── tsconfig.json          # TypeScript configuration
```

## Key Components

### Frontend Components

#### SearchPanel
- Toggle between email/phone search
- Input validation and formatting
- Results display with membership status

#### CustomerDetail
- Display customer information
- Check-in form with guest count
- Waiver status and signing interface

### Backend Services

#### SquareService
- Customer search by email/phone
- Order history lookup
- Membership verification

#### WaiverService
- Digital waiver management
- Waiver status checking
- Waiver signing and storage

## API Endpoints

### Routes
```
POST /api/customers/search-phone 
POST /api/customers/search-email 
GET /api/customers
GET /api/waivers/:customerId 
POST /api/waivers/:customerId
```

## Square API Integration

### API Call Flow - Search Page
- Searches by email or phone number to find customer's Square Customer ID (`customerId`)
- Looks for purchase of valid membership (`catalog_order_id`) in `customerID` order history to determine membership status
- Looks for Customer Custom Attribute (`waiver-signed`) on `customerId` in order to determine waiver signed status
- On CustomerDetail page: if `waiver-signed` is not found, customer is presented
### API Call Flow - CustomerDetails Page
- if `waiver-signed` is found, customer is asked to checkin
- if `waiver-signed` is not found, customer is asked to Accept Waiver before being allowed to checkin


## Scripts

```bash
npm run dev         # Start development server for front end
npm run server      # Start express middleware server
npm test            # Run jest tests for the react components and server
npm run test:e2e    # Run playwright e2e tests for the ui (must run dev and server in advance)
```

## Dependencies

### Frontend
- React
- React DOM
- Tailwind CSS
- Vite

### Backend
- Express
- CORS
- dotenv
- Square API
