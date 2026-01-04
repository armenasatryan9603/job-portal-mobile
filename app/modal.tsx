import { Link, router } from "expo-router";
import { StyleSheet } from "react-native";

import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTranslation } from "@/contexts/TranslationContext";

export default function ModalScreen() {
  const { t } = useTranslation();
  return (
    <Layout
      header={
        <Header
          title={t("modal")}
          showBackButton={true}
          onBackPress={() => router.back()}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t("thisIsAModal")}</ThemedText>
        <Link href="/" dismissTo style={styles.link}>
          <ThemedText type="link">{t("goToHomeScreen")}</ThemedText>
        </Link>
      </ThemedView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
