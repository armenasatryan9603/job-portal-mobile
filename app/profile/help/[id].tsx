import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function HelpDetailScreen() {
  useAnalytics("HelpDetail");
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const params = useLocalSearchParams();

  // Get the item data from route params
  const title = params.title as string;
  const description = params.description as string;
  const sectionTitle = params.sectionTitle as string;

  const header = (
    <Header
      title={sectionTitle || t("help")}
      subtitle={title}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <ResponsiveCard>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <View style={styles.content}>
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
              >
                {description}
              </Text>

              {/* Additional detailed content can be added here based on the item */}
              {getDetailedContent(title, t, colors)}
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
}

// Helper function to get detailed content for specific help items
function getDetailedContent(
  title: string,
  t: (key: string) => string,
  colors: any
): React.ReactNode {
  // Map titles to their detailed content translation keys
  const contentMap: { [key: string]: string[] } = {
    [t("howToCreateAccount")]: [
      t("howToCreateAccount"),
      t("helpDetailDownloadApp"),
      t("helpDetailSignUp"),
      t("helpDetailEnterPhone"),
      t("helpDetailVerifyOTP"),
      t("helpDetailCompleteProfile"),
      t("helpDetailStartExploring"),
    ],
    [t("findingServices")]: [
      t("findingServices"),
      t("helpDetailBrowseServices"),
      t("helpDetailSearchBar"),
      t("helpDetailFilter"),
      t("helpDetailViewProfiles"),
      t("helpDetailSaveFavorites"),
    ],
    [t("makingFirstOrder")]: [
      t("makingFirstOrder"),
      t("helpDetailFindService"),
      t("helpDetailViewDetails"),
      t("helpDetailClickOrder"),
      t("helpDetailFillOrder"),
      t("helpDetailReviewOrder"),
      t("helpDetailWaitProposals"),
      t("helpDetailReviewProposals"),
      t("helpDetailCommunicate"),
    ],
    [t("appPermissions")]: [
      t("appPermissions"),
      t("appPermissionsExplanation"),
      "",
      t("helpDetailRequiredPermissions"),
      t("helpDetailCameraPermission"),
      t("helpDetailPhotoLibraryPermission"),
      t("helpDetailLocationPermission"),
      t("helpDetailNotificationsPermission"),
      "",
      t("helpDetailManagePermissions"),
    ],
    [t("updatingYourProfile")]: [
      t("updatingYourProfile"),
      t("helpDetailGoToProfile"),
      t("helpDetailTapEdit"),
      t("helpDetailUpdateInfo"),
      t("helpDetailChangePhoto"),
      t("helpDetailUpdateBio"),
      t("helpDetailTapSave"),
    ],
    [t("privacySettings")]: [
      t("privacySettings"),
      t("helpDetailControlPrivacy"),
      t("helpDetailManageProfileVisibility"),
      t("helpDetailControlOrderVisibility"),
      t("helpDetailAdjustNotifications"),
      t("helpDetailManageDataSharing"),
      t("helpDetailReviewConnectedApps"),
    ],
    [t("accountSecurity")]: [
      t("accountSecurity"),
      t("helpDetailKeepAccountSecure"),
      t("helpDetailStrongPassword"),
      t("helpDetailTwoFactor"),
      t("helpDetailKeepPhoneUpdated"),
      t("helpDetailDontShareOTP"),
      t("helpDetailLogoutShared"),
      t("helpDetailReportSuspicious"),
    ],
    [t("dataExport")]: [
      t("dataExport"),
      t("helpDetailDownloadData"),
      t("helpDetailGoToSettingsPrivacy"),
      t("helpDetailTapExportData"),
      t("helpDetailRequestExport"),
      t("helpDetailReceiveLink"),
      t("helpDetailDownloadSave"),
    ],
    [t("accountDeletion")]: [
      t("accountDeletion"),
      t("accountDeletionProcess"),
      "",
      t("helpDetailImportantNotes"),
      t("helpDetailPermanentAction"),
      t("helpDetailAllDataDeleted"),
      t("helpDetailCannotDeleteActive"),
      t("helpDetailExportBeforeDeletion"),
    ],
    [t("trackingYourOrders")]: [
      t("trackingYourOrders"),
      t("helpDetailMonitorOrders"),
      t("helpDetailViewOrdersTab"),
      t("helpDetailSeeOrderStatus"),
      t("helpDetailTrackTimeline"),
      t("helpDetailCommunicateSpecialists"),
      t("helpDetailReceiveNotifications"),
    ],
    [t("paymentMethods")]: [
      t("paymentMethods"),
      t("helpDetailManagePayments"),
      t("helpDetailGoToPayments"),
      t("helpDetailAddCard"),
      t("helpDetailSetDefault"),
      t("helpDetailRemoveCards"),
      t("helpDetailViewHistory"),
    ],
    [t("creditSystem")]: [
      t("creditSystem"),
      t("creditSystemExplanation"),
      "",
      t("helpDetailHowCreditsWork"),
      t("helpDetailPurchaseCredits"),
      t("helpDetailCreditsDeducted"),
      t("helpDetailUnusedCredits"),
      t("helpDetailRefillCredits"),
    ],
    [t("orderCancellation")]: [
      t("orderCancellation"),
      t("orderCancellationProcess"),
      "",
      t("helpDetailToCancelOrder"),
      t("helpDetailGoToOrdersTab"),
      t("helpDetailSelectOrder"),
      t("helpDetailTapCancel"),
      t("helpDetailConfirmCancellation"),
      t("helpDetailCancellationNote"),
    ],
    [t("privacyPolicy")]: [
      t("privacyPolicy"),
      t("howWeProtectYourData"),
      "",
      t("helpDetailCommittedPrivacy"),
      t("helpDetailCollectNecessary"),
      t("helpDetailDataEncrypted"),
      t("helpDetailDontSellData"),
      t("helpDetailControlSharing"),
    ],
    [t("termsOfService")]: [
      t("termsOfService"),
      t("userAgreementAndRules"),
      "",
      t("helpDetailAgreeToUse"),
      t("helpDetailUseResponsibly"),
      t("helpDetailRespectUsers"),
      t("helpDetailFollowGuidelines"),
      t("helpDetailComplyLaws"),
    ],
    [t("cookiePolicy")]: [
      t("cookiePolicy"),
      t("howWeUseCookies"),
      "",
      t("helpDetailUseCookies"),
      t("helpDetailImproveFunctionality"),
      t("helpDetailPersonalizeExperience"),
      t("helpDetailAnalyzeUsage"),
      t("helpDetailProvideServices"),
    ],
    [t("gdprCompliance")]: [
      t("gdprCompliance"),
      t("europeanDataProtection"),
      "",
      t("helpDetailYourRightsGDPR"),
      t("helpDetailRightToAccess"),
      t("helpDetailRightToRectification"),
      t("helpDetailRightToErasure"),
      t("helpDetailRightToPortability"),
      t("helpDetailRightToObject"),
    ],
  };

  const content = contentMap[title];
  if (!content || content.length <= 1) {
    return null;
  }

  return (
    <View style={styles.detailedContent}>
      {content.slice(1).map((line, index) => {
        if (line === "") {
          return <View key={index} style={styles.spacer} />;
        }
        const isBullet = line.startsWith("•") || /^\d+\./.test(line);
        return (
          <Text
            key={index}
            style={[
              isBullet ? styles.bulletPoint : styles.detailText,
              { color: colors.textSecondary },
            ]}
          >
            {line}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  content: {
    gap: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  detailedContent: {
    marginTop: 16,
    gap: 8,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 8,
  },
  spacer: {
    height: 12,
  },
});
