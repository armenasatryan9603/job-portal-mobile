import { CreditCard, CreditCardSubmissionData } from "@/types/creditCard";
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ApiCard } from "@/categories/api";
import { apiService } from "@/categories/api";

interface CreditCardContextType {
  creditCards: CreditCard[];
  isLoading: boolean;
  isLoadingCards: boolean;
  addCreditCard: (cardData: CreditCardSubmissionData) => Promise<boolean>;
  removeCreditCard: (cardId: string) => Promise<boolean>;
  setDefaultCard: (cardId: string) => Promise<boolean>;
  getDefaultCard: () => CreditCard | null;
  refreshCards: () => Promise<void>;
}

const CreditCardContext = createContext<CreditCardContextType | undefined>(
  undefined
);

function apiCardToCreditCard(api: ApiCard): CreditCard {
  return {
    id: api.id,
    cardNumber: api.cardNumber || `****${api.last4}`,
    cardholderName: api.cardholderName || "",
    expiryMonth: api.expiryMonth || String(api.expMonth).padStart(2, "0"),
    expiryYear: api.expiryYear || String(api.expYear),
    cardType:
      (api.cardType as CreditCard["cardType"]) ||
      (api.brand as CreditCard["cardType"]) ||
      "unknown",
    isDefault: api.isDefault,
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  };
}

interface CreditCardProviderProps {
  children: ReactNode;
}

export const CreditCardProvider: React.FC<CreditCardProviderProps> = ({
  children,
}) => {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

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

  const refreshCards = useCallback(async () => {
    setIsLoadingCards(true);
    try {
      const list = await apiService.getCards();
      setCreditCards(list.map(apiCardToCreditCard));
    } catch (error) {
      console.error("Error fetching cards:", error);
      setCreditCards([]);
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  const addCreditCard = async (
    cardData: CreditCardSubmissionData
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const cleanNumber = cardData.cardNumber.replace(/\s/g, "");
      const last4 = cleanNumber.slice(-4);
      const brand = detectCardType(cardData.cardNumber);
      const expMonth = parseInt(cardData.expiryMonth, 10);
      const expYear = parseInt(cardData.expiryYear, 10);
      if (isNaN(expMonth) || isNaN(expYear)) {
        return false;
      }
      const added = await apiService.addCard({
        last4,
        brand,
        expMonth,
        expYear,
        holderName: cardData.cardholderName.trim() || undefined,
      });
      const newCard = apiCardToCreditCard(added);
      setCreditCards((prev) => [...prev, newCard]);
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
      await apiService.removeCard(cardId);
      await refreshCards();
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
      await apiService.setDefaultCard(cardId);
      await refreshCards();
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
    isLoadingCards,
    addCreditCard,
    removeCreditCard,
    setDefaultCard,
    getDefaultCard,
    refreshCards,
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
