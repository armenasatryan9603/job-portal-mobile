import React, { createContext, ReactNode, useContext, useState } from "react";

export type ModalType = "login" | "signup" | null;

interface ModalContextType {
  currentModal: ModalType;
  showLoginModal: () => void;
  showSignupModal: () => void;
  hideModal: () => void;
  switchToSignup: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [currentModal, setCurrentModal] = useState<ModalType>(null);

  const showLoginModal = () => {
    setCurrentModal("login");
  };

  const showSignupModal = () => {
    setCurrentModal("signup");
  };

  const hideModal = () => {
    setCurrentModal(null);
  };

  const switchToSignup = () => {
    setCurrentModal("signup");
  };

  const value: ModalContextType = {
    currentModal,
    showLoginModal,
    showSignupModal,
    hideModal,
    switchToSignup,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
