import { LoginModal } from "@/components/LoginModal";
import { SignupModal } from "@/components/SignupModal";
import { BecomeSpecialistModal, shouldShowBecomeSpecialistModal } from "@/components/BecomeSpecialistModal";
import { useModal } from "@/contexts/ModalContext";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState, useRef } from "react";

export const GlobalModals: React.FC = () => {
  const { currentModal, hideModal, switchToLogin, switchToSignup } = useModal();
  const { hasIncompleteProfile, user, isAuthenticated, justSignedUp } = useAuth();
  const [incompleteProfileModalVisible, setIncompleteProfileModalVisible] =
    useState(false);
  const [becomeSpecialistModalVisible, setBecomeSpecialistModalVisible] =
    useState(false);
  const showModalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownAfterSignupRef = useRef(false);
  const hasShownInCurrentSessionRef = useRef(false);

  // Show login modal automatically if user has incomplete profile
  useEffect(() => {
    if (hasIncompleteProfile) {
      setIncompleteProfileModalVisible(true);
    } else {
      setIncompleteProfileModalVisible(false);
    }
  }, [hasIncompleteProfile]);

  // Show become specialist modal after signup (3 seconds delay)
  useEffect(() => {
    if (justSignedUp && isAuthenticated && user && user.role !== "specialist") {
      hasShownAfterSignupRef.current = false;
      hasShownInCurrentSessionRef.current = false;
      const checkAndShow = async () => {
        const shouldShow = await shouldShowBecomeSpecialistModal();
        if (shouldShow && !hasShownAfterSignupRef.current && !hasShownInCurrentSessionRef.current) {
          showModalTimeoutRef.current = setTimeout(() => {
            setBecomeSpecialistModalVisible(true);
            hasShownAfterSignupRef.current = true;
            hasShownInCurrentSessionRef.current = true;
          }, 3000);
        }
      };
      checkAndShow();
    }

    return () => {
      if (showModalTimeoutRef.current) {
        clearTimeout(showModalTimeoutRef.current);
      }
    };
  }, [justSignedUp, isAuthenticated, user?.role]);

  // Show become specialist modal on app open (3 seconds delay) - only once per session
  useEffect(() => {
    if (!isAuthenticated || !user || user.role === "specialist" || hasShownInCurrentSessionRef.current) {
      return;
    }

    const checkAndShow = async () => {
      const shouldShow = await shouldShowBecomeSpecialistModal();
      if (shouldShow && !becomeSpecialistModalVisible && !hasShownAfterSignupRef.current && !hasShownInCurrentSessionRef.current) {
        showModalTimeoutRef.current = setTimeout(() => {
          setBecomeSpecialistModalVisible(true);
          hasShownInCurrentSessionRef.current = true;
        }, 3000);
      }
    };

    // Only check on initial mount when user becomes authenticated
    // Don't check on app state changes to avoid showing multiple times
    checkAndShow();

    return () => {
      if (showModalTimeoutRef.current) {
        clearTimeout(showModalTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user?.role]);

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

      {/* Become Specialist Modal */}
      <BecomeSpecialistModal
        visible={becomeSpecialistModalVisible}
        onClose={() => {
          setBecomeSpecialistModalVisible(false);
          hasShownInCurrentSessionRef.current = true;
        }}
      />
    </>
  );
};
