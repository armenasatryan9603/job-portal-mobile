import { UserProfile } from "@/categories/api";

/**
 * Calculates account completion percentage based on profile data
 * @param profile - User profile data
 * @param userServicesCount - Optional count of user services (if available)
 * @param portfolioCount - Optional count of portfolio items (if available)
 * @returns Completion percentage (0-100)
 */
export function calculateAccountCompletion(
  profile: UserProfile | null,
  userServicesCount?: number,
  portfolioCount?: number
): number {
  if (!profile) {
    return 0;
  }

  let completedFields = 0;
  let totalFields = 0;

  // Basic required fields (name is always present)
  totalFields += 1; // name
  completedFields += 1; // name is required

  // Basic optional fields
  totalFields += 1; // email
  if (profile.email && profile.email.trim().length > 0) completedFields += 1;

  totalFields += 1; // phone
  if (profile.phone && profile.phone.trim().length > 0) completedFields += 1;

  totalFields += 1; // avatarUrl
  if (profile.avatarUrl && profile.avatarUrl.trim().length > 0)
    completedFields += 1;

  totalFields += 1; // bio
  if (profile.bio && profile.bio.trim().length > 0) completedFields += 1;

  // Specialist-specific fields (only count if role is specialist)
  // Note: These fields might not be in UserProfile interface, but we check if they exist
  const profileAny = profile as any;
  if (profile.role === "specialist") {
    totalFields += 1; // experienceYears
    if (
      profileAny.experienceYears !== null &&
      profileAny.experienceYears !== undefined
    )
      completedFields += 1;

    totalFields += 1; // priceMin
    if (profileAny.priceMin !== null && profileAny.priceMin !== undefined)
      completedFields += 1;

    totalFields += 1; // priceMax
    if (profileAny.priceMax !== null && profileAny.priceMax !== undefined)
      completedFields += 1;

    totalFields += 1; // location
    if (profileAny.location && profileAny.location.trim().length > 0)
      completedFields += 1;
  }

  // Additional fields
  totalFields += 1; // languages
  if (
    profile.languages &&
    Array.isArray(profile.languages) &&
    profile.languages.length > 0
  )
    completedFields += 1;

  totalFields += 1; // services (UserServices)
  if (userServicesCount !== undefined && userServicesCount > 0)
    completedFields += 1;

  totalFields += 1; // portfolio
  if (portfolioCount !== undefined && portfolioCount > 0) completedFields += 1;

  // Calculate percentage
  if (totalFields === 0) return 0;
  return Math.round((completedFields / totalFields) * 100);
}
