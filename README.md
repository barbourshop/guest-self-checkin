# Guest Self Check-In App

## Table of Contents
- [Introduction](#introduction)
- [Development Setup](#development-setup)
- [Integration Details](#integration-details)
- [Testing](#testing)
- [Deployment](#deployment)

## Introduction
The Guest Self Check-In App is a web-based solution for recreational facilities to manage guest check-ins. It integrates with Square's customer management system and provides digital waiver management capabilities.

Key features:
- Integration with Square's customer management system
- Digital waiver verification and signing
- Guest count tracking and member status verification
- Responsive design for various devices
- Real-time member status and waiver validation

The app aims to streamline the check-in process while maintaining necessary security and compliance standards.

## Development Setup

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Workflow](#development-workflow)
- [CI/CD Pipeline](#cicd-pipeline)
- [Available Scripts](#available-scripts)

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Square Developer Account
- External Waiver Service (accessible via QR Code)

### Environment Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file in root directory:
   ```env
   SQUARE_ENVIRONMENT=production
   SQUARE_ACCESS_TOKEN=your_square_access_token
   SQUARE_API_URL=https://connect.squareup.com/v2
   SQUARE_API_VERSION=2025-01-23
   PORT=3000
   VITE_USE_MOCK_API=true
   ```

### Development Workflow
- Frontend development: `npm run dev`
- Backend development: `npm run server`
- Both servers must run for full functionality

### CI/CD Pipeline
The project uses GitHub Actions for continuous integration and deployment. The workflow is defined in `.github/workflows/` and includes:

- **Pull Request Validation**
  - Runs on every pull request to `main` branch
  - Executes unit tests (`npm test`)
  - Runs end-to-end tests (`npm run test:e2e`)
  - Validates TypeScript types
  - Checks for linting errors
  - Pull requests cannot be merged until all checks pass

- **Automated Testing**
  - Unit tests: Jest for component and utility testing
  - E2E tests: Playwright for full user flow testing
  - Tests run against a demo environment with mock data
  - Test results are reported in GitHub Actions

- **Documentation**
  - Automated PDF generation of technical documentation
  - Documentation is generated on successful builds
  - Stored as build artifacts in GitHub Actions

- **Demo Build**
  - Creates a build of the application with demo data
  - Generates Windows installer package
  - Build artifacts are available for download
  - Used for testing and demonstration purposes
  - See [Testing](#testing) section for details on testing against demo builds

#### Available Scripts
```bash
npm run dev         # Start development server (frontend)
npm run server      # Start express middleware server
npm test           # Run jest tests
npm run test:e2e   # Run playwright e2e tests
npm run build      # Build production bundle
```

## Integration Details

- [Square API Integration](#square-api-integration)
- [Waiver Service Integration](#waiver-service-integration)
- [Project Structure](#project-structure)

### Square API Integration
The app uses Square's Customer API and Orders API to:
- Search for customers by email/phone
- Verify membership status
- Track customer history

#### Key Square API Endpoints
- Customer Search: `/v2/customers/search`
- Order History: `/v2/orders/search`
- Customer Attributes: `/v2/customers/{customer_id}/custom-attributes`

### Waiver Service Integration
- Digital waiver management
- Waiver status verification
- Waiver signing and storage

#### Waiver Service API
```typescript
interface WaiverService {
  checkStatus(customerId: string): Promise<boolean>;
  signWaiver(customerId: string, signature: string): Promise<void>;
  getWaiverHistory(customerId: string): Promise<WaiverRecord[]>;
}
```

### Project Structure
```
.
├── src/                    # Frontend source
│   ├── api.ts             # API integration
│   ├── App.tsx            # Main component
│   ├── main.tsx           # Entry point
│   └── types.ts           # Type definitions
├── server/                # Backend services
├── config/                # Configuration
│   └── square.js         # Square API config
└── tests/                # Test suites
```

## Testing

- [Automated Testing](#automated-testing)
- [Running Automated Tests](#running-automated-tests)
- [Release Testing](#release-testing)

### Automated Testing
The application uses Playwright for end-to-end testing against a demo environment. These tests cover:

#### Search & Status Verification
- Search by phone, email, and lot number (with/without results)
- Member/Non-Member status display
- Waiver status display and verification

#### Check-In & Guest Count
- Check-in process for members and non-members
- Guest count selection (preset and custom)
- Check-in confirmation

#### Waiver Management
- Waiver signing process
- Admin panel waiver status updates
- Check-in prevention without waiver

### Running Automated Tests
```bash
npm run test:e2e   # Run playwright e2e tests
```

### Release Testing
Before deploying to production, perform these manual tests in a live environment (connected to Square):

1. **Search Verification**
   - Search for known member, verify member status
   - Search for known non-member, verify non-member status
   - Verify search results display correctly

2. **Waiver Signing Flow**
   - Verify non-waiver-signed person cannot check in
   - Test "I already signed" button functionality
   - Confirm check-in allowed after waiver status update

3. **Waiver Status Persistence**
   - Verify waiver-signed person can check in directly
   - Confirm no waiver signing prompt appears

4. **Guest Count Validation**
   - Test check-in with 0 guests
   - Test check-in with 1 guest
   - Test check-in with 6 guests
   - Test check-in with 10 guests
   - Test check-in with 100 guests

5. **Log Verification**
   - Verify server logs for search events
   - Verify server logs for waiver status changes
   - Verify server logs for check-in events
   - Verify server logs for guest count entries

## Deployment

- [Windows Application Build](#windows-application-build)
- [Windows Installation Guide](#windows-installation-guide)
- [Log Files](#log-files)

### Windows Application Build
The application is built as a Windows executable and deployed locally at the rec center. The build process:

1. **Build Process** (automated via GitHub Actions)
   - React app is built
   - Electron app is packaged
   - Windows installer is created

2. **Deployment Steps**
   - Download the latest Windows installer from GitHub
   - Install on rec center computer
   - Configure environment variables
   - Test connection to Square API

### Windows Installation Guide

1. **Download and Install**
   - Go to the GitHub repository
   - Navigate to the "Actions" tab
   - Select the latest successful build
   - Download the `windows-installer` artifact
   - Run the downloaded `.exe` file
   - Follow the installation wizard

2. **Configure Environment Variables**
   - Right-click on "This PC" or "My Computer"
   - Select "Properties"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", click "New"
   - Add each variable from the list below:

   ```env
   SQUARE_ENVIRONMENT=production
   SQUARE_ACCESS_TOKEN=your_square_access_token
   SQUARE_API_URL=https://connect.squareup.com/v2
   SQUARE_API_VERSION=2025-01-23
   PORT=3000
   VITE_USE_MOCK_API=false
   ```

3. **Verify Installation**
   - Launch the application
   - Check Windows Event Viewer for any errors
   - Test a search to verify Square API connection
   - Verify the application appears in Windows Start menu

4. **Troubleshooting**
   - If the app won't start, check Event Viewer for errors
   - If Square API connection fails, verify environment variables
   - If the app crashes, try reinstalling
   - Check Windows Firewall settings if network issues occur

### Log Files
Application logs are output to the console and standard output/error streams. The application uses a consistent logging format with timestamps and action types in brackets.

#### Log Format
- Timestamp format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Action types in brackets: `[ ACTION ]`
- Example log lines:

```
2024-03-15T14:30:22.123Z [ SEARCH ] Type: phone, Query: 5551234567
2024-03-15T14:31:15.456Z [ CHECK WAIVER STATUS ] Customer ID: ABC123
2024-03-15T14:35:00.456Z [ CHECK-IN ] Customer ID: ABC123, Guest Count: 2, First Name: John, Last Name: Doe
2024-03-15T14:36:00.789Z [ ERROR ] Failed to search customers: Network error
```

#### Log Types
The application logs the following types of events:
- Search events
- Check-in events
- Waiver status changes
- Error messages and exceptions
- Square API interactions

#### Accessing Logs
Logs can be accessed in several ways depending on the environment:

1. **Development Environment**
   - In the terminal/command prompt where the application is running
   - In the application's development console

2. **Windows Application**
   - Open Windows Event Viewer
   - Navigate to: `Windows Logs > Application`
   - Filter for events from "Rec Center Check-in" application
   - Logs are also visible in the application's console window if running in windowed mode

3. **Troubleshooting**
   - For application errors, check Windows Event Viewer first
   - For Square API issues, look for logs containing "[ ERROR ]" or "Square API"
   - For check-in issues, search for logs containing "[ CHECK-IN ]"
