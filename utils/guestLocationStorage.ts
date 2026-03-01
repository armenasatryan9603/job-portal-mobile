import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "guestCountryIso";
const ADDRESS_KEY = "guestLocationAddress";

export async function getGuestCountryIso(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setGuestCountryIso(iso: string): Promise<void> {
  await AsyncStorage.setItem(KEY, iso.trim().toUpperCase().slice(0, 2));
}

export async function getGuestLocationAddress(): Promise<string | null> {
  return AsyncStorage.getItem(ADDRESS_KEY);
}

export async function setGuestLocation(address: string, countryIso: string): Promise<void> {
  await AsyncStorage.setItem(ADDRESS_KEY, address);
  await setGuestCountryIso(countryIso);
}

export async function clearGuestLocation(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, ADDRESS_KEY]);
}
