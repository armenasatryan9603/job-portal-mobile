import { CreditCard, CreditCardSubmissionData } from "@/types/creditCard";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface CreditCardContextType {
  creditCards: CreditCard[];
  isLoading: boolean;
  addCreditCard: (cardData: CreditCardSubmissionData) => Promise<boolean>;
  removeCreditCard: (cardId: string) => Promise<boolean>;
  setDefaultCard: (cardId: string) => Promise<boolean>;
  getDefaultCard: () => CreditCard | null;
}

const CreditCardContext = createContext<CreditCardContextType | undefined>(
  undefined
);

interface CreditCardProviderProps {
  children: ReactNode;
}

export const CreditCardProvider: React.FC<CreditCardProviderProps> = ({
  children,
}) => {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Utility function to detect card type
  const detectCardType = (
    cardNumber: string
  ): "visa" | "mastercard" | "amex" | "discover" | "unknown" => {
    const cleanNumber = cardNumber.replace(/\s/g, "");

    if (/^4/.test(cleanNumber)) return "visa";
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber))
      return "mastercard";
    if (/^3[47]/.test(cleanNumber)) return "amex";
    if (/^6(?:011|5)/.test(cleanNumber)) return "discover";

    return "unknown";
  };

  // Utility function to mask card number
  const maskCardNumber = (cardNumber: string): string => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    return cleanNumber.slice(-4);
  };

  const addCreditCard = async (
    cardData: CreditCardSubmissionData
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newCard: CreditCard = {
        id: Date.now().toString(),
        cardNumber: maskCardNumber(cardData.cardNumber),
        fullCardNumber: cardData.cardNumber, // In real app, this should be encrypted
        cardholderName: cardData.cardholderName,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        cardType: detectCardType(cardData.cardNumber),
        isDefault: creditCards.length === 0, // First card becomes default
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCreditCards((prev) => [...prev, newCard]);

      // In a real app, you would send this data to your server:
      console.log("Credit Card Data for Server:", {
        cardNumber: cardData.cardNumber,
        cardholderName: cardData.cardholderName,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        cvv: cardData.cvv, // Should be sent securely and not stored
        cardType: detectCardType(cardData.cardNumber),
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Error adding credit card:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeCreditCard = async (cardId: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCreditCards((prev) => {
        const filteredCards = prev.filter((card) => card.id !== cardId);

        // If we removed the default card and there are other cards, make the first one default
        if (filteredCards.length > 0) {
          const removedCard = prev.find((card) => card.id === cardId);
          if (removedCard?.isDefault) {
            filteredCards[0].isDefault = true;
          }
        }

        return filteredCards;
      });

      return true;
    } catch (error) {
      console.error("Error removing credit card:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultCard = async (cardId: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCreditCards((prev) =>
        prev.map((card) => ({
          ...card,
          isDefault: card.id === cardId,
        }))
      );

      return true;
    } catch (error) {
      console.error("Error setting default card:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultCard = (): CreditCard | null => {
    return creditCards.find((card) => card.isDefault) || null;
  };

  const value: CreditCardContextType = {
    creditCards,
    isLoading,
    addCreditCard,
    removeCreditCard,
    setDefaultCard,
    getDefaultCard,
  };

  return (
    <CreditCardContext.Provider value={value}>
      {children}
    </CreditCardContext.Provider>
  );
};

export const useCreditCard = (): CreditCardContextType => {
  const context = useContext(CreditCardContext);
  if (!context) {
    throw new Error("useCreditCard must be used within a CreditCardProvider");
  }
  return context;
};
