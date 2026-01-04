import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { apiService, Service, UserService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/contexts/TranslationContext";

export const useSkills = (userId?: number) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const currentUserId = userId || user?.id;
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [userServices, setUserServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceNotifications, setServiceNotifications] = useState<{
    [serviceId: number]: boolean;
  }>({});

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      setServicesError(null);

      // Fetch all services with a high limit to get all available services
      const servicesResponse = await apiService.getAllServices(
        1,
        100,
        undefined,
        language
      );
      setAvailableServices(servicesResponse.services);

      // Fetch user services if user is authenticated
      if (currentUserId) {
        try {
          const userServicesResponse = await apiService.getUserServices(
            currentUserId
          );
          const services = userServicesResponse.userServices.map(
            (us) => us.Service
          );
          setUserServices(services);

          // Set up notification preferences
          const notifications: { [serviceId: number]: boolean } = {};
          userServicesResponse.userServices.forEach((us) => {
            notifications[us.serviceId] = us.notificationsEnabled;
          });
          setServiceNotifications(notifications);
        } catch (err) {
          console.error("Error fetching user services:", err);
          // Don't fail the whole operation if user services fail
        }
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      setServicesError("Failed to load services.");
    } finally {
      setServicesLoading(false);
    }
  };

  const toggleServiceSelection = (service: Service) => {
    setUserServices((prev) => {
      const isSelected = prev.some((s) => s.id === service.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const saveUserServices = async () => {
    if (!currentUserId) {
      Alert.alert(t("error"), t("youMustBeLoggedInToSaveSkills"));
      return;
    }

    try {
      setServicesLoading(true);

      // Get current user services from API
      const currentUserServicesResponse = await apiService.getUserServices(
        currentUserId
      );
      const currentUserServices = currentUserServicesResponse.userServices;

      // Find services to add and remove
      const currentServiceIds = currentUserServices.map((us) => us.serviceId);
      const newServiceIds = userServices.map((s) => s.id);

      const servicesToAdd = newServiceIds.filter(
        (id) => !currentServiceIds.includes(id)
      );
      const servicesToRemove = currentServiceIds.filter(
        (id) => !newServiceIds.includes(id)
      );

      // Add new services
      for (const serviceId of servicesToAdd) {
        await apiService.addUserService(currentUserId, serviceId, true);
      }

      // Remove services
      for (const serviceId of servicesToRemove) {
        await apiService.removeUserService(currentUserId, serviceId);
      }

      setShowServicesModal(false);

      // Refresh the services
      await fetchServices();
    } catch (err) {
      console.error("Error saving user services:", err);
      Alert.alert(t("error"), t("failedToSaveSkills"));
    } finally {
      setServicesLoading(false);
    }
  };

  const openServicesModal = () => {
    setShowServicesModal(true);
  };

  const closeServicesModal = () => {
    setShowServicesModal(false);
    setSearchQuery("");
  };

  const removeSkill = async (service: Service) => {
    if (!currentUserId) {
      Alert.alert(t("error"), t("youMustBeLoggedInToRemoveSkills"));
      return;
    }

    try {
      await apiService.removeUserService(currentUserId, service.id);

      setUserServices((prev) => prev.filter((s) => s.id !== service.id));
      // Also remove notification preference when skill is removed
      setServiceNotifications((prev) => {
        const newNotifications = { ...prev };
        delete newNotifications[service.id];
        return newNotifications;
      });
    } catch (err) {
      console.error("Error removing skill:", err);
      Alert.alert(t("error"), t("failedToRemoveSkill"));
    }
  };

  const toggleServiceNotification = async (service: Service) => {
    if (!currentUserId) {
      Alert.alert(
        t("error"),
        t("youMustBeLoggedInToUpdateNotifications")
      );
      return;
    }

    try {
      const newNotificationState = !serviceNotifications[service.id];
      await apiService.updateUserServiceNotifications(
        currentUserId,
        service.id,
        newNotificationState
      );

      setServiceNotifications((prev) => ({
        ...prev,
        [service.id]: newNotificationState,
      }));
    } catch (err) {
      console.error("Error updating notification preference:", err);
      Alert.alert(
        "Error",
        "Failed to update notification preference. Please try again."
      );
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Load services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  return {
    // State
    availableServices,
    userServices,
    servicesLoading,
    servicesError,
    showServicesModal,
    searchQuery,
    serviceNotifications,

    // Actions
    fetchServices,
    toggleServiceSelection,
    saveUserServices,
    openServicesModal,
    closeServicesModal,
    removeSkill,
    setSearchQuery,
    clearSearch,
    toggleServiceNotification,
  };
};
