import { Stack } from "expo-router";
import React from "react";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
        animation: "none",
      }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
      <Stack.Screen name="help/[id]" />
      <Stack.Screen name="refill-credits" />
      <Stack.Screen name="add-credit-card" />
      <Stack.Screen name="peers" />
      <Stack.Screen name="teams/[id]" />
      <Stack.Screen name="invitations" />
    </Stack>
  );
}
