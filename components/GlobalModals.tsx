import { LoginModal } from "@/components/LoginModal";
import { SignupModal } from "@/components/SignupModal";
import { useModal } from "@/contexts/ModalContext";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState } from "react";

export const GlobalModals: React.FC = () => {
  const { currentModal, hideModal, switchToLogin, switchToSignup } = useModal();
  const { hasIncompleteProfile } = useAuth();
  const [incompleteProfileModalVisible, setIncompleteProfileModalVisible] =
    useState(false);

  // Show login modal automatically if user has incomplete profile
  useEffect(() => {
    if (hasIncompleteProfile) {
      setIncompleteProfileModalVisible(true);
    } else {
      setIncompleteProfileModalVisible(false);
    }
  }, [hasIncompleteProfile]);

  const handleIncompleteProfileClose = () => {
    // Don't allow closing if user has incomplete profile
    // This ensures the modal stays open until they complete their profile
  };

  const handleIncompleteProfileSuccess = () => {
    setIncompleteProfileModalVisible(false);
  };

  return (
    <>
      <LoginModal
        visible={currentModal === "login"}
        onClose={hideModal}
        onSwitchToSignup={switchToSignup}
      />

      <SignupModal
        visible={currentModal === "signup"}
        onClose={hideModal}
        onSwitchToLogin={switchToLogin}
      />

      {/* Modal for incomplete profiles - appears on all pages */}
      <LoginModal
        visible={incompleteProfileModalVisible}
        onClose={handleIncompleteProfileClose}
        onSwitchToSignup={() => {
          // Don't allow switching to signup for incomplete profiles
        }}
        onSuccess={handleIncompleteProfileSuccess}
      />
    </>
  );
};
