# Square API Integration Documentation

## Overview
This document provides a detailed explanation of the integration with Square's APIs, focusing on searching for customers, determining membership status, handling member check-in, and managing waivers.

## Environments
All square credentials are stored in environment variables and must be obtained from the Square developer consoler

### Sandbox
`BtvGateApp` Square application

| Resource | Type | Value |
|--------------|-------|-------|
| BTV Rec Center | Location Id | LDH1GBS49SASE |
| Membership plus 10 | Catalog Object Id | 5P3J4MLH7EFZKG6FGWBGZ46G |
| waiver-signed | Custom Customer Attribute | String, value is timestamp |

| Test Customer ID | Type | Value |
|--------------|-------|-------|
| R3MR2SWBFFHJ8M00B869EBFV6W | Purchased Membership plus 10, Waiver Signed |
| WN30VQSTG8SHS42CAY50DAFT4C | No Purchased Membership, No Waiver |
| 34VPFNT2YBNZ8KW85YM3QQY0H8 | Purchased Membership, No Waiver |
| HHHV3G1BFJ3BYVZEK5SRF3XN40 | No Purchased Membership, Waiver-Signed |

### Production

| Resource | Type | Value |
|--------------|-------|-------|
| BTV Rec Center | Location Id | TBD |
| Membership plus 10 | Catalog Object Id | TBD |
| waiver-signed | Custom Customer Attribute | TBD |

## Workflows
### 1. Searching for a Customer
To find a customer in Square's system, the following steps are taken:
- **Endpoint Used:** `GET /v2/customers`
- **Search Criteria:** Customers can be searched by email, or phone number.
- **Example Request:**
  ```json
  {
    "query": {
      "filter": {
        "email_address": { "fuzzy": "customer@example.com" }
      }
    }
  }
  ```
    ```json
  {
    "query": {
      "filter": {
        "phone_number": { "fuzzy": "1234567894" }
      }
    }
  }
  ```
- **Response Handling:** Extract customer ID from the response for further operations.

### 2. Determining Membership Status
Membership status is determined by checking past purchases of specific catalog object IDs.
- **Endpoint Used:** `POST /v2/orders/search`
- **Search Process:**
  - Retrieve the customer ID from the previous step.
  - Search for completed transactions containing specific catalog object IDs.
- **Example Request:**
  ```json
  {
    "query": {
      "filter": {
        "customer_filter": {
          "customer_ids": ["CUSTOMER_ID"]
        },
        "location_ids": [
          "LOCATIONID"]
      }
    }
  }
  ```
- **Logic for Membership Validation:** If the response contains orders with qualifying catalog object IDs, the customer is considered an active member.

### 3. Handling Member Check-in
TODO
Once membership is validated, check-in is processed as follows:
- **Steps:**
  - Verify customer membership status.
  - Log check-in details (e.g., timestamp, location).
  - Update any internal records.
- **Example Workflow:**
  - Customer scans a QR code or provides their registered email/phone number.
  - System validates membership and logs check-in.

### 4. Managing Waivers
TODO
Handling waivers involves checking for existing signed waivers and prompting for new ones if required.
- **Previously Signed Waivers:**
  - Check for existence of a `waiver-signed` Customer Custom Attribute and check that the timestamp is within the previous yr.
- **New Waivers:**
  - Prompt customer to sign a waiver if none is found.
  - Store the signed waiver status as an update (or creation) of a `waiver-signed` Customer Custom Attribute.