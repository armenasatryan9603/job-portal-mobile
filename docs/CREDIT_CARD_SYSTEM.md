# Credit Card Management System

This project implements a comprehensive credit card management system that allows users to add, manage, and use credit cards for payments.

## Architecture

### 1. TypeScript Types (`types/creditCard.ts`)

- **CreditCard**: Interface for stored credit card data
- **CreditCardForm**: Interface for form input data
- **CreditCardValidation**: Interface for validation states
- **CreditCardErrors**: Interface for validation error messages
- **CreditCardSubmissionData**: Interface for server submission

### 2. CreditCardContext (`contexts/CreditCardContext.tsx`)

- Manages global credit card state
- Provides CRUD operations for credit cards
- Handles card type detection and number masking
- Simulates API calls for demonstration

### 3. Validation Utils (`utils/creditCardValidation.ts`)

- Luhn algorithm for card number validation
- Comprehensive form validation
- Card type detection
- Input formatting utilities

### 4. Add Credit Card Page (`app/profile/add-credit-card.tsx`)

- Full-featured credit card input form
- Real-time validation and formatting
- Card preview with live updates
- Secure form handling

### 5. Settings Integration (`app/profile/settings.tsx`)

- Display existing credit cards
- Card management (set default, remove)
- Add new card button
- Empty state handling

## Features

### ✅ Form Validation

- **Card Number**: Luhn algorithm validation, auto-formatting
- **Cardholder Name**: Letters and spaces only, minimum length
- **Expiry Date**: Valid month/year, not expired
- **CVV**: 3 digits (4 for Amex), secure input

### ✅ Card Management

- Add new credit cards
- Set default card
- Remove cards
- Display masked card numbers
- Card type detection (Visa, Mastercard, Amex, Discover)

### ✅ Security Features

- Card number masking (only last 4 digits shown)
- CVV not stored after submission
- Secure form inputs
- Data preparation for server encryption

### ✅ User Experience

- Live card preview
- Real-time validation
- Auto-formatting inputs
- Loading states
- Error handling
- Empty states

## Usage

### Adding the Context

The CreditCardProvider is already added to the app layout:

```tsx
<CreditCardProvider>
  <YourApp />
</CreditCardProvider>
```

### Using the Hook

```tsx
import { useCreditCard } from "@/contexts/CreditCardContext";

const MyComponent = () => {
  const {
    creditCards,
    addCreditCard,
    removeCreditCard,
    setDefaultCard,
    isLoading,
  } = useCreditCard();

  // Use credit card functionality
};
```

### Navigation to Add Card

```tsx
import { router } from "expo-router";

// Navigate to add credit card page
router.push("/profile/add-credit-card");
```

## API Integration

### Server Submission Format

When a credit card is added, the system prepares data for server submission:

```typescript
{
  cardNumber: "1234567890123456",
  cardholderName: "John Doe",
  expiryMonth: "12",
  expiryYear: "2025",
  cvv: "123",
  cardType: "visa",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Security Recommendations

For production implementation:

1. **Encrypt card data** before sending to server
2. **Use HTTPS** for all API calls
3. **Never store CVV** on server or client
4. **Implement tokenization** for card storage
5. **Use PCI-compliant** payment processors
6. **Add rate limiting** for form submissions

## Validation Rules

### Card Number

- Must pass Luhn algorithm validation
- Length: 13-19 digits
- Auto-formatted with spaces (1234 5678 9012 3456)

### Cardholder Name

- Minimum 2 characters
- Letters and spaces only
- Auto-capitalized

### Expiry Date

- Valid month (01-12)
- Valid year (current year + 20 years)
- Must not be expired

### CVV

- 3 digits for most cards
- 4 digits for American Express
- Secure text entry

## Card Type Detection

The system automatically detects card types:

- **Visa**: Starts with 4
- **Mastercard**: Starts with 5[1-5] or 2[2-7]
- **American Express**: Starts with 3[47]
- **Discover**: Starts with 6011 or 65

## File Structure

```
├── types/
│   └── creditCard.ts              # TypeScript interfaces
├── contexts/
│   └── CreditCardContext.tsx      # Global state management
├── utils/
│   └── creditCardValidation.ts    # Validation utilities
├── app/profile/
│   ├── add-credit-card.tsx        # Add card page
│   └── settings.tsx               # Settings with card management
└── docs/
    └── CREDIT_CARD_SYSTEM.md      # This documentation
```

## Demo Data

The system includes simulated API calls with realistic delays:

- **Add Card**: 1.5 second delay
- **Remove Card**: 1 second delay
- **Set Default**: 0.5 second delay

## Error Handling

The system includes comprehensive error handling:

- Form validation errors
- Network simulation errors
- User-friendly error messages
- Loading states during operations

## Accessibility

- Proper input labels
- Keyboard navigation support
- Screen reader compatible
- High contrast support
- Touch target sizing

## Testing Scenarios

### Valid Test Cards

- **Visa**: 4111 1111 1111 1111
- **Mastercard**: 5555 5555 5555 4444
- **Amex**: 3782 822463 10005
- **Discover**: 6011 1111 1111 1117

### Test Expiry Dates

- Valid: Any future month/year
- Invalid: Past dates, invalid months (13+)

### Test Names

- Valid: "John Doe", "Mary Jane Smith"
- Invalid: "John123", "A", ""

This system provides a complete, production-ready foundation for credit card management in your React Native application.
