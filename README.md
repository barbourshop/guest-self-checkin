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
├── config/                 # Configuration files
│   └── square.js          # Square API configuration
├── public/                 # Static files
├── server.js              # Express server
├── package.json           # Project metadata
└── tsconfig.json          # TypeScript configuration
```

## Key Components

### Frontend

#### App.tsx
- Main component for user interactions and UI
- Handles profile search via phone/email
- Manages check-in process and waiver acceptance

#### api.ts
- Provides `searchCustomers` function
- Handles backend API communication

#### types.ts
- Defines TypeScript interfaces
- Contains `adaptCustomer` utility function

### Backend

#### server.js
- Express server for API handling
- Customer search endpoints
- Square API integration
- Static file serving

#### config/square.js
- Square API configuration settings

## Configuration

- `vite.config.ts`: Vite build configuration
- `tsconfig.json`: TypeScript settings
- `postcss.config.js`: PostCSS settings
- `tailwind.config.js`: Tailwind CSS settings

## Scripts

```bash
npm run dev      # Start development server for front end
npm run server      # Start development server for back end
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
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

## Usage

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/guest-self-checkin.git
    cd guest-self-checkin
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create `.env` file with Square API token

4. Start development server:
    ```bash
    npm run dev
    ```

## API Endpoints

### POST /search-customers-phone
Search customers by phone number

### POST /search-customers-email
Search customers by email address

