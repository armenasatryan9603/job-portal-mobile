export interface CreditCard {
  id: string;
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cardType: "visa" | "mastercard" | "amex" | "discover" | "unknown";
  bindingId?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
