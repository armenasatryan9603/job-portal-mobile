import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { apiService, Category, UserCategory } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/contexts/TranslationContext";

export const useSkills = (userId?: number) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const currentUserId = userId || user?.id;
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryNotifications, setCategoryNotifications] = useState<{
    [categoryId: number]: boolean;
  }>({});

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);

      // Fetch all categories with a high limit to get all available categories
      const categoriesResponse = await apiService.getAllCategories(
        1,
        100,
        undefined,
        language
      );
      setAvailableCategories(categoriesResponse.categories);

      // Fetch user categories if user is authenticated
      if (currentUserId) {
        try {
          const userCategoriesResponse = await apiService.getUserCategories(
            currentUserId
          );
          const categories = userCategoriesResponse.userCategories.map(
            (uc) => uc.Category
          );
          setUserCategories(categories);

          // Set up notification preferences
          const notifications: { [categoryId: number]: boolean } = {};
          userCategoriesResponse.userCategories.forEach((uc) => {
            notifications[uc.categoryId] = uc.notificationsEnabled;
          });
          setCategoryNotifications(notifications);
        } catch (err) {
          console.error("Error fetching user categories:", err);
          // Don't fail the whole operation if user categories fail
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategoriesError("Failed to load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const toggleCategorySelection = (category: Category) => {
    setUserCategories((prev) => {
      const isSelected = prev.some((c) => c.id === category.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== category.id);
      } else {
        return [...prev, category];
      }
    });
  };

  const saveUserCategories = async () => {
    if (!currentUserId) {
      Alert.alert(t("error"), t("youMustBeLoggedInToSaveSkills"));
      return;
    }

    try {
      setCategoriesLoading(true);

      // Get current user categories from API
      const currentUserCategoriesResponse = await apiService.getUserCategories(
        currentUserId
      );
      const currentUserCategories = currentUserCategoriesResponse.userCategories;

      // Find categories to add and remove
      const currentCategoryIds = currentUserCategories.map((uc) => uc.categoryId);
      const newCategoryIds = userCategories.map((c) => c.id);

      const categoriesToAdd = newCategoryIds.filter(
        (id) => !currentCategoryIds.includes(id)
      );
      const categoriesToRemove = currentCategoryIds.filter(
        (id) => !newCategoryIds.includes(id)
      );

      // Add new categories
      for (const categoryId of categoriesToAdd) {
        await apiService.addUserCategory(currentUserId, categoryId, true);
      }

      // Remove categories
      for (const categoryId of categoriesToRemove) {
        await apiService.removeUserCategory(currentUserId, categoryId);
      }

      setShowCategoriesModal(false);

      // Refresh the categories
      await fetchCategories();
    } catch (err) {
      console.error("Error saving user categories:", err);
      Alert.alert(t("error"), t("failedToSaveSkills"));
    } finally {
      setCategoriesLoading(false);
    }
  };

  const openCategoriesModal = () => {
    setShowCategoriesModal(true);
  };

  const closeCategoriesModal = () => {
    setShowCategoriesModal(false);
    setSearchQuery("");
  };

  const removeSkill = async (category: Category) => {
    if (!currentUserId) {
      Alert.alert(t("error"), t("youMustBeLoggedInToRemoveSkills"));
      return;
    }

    try {
      await apiService.removeUserCategory(currentUserId, category.id);

      setUserCategories((prev) => prev.filter((c) => c.id !== category.id));
      // Also remove notification preference when skill is removed
      setCategoryNotifications((prev) => {
        const newNotifications = { ...prev };
        delete newNotifications[category.id];
        return newNotifications;
      });
    } catch (err) {
      console.error("Error removing skill:", err);
      Alert.alert(t("error"), t("failedToRemoveSkill"));
    }
  };

  const toggleCategoryNotification = async (category: Category) => {
    if (!currentUserId) {
      Alert.alert(
        t("error"),
        t("youMustBeLoggedInToUpdateNotifications")
      );
      return;
    }

    try {
      const newNotificationState = !categoryNotifications[category.id];
      await apiService.updateUserCategoryNotifications(
        currentUserId,
        category.id,
        newNotificationState
      );

      setCategoryNotifications((prev) => ({
        ...prev,
        [category.id]: newNotificationState,
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

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    // State
    availableCategories,
    userCategories,
    categoriesLoading,
    categoriesError,
    showCategoriesModal,
    searchQuery,
    categoryNotifications,

    // Actions
    fetchCategories,
    toggleCategorySelection,
    saveUserCategories,
    openCategoriesModal,
    closeCategoriesModal,
    removeSkill,
    setSearchQuery,
    clearSearch,
    toggleCategoryNotification,
    
    // Backward compatibility aliases
    availableServices: availableCategories,
    userServices: userCategories,
    servicesLoading: categoriesLoading,
    servicesError: categoriesError,
    showServicesModal: showCategoriesModal,
    serviceNotifications: categoryNotifications,
    fetchServices: fetchCategories,
    toggleServiceSelection: toggleCategorySelection,
    saveUserServices: saveUserCategories,
    openServicesModal: openCategoriesModal,
    closeServicesModal: closeCategoriesModal,
    toggleServiceNotification: toggleCategoryNotification,
  };
};
