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
├── tests/                 # Tests for UI and backend code
├── config/                 # Configuration files
│   └── square.js          # Square API configuration
├── server.js              # Express server
├── package.json           # Project metadata
└── tsconfig.json          # TypeScript configuration
```

## Key Components

### Frontend

#### App.tsx
- Main component for user interactions and UI
- Handles profile search via phone/email
- Displays membership status and pool pass information
- Manages check-in process and waiver acceptance

#### api.ts
- Provides `searchCustomers` function
- Handles backend API communication
- Returns enhanced customer data with membership status

#### types.ts
- Defines TypeScript interfaces for customers and orders
- Contains `adaptCustomer` utility function
- Includes membership type definitions

### Backend

#### server.js
- Express server for API handling
- Customer search endpoints with membership verification
- Order history lookup for pool pass validation
- Square API integration
- Static file serving

## Square API Integration

### Customer Search
- Searches by email or phone number
- Returns customer profiles with order history
- Verifies pool pass membership status by retrieving customer order history and looking for presence of a specific catalog_order_id

## Scripts

```bash
npm run dev      # Start development server for front end
npm run server      # Start development server for back end
npx playwright test     # Run playwright e2e tests for the ui (must run dev and server in advance)
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
