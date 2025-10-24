import {
  CreditCardErrors,
  CreditCardForm,
  CreditCardValidation,
} from "@/types/creditCard";

// Luhn algorithm for credit card number validation
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s/g, "");

  if (
    !/^\d+$/.test(cleanNumber) ||
    cleanNumber.length < 13 ||
    cleanNumber.length > 19
  ) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

export const validateCardholderName = (name: string): boolean => {
  const trimmedName = name.trim();
  return trimmedName.length >= 2 && /^[a-zA-Z\s]+$/.test(trimmedName);
};

export const validateExpiryMonth = (month: string): boolean => {
  const monthNum = parseInt(month);
  return monthNum >= 1 && monthNum <= 12;
};

export const validateExpiryYear = (year: string): boolean => {
  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(year);
  return yearNum >= currentYear && yearNum <= currentYear + 20;
};

export const validateCVV = (cvv: string, cardType?: string): boolean => {
  if (cardType === "amex") {
    return /^\d{4}$/.test(cvv);
  }
  return /^\d{3}$/.test(cvv);
};

export const validateExpiryDate = (month: string, year: string): boolean => {
  if (!validateExpiryMonth(month) || !validateExpiryYear(year)) {
    return false;
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const expiryYear = parseInt(year);
  const expiryMonth = parseInt(month);

  if (expiryYear > currentYear) {
    return true;
  }

  if (expiryYear === currentYear && expiryMonth >= currentMonth) {
    return true;
  }

  return false;
};

export const formatCardNumber = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  const groups = cleanNumber.match(/.{1,4}/g) || [];
  return groups.join(" ");
};

export const formatExpiryDate = (month: string, year: string): string => {
  const paddedMonth = month.padStart(2, "0");
  return `${paddedMonth}/${year.slice(-2)}`;
};

export const getCardTypeIcon = (cardType: string): string => {
  switch (cardType) {
    case "visa":
      return "creditcard.fill";
    case "mastercard":
      return "creditcard.fill";
    case "amex":
      return "creditcard.fill";
    case "discover":
      return "creditcard.fill";
    default:
      return "creditcard";
  }
};

export const validateCreditCardForm = (
  form: CreditCardForm
): {
  isValid: boolean;
  errors: CreditCardErrors;
  validation: CreditCardValidation;
} => {
  const errors: CreditCardErrors = {};
  const validation: CreditCardValidation = {
    cardNumber: false,
    cardholderName: false,
    expiryMonth: false,
    expiryYear: false,
    cvv: false,
  };

  // Validate card number
  if (!form.cardNumber.trim()) {
    errors.cardNumber = "Card number is required";
  } else if (!validateCardNumber(form.cardNumber)) {
    errors.cardNumber = "Invalid card number";
  } else {
    validation.cardNumber = true;
  }

  // Validate cardholder name
  if (!form.cardholderName.trim()) {
    errors.cardholderName = "Cardholder name is required";
  } else if (!validateCardholderName(form.cardholderName)) {
    errors.cardholderName = "Invalid cardholder name";
  } else {
    validation.cardholderName = true;
  }

  // Validate expiry month
  if (!form.expiryMonth.trim()) {
    errors.expiryMonth = "Expiry month is required";
  } else if (!validateExpiryMonth(form.expiryMonth)) {
    errors.expiryMonth = "Invalid month";
  } else {
    validation.expiryMonth = true;
  }

  // Validate expiry year
  if (!form.expiryYear.trim()) {
    errors.expiryYear = "Expiry year is required";
  } else if (!validateExpiryYear(form.expiryYear)) {
    errors.expiryYear = "Invalid year";
  } else {
    validation.expiryYear = true;
  }

  // Validate expiry date combination
  if (validation.expiryMonth && validation.expiryYear) {
    if (!validateExpiryDate(form.expiryMonth, form.expiryYear)) {
      errors.expiryMonth = "Card has expired";
      errors.expiryYear = "Card has expired";
      validation.expiryMonth = false;
      validation.expiryYear = false;
    }
  }

  // Validate CVV
  if (!form.cvv.trim()) {
    errors.cvv = "CVV is required";
  } else if (!validateCVV(form.cvv)) {
    errors.cvv = "Invalid CVV";
  } else {
    validation.cvv = true;
  }

  const isValid = Object.values(validation).every((valid) => valid);

  return { isValid, errors, validation };
};
