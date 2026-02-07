/** Separator used to store ISO country code in location: "address__DE" */
export const LOCATION_COUNTRY_SEPARATOR = "__";

/**
 * Returns the display part of location (before __ISO). Use for showing to user.
 */
export function getLocationDisplay(location: string | null | undefined): string {
  if (!location || typeof location !== "string") return "";
  const idx = location.indexOf(LOCATION_COUNTRY_SEPARATOR);
  return idx >= 0 ? location.slice(0, idx).trim() : location.trim();
}

/**
 * Returns the ISO country code from location if stored as "address__ISO".
 */
export function getCountryIsoFromLocation(location: string | null | undefined): string | null {
  if (!location || typeof location !== "string") return null;
  const idx = location.indexOf(LOCATION_COUNTRY_SEPARATOR);
  if (idx < 0) return null;
  const iso = location.slice(idx + LOCATION_COUNTRY_SEPARATOR.length).trim();
  return iso || null;
}

/**
 * Extracts country name from a location string.
 * Handles various formats like "City, Country", "Street City Country", "Country", etc.
 * 
 * @param location - The location string to parse
 * @returns The country name or null if not found
 */
export const extractCountryFromLocation = (
  location: string | null | undefined
): string | null => {
  if (!location || typeof location !== "string") {
    return null;
  }

  const trimmed = location.trim();
  if (!trimmed) {
    return null;
  }

  // Common country name mappings (English and local names)
  const countryMappings: Record<string, string> = {
    // European countries
    "deutschland": "Germany",
    "germany": "Germany",
    "france": "France",
    "frankreich": "France",
    "spain": "Spain",
    "spanien": "Spain",
    "italy": "Italy",
    "italien": "Italy",
    "united kingdom": "United Kingdom",
    "uk": "United Kingdom",
    "great britain": "United Kingdom",
    "netherlands": "Netherlands",
    "niederlande": "Netherlands",
    "belgium": "Belgium",
    "belgien": "Belgium",
    "poland": "Poland",
    "polen": "Poland",
    "greece": "Greece",
    "griechenland": "Greece",
    "portugal": "Portugal",
    "austria": "Austria",
    "österreich": "Austria",
    "switzerland": "Switzerland",
    "schweiz": "Switzerland",
    "sweden": "Sweden",
    "schweden": "Sweden",
    "norway": "Norway",
    "norwegen": "Norway",
    "denmark": "Denmark",
    "dänemark": "Denmark",
    "finland": "Finland",
    "finnland": "Finland",
    "ireland": "Ireland",
    "irland": "Ireland",
    "czech republic": "Czech Republic",
    "tschechien": "Czech Republic",
    "romania": "Romania",
    "rumänien": "Romania",
    "hungary": "Hungary",
    "ungarn": "Hungary",
    "armenia": "Armenia",
    "հայաստան": "Armenia",
    "russia": "Russia",
    "russland": "Russia",
    "ukraine": "Ukraine",
    "turkey": "Turkey",
    "türkei": "Turkey",
    
    // Other regions
    "united states": "United States",
    "usa": "United States",
    "us": "United States",
    "canada": "Canada",
    "australia": "Australia",
    "new zealand": "New Zealand",
    "japan": "Japan",
    "china": "China",
    "india": "India",
    "brazil": "Brazil",
    "mexico": "Mexico",
  };

  // Normalize the location string (lowercase, remove extra spaces)
  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");

  // Try to find country by checking if location contains any country name
  for (const [key, country] of Object.entries(countryMappings)) {
    // Check if the location string contains the country name
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(normalized)) {
      return country;
    }
  }

  // If no mapping found, try to extract country from common patterns:
  // 1. "City, Country" format
  const commaMatch = trimmed.match(/,\s*([^,]+)$/);
  if (commaMatch) {
    const potentialCountry = commaMatch[1].trim();
    // Check if it's a known country
    for (const [key, country] of Object.entries(countryMappings)) {
      if (potentialCountry.toLowerCase() === key) {
        return country;
      }
    }
    // If it's a single word and looks like a country name, return it
    if (potentialCountry.length > 2 && !potentialCountry.includes(" ")) {
      return potentialCountry;
    }
  }

  // 2. Try to find country at the end of the string (last word)
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    const lastWord = words[words.length - 1].toLowerCase();
    for (const [key, country] of Object.entries(countryMappings)) {
      if (lastWord === key) {
        return country;
      }
    }
  }

  // 3. Check if the entire string is a country name
  for (const [key, country] of Object.entries(countryMappings)) {
    if (normalized === key) {
      return country;
    }
  }

  return null;
};

/**
 * Maps country name (English or common) to ISO 3166-1 alpha-2 code.
 * Used when sending country filter to API (backend filters by ISO).
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  Germany: "DE",
  France: "FR",
  Spain: "ES",
  Italy: "IT",
  "United Kingdom": "GB",
  UK: "GB",
  Netherlands: "NL",
  Belgium: "BE",
  Poland: "PL",
  Greece: "GR",
  Portugal: "PT",
  Austria: "AT",
  Switzerland: "CH",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Finland: "FI",
  Ireland: "IE",
  "Czech Republic": "CZ",
  Romania: "RO",
  Hungary: "HU",
  Armenia: "AM",
  Russia: "RU",
  Ukraine: "UA",
  Turkey: "TR",
  "United States": "US",
  USA: "US",
  Canada: "CA",
  Australia: "AU",
  "New Zealand": "NZ",
  Japan: "JP",
  China: "CN",
  India: "IN",
  Brazil: "BR",
  Mexico: "MX",
};

export function getCountryIsoCode(countryName: string | null | undefined): string | null {
  if (!countryName || typeof countryName !== "string") return null;
  const normalized = countryName.trim();
  if (!normalized) return null;
  return COUNTRY_NAME_TO_ISO[normalized] ?? null;
}
