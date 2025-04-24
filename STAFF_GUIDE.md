# Self Check-In App Staff Guide

## 1. UI Overview

### Main Search Interface
![Main Search Interface](images/main-interface.png)
*Figure 1: Main search interface showing search options and results*

- **Search Options**: Phone, Email, or Lot number search
- **Search Button**: Initiates customer lookup
- **Results List**: Displays matching customers for selection

### Check-In Interface
![Check-In Interface](images/checkin-interface.png)
*Figure 2: Check-in interface showing member status, waiver status, and guest selection*

- **Member Status**: Shows "Member" or "Non-Member" based on Square customer segment
- **Waiver Status**: Shows if waiver is signed (green = signed, red = not signed) based on Square's "waiver-signed" custom attribute
- **Guest Count**: Dropdown to select number of guests
- **Check-In Button**: Finalizes the check-in process
- **Admin Panel**: Access to system settings and reports (password protected)

## 2. Customer Workflow

### Search Process
1. Customer selects search type (phone, email, or lot)
2. Enters at least 3 characters
3. Clicks search button
4. Selects their name from the results list

### Check-In Process
1. System displays customer's membership status:
   - "Member" if in "Membership 2025" Square segment
   - "Non-Member" if not in segment
2. System checks for "waiver-signed" custom attribute in Square:
   - If attribute exists and is true: waiver is considered signed
   - If attribute missing or false: waiver is considered not signed
3. If waiver is not signed:
   - System displays QR code for waiver signing
   - Customer scans QR code and signs waiver
   - Customer clicks "I have already signed" button
4. Customer selects number of guests from dropdown
5. Customer clicks "Check-In" to complete process

## 3. Troubleshooting

### Common Issues

#### Customer Marked as Non-Member
- Verify customer is in "Membership 2025" Square segment by visiting:
  [Square Customer Directory - Membership 2025](https://app.squareup.com/dashboard/customers/directory/Membership%25202025-gv2:VCB62KZ83D27SADBCX65FGJ5N0)
- If customer should be a member, contact membership services to update their Square segment

#### Waiver Status Issues
- **Not Showing as Signed**: 
  - Verify "waiver-signed" custom attribute exists in Square
  - If waiver was signed but not showing:
    1. Search for the customer
    2. Click the gear icon to open Admin Panel
    3. Review customer information from Square
    4. Click the check mark (✓) button to set waiver as signed
    5. Confirm the change
  - Have customer scan QR code and sign again if needed

- **Incorrectly Showing as Signed**:
  - Verify customer identity
  - To reset waiver status:
    1. Search for the customer
    2. Click the gear icon to open Admin Panel
    3. Review customer information from Square
    4. Click the X button to clear waiver status
    5. Confirm the change
  - Have customer sign waiver again

#### App Errors
- Note error message and code
- Restart app if possible
- Contact IT with error details

## 4. Log Analysis

### Accessing Logs
- Logs are available in the admin panel
- Daily logs are stored in `/var/log/checkin/`

### Example Log Lines

#### Customer Search
```
2024-03-15T14:30:22.123Z [ SEARCH ] Type: phone, Query: 5551234567
2024-03-15T14:30:22.234Z [ SEARCH RESULT ] Found 2 customers
```

#### Waiver Status
```
2024-03-15T14:31:15.456Z [ CHECK WAIVER STATUS ] Customer ID: ABC123
2024-03-15T14:31:15.567Z [ WAIVER STATUS RESULT ] Customer ID: ABC123, Has Signed: true
```

#### Waiver Status Updates
```
2024-03-15T14:32:00.789Z [ SET WAIVER STATUS FROM ADMIN PANEL ] Customer ID: ABC123
2024-03-15T14:32:00.890Z [ WAIVER STATUS SET FROM ADMIN PANEL ] Customer ID: ABC123
2024-03-15T14:33:00.123Z [ CLEAR WAIVER STATUS FROM ADMIN PANEL ] Customer ID: ABC123
2024-03-15T14:33:00.234Z [ WAIVER STATUS CLEARED FROM ADMIN PANEL ] Customer ID: ABC123
```

#### Check-In Events
```
2024-03-15T14:35:00.456Z [ CHECK-IN ] Customer ID: ABC123, Guest Count: 2, First Name: John, Last Name: Doe, Lot Number: 123
```

#### Error Messages
```
2024-03-15T14:36:00.789Z [ ERROR ] Failed to search customers: Network error
2024-03-15T14:37:00.123Z [ ERROR ] Failed to update waiver status: Invalid customer ID
```

### Log Pattern Guide
- Timestamp format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Action types in brackets: `[ ACTION ]`
- Customer IDs are alphanumeric
- Error messages include specific error details