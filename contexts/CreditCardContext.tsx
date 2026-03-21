import { CreditCard } from "@/types/creditCard";
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
import { useAuth } from "./AuthContext";

interface CreditCardContextType {
  creditCards: CreditCard[];
  isLoading: boolean;
  isLoadingCards: boolean;
  removeCreditCard: (cardId: string) => Promise<boolean>;
  setDefaultCard: (cardId: string) => Promise<boolean>;
  getDefaultCard: () => CreditCard | null;
  refreshCards: () => Promise<void>;
  syncCardsFromBank: () => Promise<void>;
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
    bindingId: api.bindingId,
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
  const { user, isAuthenticated } = useAuth();

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
    if (isAuthenticated && user?.id) {
      refreshCards();
    }
  }, [refreshCards, isAuthenticated, user?.id]);

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

  const syncCardsFromBank = useCallback(async () => {
    await refreshCards();
  }, [refreshCards]);

  const value: CreditCardContextType = {
    creditCards,
    isLoading,
    isLoadingCards,
    removeCreditCard,
    setDefaultCard,
    getDefaultCard,
    refreshCards,
    syncCardsFromBank,
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
