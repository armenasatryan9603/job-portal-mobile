export interface CreditCard {
  id: string;
  cardNumber: string; // Last 4 digits only for display
  fullCardNumber?: string; // Full number for processing (should be encrypted in real app)
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv?: string; // Should not be stored in real app
  cardType: "visa" | "mastercard" | "amex" | "discover" | "unknown";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCardForm {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface CreditCardValidation {
  cardNumber: boolean;
  cardholderName: boolean;
  expiryMonth: boolean;
  expiryYear: boolean;
  cvv: boolean;
}

export interface CreditCardErrors {
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  general?: string;
}

// For server submission
export interface CreditCardSubmissionData {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardType: string;
}
