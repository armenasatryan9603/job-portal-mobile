import * as Location from "expo-location";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearGuestLocation,
  getGuestCountryIso,
  setGuestLocation,
} from "@/utils/guestLocationStorage";

import { useAuth } from "@/contexts/AuthContext";

type GuestLocationContextType = {
  guestCountryIso: string | null;
  requestLocationAndStore: () => Promise<boolean>;
};

const GuestLocationContext = createContext<GuestLocationContextType | undefined>(undefined);

export function GuestLocationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [guestCountryIso, setState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const requestLocationAndStore = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== "granted") return false;
      const pos = await Location.getCurrentPositionAsync({});
      const results = await Location.reverseGeocodeAsync(pos.coords);
      const first = results[0];
      if (!first) return false;
      const iso = (first.isoCountryCode || "").trim().toUpperCase().slice(0, 2);
      if (!iso) return false;
      const address = [first.street, first.city, first.region, first.country].filter(Boolean).join(", ") || first.country || "";
      await setGuestLocation(address, iso);
      setState(iso);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    getGuestCountryIso().then((stored) => {
      setState(stored);
      setLoaded(true);
    });
  }, []);

  // When user logs in, clear guest country from state; when they log out, re-read from storage (where we saved user.country on login)
  useEffect(() => {
    if (isAuthenticated) setState(null);
    else getGuestCountryIso().then((stored) => setState(stored));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!loaded || isAuthenticated || guestCountryIso != null) return;
    requestLocationAndStore();
  }, [loaded, isAuthenticated, guestCountryIso, requestLocationAndStore]);

  return (
    <GuestLocationContext.Provider value={{ guestCountryIso, requestLocationAndStore }}>
      {children}
    </GuestLocationContext.Provider>
  );
}

export function useGuestCountry() {
  const ctx = useContext(GuestLocationContext);
  if (ctx === undefined) throw new Error("useGuestCountry must be used within GuestLocationProvider");
  return ctx;
}
