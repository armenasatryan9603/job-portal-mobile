import React from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "@/hooks/useTranslation";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors, Spacing } from "@/constants/styles";
import { Button } from "@/components/ui/button";
import { ResponsiveCard } from "@/components/ResponsiveContainer";

interface ServiceActionsProps {
  isOwner: boolean;
  isMember: boolean;
  isPreviewMode: boolean;
  marketStatus: string;
  marketId: number;
  onPublish: () => void;
  onJoin: () => void;
  onLeave: () => void;
  isJoining: boolean;
  isLeaving: boolean;
}

export const ServiceActions: React.FC<ServiceActionsProps> = ({
  isOwner,
  isMember,
  isPreviewMode,
  marketStatus,
  marketId,
  onPublish,
  onJoin,
  onLeave,
  isJoining,
  isLeaving,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  if (isOwner) {
    return (
      <ResponsiveCard marginBlock={Spacing.xs}>
        <View style={styles.buttonRow}>
          {/* Publish Button - Only show in preview mode for draft services */}
          {isPreviewMode && marketStatus === "draft" && (
            <Button
              variant="primary"
              title={t("publish")}
              icon="paperplane.fill"
              iconSize={16}
              iconPosition="left"
              onPress={onPublish}
              backgroundColor={colors.primary}
              textColor="white"
              style={styles.primaryButton}
            />
          )}

          {/* Edit Button */}
          <Button
            variant="outline"
            title={t("editMarket")}
            icon="pencil"
            iconSize={16}
            iconPosition="left"
            onPress={() => router.push(`/services/create?id=${marketId}`)}
            backgroundColor={colors.background}
            textColor={colors.text}
            style={styles.secondaryButton}
          />
        </View>
      </ResponsiveCard>
    );
  }

  if (isMember) {
    return (
      <ResponsiveCard marginBlock={Spacing.xs}>
        <Button
          variant="outline"
          title={t("leaveMarket")}
          icon="person.badge.minus"
          iconSize={16}
          iconPosition="left"
          onPress={onLeave}
          disabled={isLeaving}
          backgroundColor={colors.background}
          textColor={colors.text}
          style={styles.secondaryButton}
          loading={isLeaving}
        />
      </ResponsiveCard>
    );
  }

  return (
    <ResponsiveCard marginBlock={Spacing.xs}>
      <Button
        variant="primary"
        title={t("joinMarket")}
        icon="person.badge.plus"
        iconSize={16}
        iconPosition="left"
        onPress={onJoin}
        disabled={isJoining}
        backgroundColor={colors.primary}
        textColor="white"
        style={styles.primaryButton}
        loading={isJoining}
      />
    </ResponsiveCard>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
});
