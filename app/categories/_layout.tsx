import { Stack } from "expo-router";
import React from "react";

export default function ServicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
        animation: "none",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
