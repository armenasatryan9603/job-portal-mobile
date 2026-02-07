// API Configuration and Service Layer
import { getApiBaseUrl } from "@/config/api";

const API_BASE_URL = getApiBaseUrl();

// Types based on your backend response structure
export interface Category {
  id: number;
  name: string;
  description?: string;
  nameEn?: string;
  nameRu?: string;
  nameHy?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionHy?: string;
  imageUrl?: string;
  parentId?: number;
  averagePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  rateUnit?: string;
  features: { id: number; name: string; description?: string }[];
  technologies: { id: number; name: string; description?: string }[];
  completionRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  Parent?: Category;
  Children?: Category[];
  specialistCount: number;
  recentOrders: number;
  _count?: {
    SpecialistProfiles: number;
    Orders: number;
  };
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  currency: string;
  durationDays: number;
  isRecurring: boolean;
  features?: {
    unlimitedApplications?: boolean;
    prioritySupport?: boolean;
    advancedFilters?: boolean;
    featuredProfile?: boolean;
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentId?: string | null;
  createdAt: string;
  updatedAt: string;
  Plan: SubscriptionPlan | null;
}

export interface Skill {
  id: number;
  nameEn: string;
  nameRu: string;
  nameHy: string;
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionHy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryListResponse {
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PlatformStats {
  activeSpecialists: number;
  completedProjects: number;
  averageRating: number;
  totalReviews: number;
  supportAvailability: string;
}

export interface UserCategory {
  id: number;
  userId: number;
  categoryId: number;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  Category: Category;
}

// Specialist Profile Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bannerUrl?: string | null;
  bio?: string;
  verified: boolean;
  createdAt: string;
}

export interface SpecialistProfile {
  id: number;
  userId: number;
  categoryId?: number;
  experienceYears?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  currency?: string;
  rateUnit?: string;
  User: User & {
    reviewCount?: number;
    averageRating?: number;
    reviews?: Review[];
  };
  Category?: Category;
  _count?: {
    Proposals: number;
  };
  averageRating?: number;
  reviewCount?: number;
  reviews?: Review[];
}

export interface SpecialistListResponse {
  data: SpecialistProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// User Language Types
export interface UserLanguage {
  code: string; // ISO 639-1 language code
  level: string; // Proficiency level
}

// User Profile Types
export interface UserProfile {
  id: number;
  role: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  creditBalance: number;
  verified: boolean;
  languages?: UserLanguage[];
  createdAt: string;
  experienceYears?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  currency?: string;
  rateUnit?: string;
  portfolio?: PortfolioItem[];
}

export interface UpdateUserProfileData {
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  role?: string;
  languages?: UserLanguage[];
  experienceYears?: number;
}

export interface ApiCard {
  id: string;
  paymentMethodId: string;
  cardNumber: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  cardType: string;
  bindingId?: string; // AmeriaBank binding ID for saved card payments
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Portfolio Types
export interface PortfolioItem {
  id: number;
  userId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Review Types
export interface ReviewUser {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ReviewOrder {
  id: number;
  clientId: number;
  categoryId?: number;
  title?: string;
  description?: string;
  budget?: number;
  status: string;
  createdAt: string;
  Client: ReviewUser;
  Category?: Category;
}

export interface Review {
  id: number;
  orderId: number;
  reviewerId: number;
  specialistId?: number;
  rating: number;
  comment?: string;
  createdAt: string;
  Order: ReviewOrder;
  Reviewer: ReviewUser;
}

export interface Reason {
  id: number;
  code: string;
  nameEn: string;
  nameRu: string;
  nameHy: string;
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionHy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Order Types
export interface DaySchedule {
  enabled: boolean;
  workHours?: { start: string; end: string };
  slots?: string[];
  breaks?: Array<{ start: string; end: string }>;
}

export interface WeeklySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  subscribeAheadDays?: number;
}

export interface OrderClient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  verified?: boolean;
}

export interface MediaFile {
  id: number;
  orderId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: number;
  createdAt: string;
}

export interface OrderQuestion {
  id: number;
  orderId: number;
  question: string;
  order: number;
  createdAt: string;
}

export interface Booking {
  id: number;
  orderId: number;
  clientId: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  clientMessage?: string;
  createdAt: string;
  updatedAt: string;
  Order?: Order;
  Client?: OrderClient;
  MarketMember?: {
    id: number;
    userId: number;
    User?: {
      id: number;
      name: string;
      email: string;
      avatarUrl?: string;
      verified?: boolean;
    };
  };
}

export interface AvailableDay {
  date: string;
  workHours: { start: string; end: string };
  bookings: Array<{
    startTime: string;
    endTime: string;
    clientId?: number;
  }>;
}

export interface AvailableSlotsResponse {
  workDurationPerClient?: number;
  availableDays: AvailableDay[];
}

export interface Order {
  rejectionReason?: string | null;
  id: number;
  clientId: number;
  categoryId?: number;
  title: string;
  description: string;
  titleEn?: string;
  titleRu?: string;
  titleHy?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionHy?: string;
  budget: number;
  currency?: string; // Optional currency code (e.g., USD)
  rateUnit?: string; // Optional rate unit (e.g., per_hour, per_project)
  status:
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "pending"
    | "pending_review"
    | "rejected"
    | "closed"
    | "not_applied"
    | "draft";
  location?: string;
  skills: string[];
  availableDates: string[];
  createdAt: string;
  updatedAt: string;
  orderType?: string; // "one_time" or "permanent"
  workDurationPerClient?: number; // Duration in minutes
  weeklySchedule?: WeeklySchedule; // Recurring weekly schedule for permanent orders
  checkinRequiresApproval?: boolean; // If true, bookings require owner approval
  resourceBookingMode?: "select" | "auto" | "multi"; // How clients book resources
  requiredResourceCount?: number; // Number of resources required per booking session (for multi mode)
  Bookings?: Booking[];
  creditCost?: number; // Credit cost based on order budget
  refundPercentage?: number; // Refund percentage (0.0 to 1.0, e.g., 0.5 for 50%)
  bannerImageId?: number; // ID of the banner image
  BannerImage?: {
    id: number;
    fileUrl: string;
    fileType: string;
  };
  Client: OrderClient;
  Category?: Category;
  Proposals?: any[];
  Reviews?: any[];
  MediaFiles?: MediaFile[];
  questions?: OrderQuestion[];
  _count: {
    Proposals: number;
    Reviews: number;
  };
}

export interface OrderChangeHistory {
  id: number;
  orderId: number;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
  changedBy: number;
  reason?: string;
  createdAt: string;
  ChangedBy: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface OrderPricing {
  id: number;
  minBudget: number;
  maxBudget?: number | null;
  creditCost: number; // Percentage (e.g., 5.0 for 5%)
  teamCreditCost?: number | null; // Percentage (e.g., 7.0 for 7%)
  refundPercentage: number;
  teamRefundPercentage?: number | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const token = await AsyncStorage.getItem("auth_token");
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Always try to get auth token (for optional auth endpoints)
    const token = await this.getAuthToken();

    // If auth is required but no token, throw immediately
    if (requireAuth && !token) {
      throw new Error("Authentication required. Please log in and try again.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Merge headers properly - ensure Authorization is not overridden
    const mergedHeaders: Record<string, string> = {
      ...headers, // Our headers (including Authorization if set)
    };

    // Merge in options.headers, but don't let them override Authorization
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        // Don't override Authorization if it's already set
        if (
          key.toLowerCase() === "authorization" &&
          mergedHeaders.Authorization
        ) {
          return;
        }
        mergedHeaders[key] = value as string;
      });
    }

    const config: RequestInit = {
      ...options,
      headers: mergedHeaders,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error response:`, errorText);

        // Try to parse JSON error response
        let errorMessage = errorText;
        let errorData: any = null;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
          errorData = errorJson; // Preserve full error object
        } catch (e) {
          // Not JSON, use text as is
        }

        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).originalMessage = errorText;
        (error as any).response = {
          data: errorData || { message: errorMessage },
          status: response.status,
        };
        throw error;
      }

      // Check if response has content before parsing JSON
      const contentType = response.headers.get("content-type");
      const text = await response.text();

      // If response is empty, return null
      if (!text || text.trim() === "") {
        return null as T;
      }

      // Try to parse JSON, return null if parsing fails
      try {
        const data = JSON.parse(text);
        return data;
      } catch (e) {
        // If JSON parsing fails, return null for empty/invalid responses
        console.warn(`Failed to parse JSON response from ${url}:`, e);
        return null as T;
      }
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // Generic GET method
  async get<T>(endpoint: string, requireAuth: boolean = false): Promise<T> {
    return this.request<T>(endpoint, {}, requireAuth);
  }

  // Generic POST method
  async post<T>(
    endpoint: string,
    data: any,
    requireAuth: boolean = false
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      requireAuth
    );
  }

  // Generic DELETE method
  async delete<T>(endpoint: string, requireAuth: boolean = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "DELETE",
      },
      requireAuth
    );
  }

  // Authentication API methods
  async login(
    email: string,
    password: string
  ): Promise<{ access_token: string; user: any }> {
    return this.request<{ access_token: string; user: any }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      false
    ); // No auth required for login
  }

  async signup(data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }): Promise<{ access_token: string; user: any }> {
    return this.request<{ access_token: string; user: any }>(
      "/auth/signup",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      false
    ); // No auth required for signup
  }

  async setAuthToken(token: string): Promise<void> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem("auth_token", token);
    } catch (error) {
      console.error("Error setting auth token:", error);
    }
  }

  async clearAuthToken(): Promise<void> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.removeItem("auth_token");
    } catch (error) {
      console.error("Error clearing auth token:", error);
    }
  }

  // Categories API methods
  async getRootCategories(language: string = "en"): Promise<Category[]> {
    return this.request<Category[]>(
      `/categories/root?language=${language}`,
      {},
      false
    ); // No auth required for public categories
  }

  async getAllCategories(
    page: number = 1,
    limit: number = 10,
    parentId?: number,
    language: string = "en"
  ): Promise<CategoryListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      language: language,
    });

    if (parentId !== undefined) {
      params.append("parentId", parentId.toString());
    }

    return this.request<CategoryListResponse>(
      `/categories?${params}`,
      {},
      false
    ); // No auth required
  }

  async getCategoryById(
    id: number,
    language: string = "en"
  ): Promise<Category> {
    return this.request<Category>(
      `/categories/${id}?language=${language}`,
      {},
      false
    ); // No auth required
  }

  async getChildCategories(
    parentId: number,
    language: string = "en"
  ): Promise<Category[]> {
    return this.request<Category[]>(
      `/categories/parent/${parentId}?language=${language}`,
      {},
      false
    ); // No auth required
  }

  async searchCategories(
    query: string,
    page: number = 1,
    limit: number = 10,
    language: string = "en"
  ): Promise<CategoryListResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
      language: language,
    });

    return this.request<CategoryListResponse>(`/categories/search?${params}`);
  }

  // Specialist Profiles API methods
  async getAllSpecialists(
    page: number = 1,
    limit: number = 10
  ): Promise<SpecialistListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<SpecialistListResponse>(
      `/users/specialists?${params}`,
      {},
      false
    );
  }

  async getAllSpecialistsWithAuth(
    page: number = 1,
    limit: number = 10
  ): Promise<SpecialistListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<SpecialistListResponse>(
      `/users/specialists?${params}`,
      {},
      true
    );
  }

  async getSpecialistById(id: number): Promise<SpecialistProfile> {
    return this.request<SpecialistProfile>(`/users/specialists/${id}`);
  }

  // User Profile API methods
  async getUserProfile(): Promise<UserProfile> {
    return this.request<UserProfile>(`/auth/profile`, {}, true);
  }

  async updateUserProfile(data: UpdateUserProfileData): Promise<UserProfile> {
    return this.request<UserProfile>(
      `/auth/profile`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      true
    );
  }

  async getPreferences(): Promise<{ preferences: any }> {
    return this.request<{ preferences: any }>(`/auth/preferences`, {}, true);
  }

  async updatePreferences(data: {
    language?: "en" | "ru" | "hy";
    theme?: "light" | "dark" | "auto";
    pushNotificationsEnabled?: boolean;
    emailNotificationsEnabled?: boolean;
    timezone?: string;
    dateFormat?: string;
  }): Promise<{ preferences: any }> {
    return this.request<{ preferences: any }>(
      `/auth/preferences`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      true
    );
  }

  async updateUserById(
    id: number,
    data: UpdateUserProfileData
  ): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  async getUserById(id: number): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${id}`);
  }

  async updateSpecialistProfile(
    id: number,
    data: {
      categoryId?: number;
      experienceYears?: number;
      priceMin?: number;
      priceMax?: number;
      location?: string;
    }
  ): Promise<any> {
    return this.request<any>(
      `/users/specialists/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/auth/profile/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      },
      true
    );
  }

  // Review API methods

  async getReviewsByReviewer(
    reviewerId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<ReviewListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<ReviewListResponse>(
      `/reviews/reviewer/${reviewerId}?${params}`
    );
  }

  // Order Proposals API methods
  async createProposal(proposalData: {
    orderId: number;
    specialistProfileId?: number;
    userId?: number;
    price?: number;
    message?: string;
  }): Promise<any> {
    return this.request(`/order-proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(proposalData),
    });
  }

  async applyToOrder(proposalData: {
    orderId: number;
    message?: string;
    questionAnswers?: Array<{ questionId: number; answer: string }>;
    peerIds?: number[];
    teamId?: number;
  }): Promise<any> {
    return this.request(
      `/order-proposals/apply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(proposalData),
      },
      true
    );
  }

  async getAllProposals(
    page: number = 1,
    limit: number = 10,
    status?: string,
    orderId?: number,
    userId?: number
  ): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append("status", status);
    if (orderId) params.append("orderId", orderId.toString());
    if (userId) params.append("userId", userId.toString());

    return this.request(`/order-proposals?${params}`);
  }

  async getProposalById(id: number): Promise<any> {
    return this.request(`/order-proposals/${id}`);
  }

  async updateProposal(
    id: number,
    updateData: {
      price?: number;
      message?: string;
      status?: string;
    }
  ): Promise<any> {
    return this.request(`/order-proposals/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });
  }

  async deleteProposal(id: number): Promise<any> {
    return this.request(`/order-proposals/${id}`, {
      method: "DELETE",
    });
  }

  async getProposalsByOrder(orderId: number): Promise<any> {
    return this.request(`/order-proposals/order/${orderId}`);
  }

  async getProposalsByUser(userId: number): Promise<any> {
    return this.request(`/order-proposals/user/${userId}`);
  }

  // Orders API methods
  async getOrderById(id: number): Promise<Order> {
    return this.request<Order>(`/orders/${id}`, {}, false);
  }

  async getOrderChangeHistory(orderId: number): Promise<OrderChangeHistory[]> {
    return this.request<OrderChangeHistory[]>(
      `/orders/${orderId}/change-history`,
      {},
      true
    );
  }

  async saveOrder(orderId: number): Promise<any> {
    return this.request(
      `/orders/${orderId}/save`,
      {
        method: "POST",
      },
      true
    );
  }

  async unsaveOrder(orderId: number): Promise<any> {
    return this.request(
      `/orders/${orderId}/save`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async getSavedOrders(
    page: number = 1,
    limit: number = 20
  ): Promise<OrderListResponse> {
    return this.request<OrderListResponse>(
      `/orders/saved/all?page=${page}&limit=${limit}`,
      {},
      true
    );
  }

  async isOrderSaved(orderId: number): Promise<{ isSaved: boolean }> {
    return this.request<{ isSaved: boolean }>(
      `/orders/${orderId}/is-saved`,
      {},
      true
    );
  }

  async getAllOrders(
    page: number = 1,
    limit: number = 10,
    status?: string,
    categoryId?: number,
    categoryIds?: number[],
    clientId?: number,
    orderType?: "one_time" | "permanent",
    country?: string
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append("status", status);
    if (categoryIds && categoryIds.length > 0) {
      params.append("categoryIds", categoryIds.join(","));
    } else if (categoryId) {
      params.append("categoryId", categoryId.toString());
    }
    if (clientId) params.append("clientId", clientId.toString());
    if (orderType) params.append("orderType", orderType);
    if (country) params.append("country", country);

    return this.request<OrderListResponse>(`/orders?${params}`, {}, true);
  }

  async createOrder(orderData: {
    title: string;
    description: string;
    budget: number;
    currency?: string;
    rateUnit?: string;
    categoryId: number;
    location?: string;
    skills?: string[];
    skillIds?: number[];
    availableDates?: string[];
    useAIEnhancement?: boolean;
    questions?: string[];
    orderType?: string;
    workDurationPerClient?: number;
    weeklySchedule?: WeeklySchedule;
  }): Promise<any> {
    return this.request(
      `/orders/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      },
      true
    ); // Auth required for order creation
  }

  async updateOrder(
    id: number,
    updateData: {
      title?: string;
      description?: string;
      budget?: number;
      currency?: string;
      rateUnit?: string;
      status?: string;
      location?: string;
      skills?: string[];
      skillIds?: number[];
      availableDates?: string[];
      useAIEnhancement?: boolean;
      titleEn?: string;
      titleRu?: string;
      titleHy?: string;
      descriptionEn?: string;
      descriptionRu?: string;
      descriptionHy?: string;
      questions?: string[];
      weeklySchedule?: WeeklySchedule;
    }
  ): Promise<any> {
    return this.request(
      `/orders/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      },
      true
    ); // requireAuth: true
  }

  async setBannerImage(orderId: number, mediaFileId: number): Promise<any> {
    return this.request(
      `/orders/${orderId}/banner-image`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaFileId }),
      },
      true
    ); // requireAuth: true
  }

  async deleteOrder(id: number): Promise<any> {
    return this.request(
      `/orders/${id}`,
      {
        method: "DELETE",
      },
      true
    ); // requireAuth: true
  }

  async previewAIEnhancement(orderData: {
    title: string;
    description: string;
  }): Promise<{
    original: {
      title: string;
      description: string;
    };
    enhanced: {
      titleEn: string;
      titleRu: string;
      titleHy: string;
      descriptionEn: string;
      descriptionRu: string;
      descriptionHy: string;
      detectedLanguage: string;
    };
  }> {
    return this.request(
      `/orders/preview-ai-enhancement`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      },
      true
    ); // Auth required
  }

  async getMyOrders(): Promise<any> {
    return this.request(
      `/orders/my-orders`,
      {
        method: "GET",
      },
      true
    );
  }

  async getMyJobs(): Promise<any> {
    return this.request(
      `/orders/my-jobs`,
      {
        method: "GET",
      },
      true
    );
  }

  async getAvailableOrders(
    page: number = 1,
    limit: number = 10,
    categoryId?: number,
    location?: string,
    budgetMin?: number,
    budgetMax?: number
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (categoryId) params.append("categoryId", categoryId.toString());
    if (location) params.append("location", location);
    if (budgetMin !== undefined)
      params.append("budgetMin", budgetMin.toString());
    if (budgetMax !== undefined)
      params.append("budgetMax", budgetMax.toString());

    return this.request<OrderListResponse>(
      `/orders/available?${params}`,
      {},
      false
    );
  }

  // Public method to get all orders without authentication
  async getPublicOrders(
    page: number = 1,
    limit: number = 10,
    status?: string,
    categoryId?: number,
    categoryIds?: number[],
    clientId?: number,
    orderType?: "one_time" | "permanent",
    country?: string
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append("status", status);
    if (categoryIds && categoryIds.length > 0) {
      params.append("categoryIds", categoryIds.join(","));
    } else if (categoryId) {
      params.append("categoryId", categoryId.toString());
    }
    if (clientId) params.append("clientId", clientId.toString());
    if (orderType) params.append("orderType", orderType);
    if (country) params.append("country", country);

    return this.request<OrderListResponse>(`/orders?${params}`, {}, false);
  }

  async searchOrders(
    query: string,
    page: number = 1,
    limit: number = 10,
    categoryIds?: number[],
    orderType?: "one_time" | "permanent",
    country?: string
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });

    if (categoryIds && categoryIds.length > 0) {
      params.append("categoryIds", categoryIds.join(","));
    }
    if (orderType) params.append("orderType", orderType);
    if (country) params.append("country", country);

    return this.request<OrderListResponse>(`/orders/search?${params}`);
  }

  // Media Files API methods
  async uploadMediaFile(mediaData: {
    orderId: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    mimeType: string;
    fileSize: number;
  }): Promise<any> {
    return this.request(`/media-files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mediaData),
    });
  }

  async deleteMediaFile(mediaFileId: number): Promise<any> {
    return this.request(
      `/media-files/${mediaFileId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  // User Categories API methods
  async getUserCategories(
    userId: number
  ): Promise<{ userCategories: UserCategory[] }> {
    return this.request<{ userCategories: UserCategory[] }>(
      `/users/${userId}/categories`,
      {},
      true
    );
  }

  async addUserCategory(
    userId: number,
    categoryId: number,
    notificationsEnabled: boolean = true
  ): Promise<UserCategory> {
    return this.request<UserCategory>(
      `/users/${userId}/categories`,
      {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          notificationsEnabled,
        }),
      },
      true
    );
  }

  async removeUserCategory(
    userId: number,
    categoryId: number
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/users/${userId}/categories/${categoryId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async updateUserCategoryNotifications(
    userId: number,
    categoryId: number,
    notificationsEnabled: boolean
  ): Promise<UserCategory> {
    return this.request<UserCategory>(
      `/users/${userId}/categories/${categoryId}/notifications`,
      {
        method: "PATCH",
        body: JSON.stringify({
          notificationsEnabled,
        }),
      },
      true
    );
  }

  // Portfolio methods
  async getPortfolio(userId: number): Promise<PortfolioItem[]> {
    return this.request<PortfolioItem[]>(
      `/users/${userId}/portfolio`,
      {},
      false
    );
  }

  async uploadPortfolioItem(
    file: { uri: string; type: string; name: string },
    title?: string,
    description?: string
  ): Promise<PortfolioItem> {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    if (title) {
      formData.append("title", title);
    }
    if (description) {
      formData.append("description", description);
    }

    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/users/portfolio/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorText;
      } catch {
        // Use errorText as is
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async updatePortfolioItem(
    id: number,
    title?: string,
    description?: string
  ): Promise<PortfolioItem> {
    return this.request<PortfolioItem>(
      `/users/portfolio/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title, description }),
      },
      true
    );
  }

  async deletePortfolioItem(id: number): Promise<void> {
    return this.request<void>(
      `/users/portfolio/${id}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  // Team Gallery/Portfolio methods
  async getTeamGallery(teamId: number): Promise<PortfolioItem[]> {
    return this.request<PortfolioItem[]>(
      `/peers/teams/${teamId}/gallery`,
      {},
      false
    );
  }

  async uploadTeamGalleryItem(
    teamId: number,
    file: { uri: string; type: string; name: string },
    title?: string,
    description?: string
  ): Promise<PortfolioItem> {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    if (title) {
      formData.append("title", title);
    }
    if (description) {
      formData.append("description", description);
    }

    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/peers/teams/${teamId}/gallery/upload`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorText;
      } catch {
        // Use errorText as is
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async updateTeamGalleryItem(
    teamId: number,
    id: number,
    title?: string,
    description?: string
  ): Promise<PortfolioItem> {
    return this.request<PortfolioItem>(
      `/peers/teams/${teamId}/gallery/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title, description }),
      },
      true
    );
  }

  async deleteTeamGalleryItem(teamId: number, id: number): Promise<void> {
    return this.request<void>(
      `/peers/teams/${teamId}/gallery/${id}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  // User account management
  async deleteAccount(userId: number, phoneNumber?: string): Promise<any> {
    console.log("🗑️ Attempting to delete account for user ID:", userId);

    // Check if we have an auth token
    const token = await this.getAuthToken();
    if (!token) {
      console.error("❌ No auth token found for account deletion");
      throw new Error("Authentication required. Please log in again.");
    }

    console.log("✅ Auth token found, proceeding with account deletion");

    // Delete the account
    const result = await this.request(
      `/users/${userId}`,
      {
        method: "DELETE",
      },
      true
    ); // requireAuth: true

    // Track phone number for fraud prevention
    if (phoneNumber) {
      try {
        await this.request("/phone-verification/track", {
          method: "POST",
          body: JSON.stringify({
            phoneNumber: phoneNumber,
          }),
        });
        console.log("📱 Phone number tracked for verification");
      } catch (error) {
        console.error("⚠️ Failed to track phone number:", error);
        // Don't fail the deletion if phone verification fails
      }
    }

    return result;
  }

  // Chat API methods
  async createConversation(conversationData: {
    orderId?: number;
    title?: string;
    participantIds: number[];
  }): Promise<any> {
    return this.request(
      `/chat/conversations`,
      {
        method: "POST",
        body: JSON.stringify(conversationData),
      },
      true
    );
  }

  async sendMessage(messageData: {
    conversationId: number;
    content: string;
    messageType?: string;
    metadata?: any;
  }): Promise<any> {
    return this.request(
      `/chat/messages`,
      {
        method: "POST",
        body: JSON.stringify(messageData),
      },
      true
    );
  }

  async checkHiringStatus(checkData: {
    specialistId: number;
    orderId: number;
  }): Promise<any> {
    return this.request(
      `/hiring/check-status`,
      {
        method: "POST",
        body: JSON.stringify(checkData),
      },
      true
    );
  }

  async hireSpecialist(hireData: {
    specialistId: number;
    message: string;
    orderId: number;
  }): Promise<any> {
    return this.request(
      `/hiring`,
      {
        method: "POST",
        body: JSON.stringify(hireData),
      },
      true
    );
  }

  async hireTeam(hireData: {
    teamId: number;
    message: string;
    orderId: number;
  }): Promise<any> {
    return this.request(
      `/hiring/team`,
      {
        method: "POST",
        body: JSON.stringify(hireData),
      },
      true
    );
  }

  async cancelProposal(proposalId: number): Promise<any> {
    return this.request(
      `/order-proposals/${proposalId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "specialist-canceled" }),
      },
      true
    );
  }

  // Order Pricing API
  async getOrderPricing(): Promise<OrderPricing[]> {
    return this.request("/order-pricing");
  }

  // Reasons API
  async getReasons(): Promise<Reason[]> {
    return this.request("/reasons");
  }

  // Referrals API
  async getReferralCode(): Promise<{ code: string }> {
    return this.request("/referrals/code", {}, true);
  }

  async getReferralStats(): Promise<{
    referralCode: string | null;
    totalReferrals: number;
    totalEarned: number;
    pendingRewards: number;
    referrals: Array<{
      id: number;
      referredUserName: string;
      rewardAmount: number;
      status: string;
      createdAt: Date;
    }>;
  }> {
    return this.request("/referrals/stats", {}, true);
  }

  async getReferralShareLink(): Promise<{
    referralCode: string;
    shareLink: string;
    message: string;
  }> {
    return this.request("/referrals/share-link", {}, true);
  }

  async applyReferralCode(
    referralCode: string,
    userId: number
  ): Promise<{
    success: boolean;
    referrerId?: number;
    rewardAmount?: number;
    bonusAmount?: number;
  }> {
    return this.post("/referrals/apply-code", { referralCode, userId }, false);
  }

  // Cards API (saved payment methods)
  async addCard(payload: {
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
    holderName?: string;
  }): Promise<ApiCard> {
    return this.post("/cards", payload, true);
  }

  async getCards(): Promise<ApiCard[]> {
    return this.request<ApiCard[]>("/cards", {}, true);
  }

  async removeCard(cardId: string): Promise<{ success: boolean }> {
    return this.request(`/cards/${cardId}`, { method: "DELETE" }, true);
  }

  async setDefaultCard(cardId: string): Promise<ApiCard> {
    return this.request(`/cards/${cardId}/default`, {
      method: "PATCH",
    }, true);
  }

  // Credit Refill API
  async initiateCreditRefill(
    amount: number,
    currency?: string,
    cardId?: string,
    saveCard?: boolean
  ): Promise<{
    orderId?: string;
    paymentUrl?: string | null;
    paymentHtml?: string | null;
    paymentData?: any;
    conversionInfo?: {
      currency: string;
      originalAmount: number;
      convertedAmount: number;
      exchangeRate: number;
      baseCurrency: string;
    };
    // For saved card payments (direct success)
    success?: boolean;
    message?: string;
    amount?: number;
  }> {
    return this.post(
      "/credit/refill/initiate",
      { amount, currency, cardId, saveCard },
      true
    );
  }

  // Refill with saved card (direct payment, no webview)
  async refillWithSavedCard(
    amount: number,
    currency: string,
    cardId: string
  ): Promise<{
    success: boolean;
    message: string;
    orderId?: string;
    paymentId?: string;
    amount: number;
    conversionInfo?: {
      currency: string;
      originalAmount: number;
      convertedAmount: number;
      exchangeRate: number;
      baseCurrency: string;
    };
  }> {
    return this.post(
      "/credit/refill/initiate",
      { amount, currency, cardId },
      true
    );
  }

  // Credit Transactions API
  async getCreditTransactions(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: Array<{
      id: number;
      userId: number;
      amount: number;
      balanceAfter: number;
      type: string;
      status: string;
      description: string | null;
      referenceId: string | null;
      referenceType: string | null;
      metadata: any;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    return this.request(
      `/credit/transactions?page=${page}&limit=${limit}`,
      {},
      true
    );
  }

  // Peer Relationships API methods
  async addPeer(peerId: number): Promise<any> {
    return this.request(
      `/peers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ peerId }),
      },
      true
    );
  }

  async removePeer(peerId: number): Promise<any> {
    return this.request(
      `/peers/${peerId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async getPeers(): Promise<User[]> {
    return this.request(`/peers`, {}, true);
  }

  async getTeams(): Promise<any[]> {
    // Optional auth - if token exists, team leads get pending invitations included
    // If no token, public teams are returned
    return this.request(`/peers/teams`, {}, false);
  }

  async createTeam(name: string): Promise<any> {
    return this.request(
      `/peers/teams`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      },
      true
    );
  }

  async addTeamMember(teamId: number, userId: number): Promise<any> {
    return this.request(
      `/peers/teams/${teamId}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      },
      true
    );
  }

  async removeTeamMember(teamId: number, userId: number): Promise<any> {
    return this.request(
      `/peers/teams/${teamId}/members/${userId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async updateTeamName(teamId: number, name: string): Promise<any> {
    return this.updateTeam(teamId, { name });
  }

  async updateTeam(
    teamId: number,
    updateData: {
      name?: string;
      bannerUrl?: string | null;
      description?: string | null;
    }
  ): Promise<any> {
    return this.request(
      `/peers/teams/${teamId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      },
      true
    );
  }

  async getPendingPeerInvitations(): Promise<any[]> {
    return this.request(`/peers/invitations/pending`, {}, true);
  }

  async acceptPeerInvitation(relationshipId: number): Promise<any> {
    return this.request(
      `/peers/invitations/${relationshipId}/accept`,
      {
        method: "POST",
      },
      true
    );
  }

  async rejectPeerInvitation(relationshipId: number): Promise<any> {
    return this.request(
      `/peers/invitations/${relationshipId}/reject`,
      {
        method: "POST",
      },
      true
    );
  }

  async getPendingTeamInvitations(): Promise<any[]> {
    return this.request(`/peers/teams/invitations/pending`, {}, true);
  }

  async acceptTeamInvitation(teamMemberId: number): Promise<any> {
    return this.request(
      `/peers/teams/invitations/${teamMemberId}/accept`,
      {
        method: "POST",
      },
      true
    );
  }

  async rejectTeamInvitation(teamMemberId: number): Promise<any> {
    return this.request(
      `/peers/teams/invitations/${teamMemberId}/reject`,
      {
        method: "POST",
      },
      true
    );
  }

  // Platform statistics
  async getPlatformStats(): Promise<PlatformStats> {
    return this.request(`/stats/platform`, {}, false);
  }

  // Constants API
  async getRateUnits(): Promise<{
    success: boolean;
    rateUnits: Array<{
      value: string;
      labelEn: string;
      labelRu: string;
      labelHy: string;
    }>;
  }> {
    return this.request(`/constants/rate-units`, {}, false);
  }

  // Skills API
  async searchSkills(
    query: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: number;
      nameEn: string;
      nameRu: string;
      nameHy: string;
      descriptionEn?: string;
      descriptionRu?: string;
      descriptionHy?: string;
    }>
  > {
    if (!query || query.trim().length === 0) {
      return [];
    }
    try {
      const url = `/skills/search?q=${encodeURIComponent(
        query
      )}&limit=${limit}`;
      const results = await this.request<
        Array<{
          id: number;
          nameEn: string;
          nameRu: string;
          nameHy: string;
          descriptionEn?: string;
          descriptionRu?: string;
          descriptionHy?: string;
        }>
      >(url, {}, false);
      return results;
    } catch (error: any) {
      console.error("Skills API error:", error);
      console.error("Error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.status,
        url: error?.config?.url,
      });
      throw error;
    }
  }

  async getAllSkills(): Promise<
    Array<{
      id: number;
      nameEn: string;
      nameRu: string;
      nameHy: string;
      descriptionEn?: string;
      descriptionRu?: string;
      descriptionHy?: string;
    }>
  > {
    try {
      const response = await this.request<
        | {
            skills?: Array<{
              id: number;
              nameEn: string;
              nameRu: string;
              nameHy: string;
              descriptionEn?: string;
              descriptionRu?: string;
              descriptionHy?: string;
            }>;
            pagination?: any;
          }
        | Array<{
            id: number;
            nameEn: string;
            nameRu: string;
            nameHy: string;
            descriptionEn?: string;
            descriptionRu?: string;
            descriptionHy?: string;
          }>
      >(`/skills?limit=1000`, {}, false);

      // Handle both array response and paginated response
      if (Array.isArray(response)) {
        return response as Array<{
          id: number;
          nameEn: string;
          nameRu: string;
          nameHy: string;
          descriptionEn?: string;
          descriptionRu?: string;
          descriptionHy?: string;
        }>;
      }
      return (response as any).skills || [];
    } catch (error: any) {
      console.error("Error fetching all skills:", error);
      throw error;
    }
  }

  async getSkillById(id: number): Promise<{
    id: number;
    nameEn: string;
    nameRu: string;
    nameHy: string;
    descriptionEn?: string;
    descriptionRu?: string;
    descriptionHy?: string;
  }> {
    return this.request(`/skills/${id}`, {}, false);
  }

  async createSkill(skillData: {
    nameEn: string;
    nameRu: string;
    nameHy: string;
    descriptionEn?: string;
    descriptionRu?: string;
    descriptionHy?: string;
  }): Promise<any> {
    return this.request(
      `/skills`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(skillData),
      },
      true
    );
  }

  // Subscription API methods
  async getSubscriptionPlans(
    language: string = "en"
  ): Promise<SubscriptionPlan[]> {
    return this.request<SubscriptionPlan[]>(
      `/subscriptions/plans?language=${language}`,
      {},
      false
    );
  }

  async getSubscriptionPlanById(
    id: number,
    language: string = "en"
  ): Promise<SubscriptionPlan> {
    return this.request<SubscriptionPlan>(
      `/subscriptions/plans/${id}?language=${language}`,
      {},
      false
    );
  }

  async getMySubscription(
    language: string = "en"
  ): Promise<UserSubscription | null> {
    return this.request<UserSubscription | null>(
      `/subscriptions/my-subscription?language=${language}`,
      {},
      true
    );
  }

  async getMySubscriptions(): Promise<UserSubscription[]> {
    return this.request<UserSubscription[]>(
      `/subscriptions/my-subscriptions`,
      {},
      true
    );
  }

  async purchaseSubscription(data: {
    planId: number;
    autoRenew?: boolean;
  }): Promise<any> {
    return this.request(
      `/subscriptions/purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async cancelSubscription(subscriptionId: number): Promise<any> {
    return this.request(
      `/subscriptions/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      },
      true
    );
  }

  async renewSubscription(subscriptionId: number): Promise<any> {
    return this.request(
      `/subscriptions/renew`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      },
      true
    );
  }

  // Booking methods for permanent orders

  /**
   * Get available slots for a permanent order
   * @param marketMemberId - Optional market member ID to filter slots by specialist (for select mode)
   */
  async getAvailableSlots(
    orderId: number,
    startDate?: Date,
    endDate?: Date,
    marketMemberId?: number
  ): Promise<AvailableSlotsResponse> {
    const params = new URLSearchParams();
    if (startDate) {
      params.append("startDate", startDate.toISOString().split("T")[0]);
    }
    if (endDate) {
      params.append("endDate", endDate.toISOString().split("T")[0]);
    }
    if (marketMemberId) {
      params.append("marketMemberId", marketMemberId.toString());
    }

    const queryString = params.toString();
    const url = `/orders/${orderId}/available-slots${
      queryString ? `?${queryString}` : ""
    }`;

    return this.request(url, {
      method: "GET",
    });
  }

  /**
   * Check in to a permanent order (create booking)
   */
  async checkInToOrder(
    orderId: number,
    slots: Array<{ date: string; startTime: string; endTime: string; marketMemberId?: number; message?: string }>
  ): Promise<{ bookings: Booking[]; errors: any[] }> {
    return this.request(
      `/bookings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, slots }),
      },
      true
    );
  }

  /**
   * Get user's bookings
   */
  async getMyBookings(): Promise<Booking[]> {
    return this.request(
      `/bookings/my`,
      {
        method: "GET",
      },
      true
    );
  }

  /**
   * Update a booking (change date/time)
   */
  async updateBooking(
    bookingId: number,
    data: {
      scheduledDate?: string;
      startTime?: string;
      endTime?: string;
    }
  ): Promise<Booking> {
    return this.request(
      `/bookings/${bookingId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: number): Promise<Booking> {
    return this.request(
      `/bookings/${bookingId}/cancel`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      },
      true
    );
  }

  /**
   * Get bookings for a specific order
   */
  async getOrderBookings(orderId: number): Promise<Booking[]> {
    return this.request(`/bookings/order/${orderId}`, {
      method: "GET",
    });
  }

  /**
   * Update booking status (for approving/rejecting pending bookings)
   */
  async updateBookingStatus(bookingId: number, status: string): Promise<Booking> {
    return this.request(
      `/bookings/${bookingId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
      true
    );
  }

  /**
   * Publish a permanent order (requires subscription)
   */
  async publishPermanentOrder(orderId: number): Promise<Order> {
    return this.request(
      `/orders/${orderId}/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      true
    );
  }

  // Markets API methods
  async createMarket(data: {
    name: string;
    nameEn?: string;
    nameRu?: string;
    nameHy?: string;
    description?: string;
    descriptionEn?: string;
    descriptionRu?: string;
    descriptionHy?: string;
    location?: string;
    phoneNumbers?: string[];
    weeklySchedule?: any;
  }): Promise<any> {
    return this.request(
      `/markets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async publishMarket(marketId: number): Promise<any> {
    return this.request(
      `/markets/${marketId}/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      true
    );
  }

  async getMarkets(filters: {
    page?: number;
    limit?: number;
    status?: string;
    location?: string;
    verified?: boolean;
    search?: string;
    myServices?: boolean;
  }): Promise<{
    markets: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.status) params.append("status", filters.status);
    if (filters.location) params.append("location", filters.location);
    if (filters.verified !== undefined)
      params.append("verified", filters.verified.toString());
    if (filters.search) params.append("search", filters.search);
    if (filters.myServices) params.append("myServices", "true");

    return this.request(`/markets?${params}`, {}, false);
  }

  async getMarketById(marketId: number): Promise<any> {
    return this.request(`/markets/${marketId}`, {}, false);
  }

  async updateMarket(
    marketId: number,
    data: {
      name?: string;
      nameEn?: string;
      nameRu?: string;
      nameHy?: string;
      description?: string;
      descriptionEn?: string;
      descriptionRu?: string;
      descriptionHy?: string;
      location?: string;
      phoneNumbers?: string[];
      weeklySchedule?: any;
    }
  ): Promise<any> {
    return this.request(
      `/markets/${marketId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async deleteMarket(marketId: number): Promise<any> {
    return this.request(
      `/markets/${marketId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async addMarketMember(
    marketId: number,
    userId: number,
    role?: string
  ): Promise<any> {
    return this.request(
      `/markets/${marketId}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role: role || "member" }),
      },
      true
    );
  }

  async updateMarketMember(
    marketId: number,
    memberId: number,
    role: string
  ): Promise<any> {
    return this.request(
      `/markets/${marketId}/members/${memberId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      },
      true
    );
  }

  async removeMarketMember(
    marketId: number,
    memberId: number
  ): Promise<any> {
    return this.request(
      `/markets/${marketId}/members/${memberId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async getPendingMarketInvitations(): Promise<any[]> {
    return this.request(`/markets/invitations/pending`, {}, true);
  }

  async acceptMarketInvitation(marketMemberId: number): Promise<any> {
    return this.request(
      `/markets/invitations/${marketMemberId}/accept`,
      {
        method: "POST",
      },
      true
    );
  }

  async rejectMarketInvitation(marketMemberId: number): Promise<any> {
    return this.request(
      `/markets/invitations/${marketMemberId}/reject`,
      {
        method: "POST",
      },
      true
    );
  }

  async attachOrderToMarket(
    marketId: number,
    orderId: number
  ): Promise<any> {
    return this.request(
      `/markets/${marketId}/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      },
      true
    );
  }

  async detachOrderFromMarket(
    marketId: number,
    orderId: number
  ): Promise<any> {
    return this.request(
      `/markets/${marketId}/orders/${orderId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async setMarketBanner(
    marketId: number,
    mediaFileId: number
  ): Promise<any> {
    return this.request(
      `/markets/${marketId}/banner`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaFileId }),
      },
      true
    );
  }

  // Market Reviews API methods
  async createMarketReview(data: {
    marketId: number;
    rating: number;
    comment?: string;
  }): Promise<any> {
    return this.request(
      `/market-reviews`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async getMarketReviews(
    marketId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    reviews: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    return this.request(
      `/market-reviews/market/${marketId}?page=${page}&limit=${limit}`,
      {},
      false
    );
  }

  async getMarketRating(marketId: number): Promise<{
    averageRating: number;
    totalReviews: number;
  }> {
    return this.request(
      `/market-reviews/market/${marketId}/rating`,
      {},
      false
    );
  }

  async updateMarketReview(
    reviewId: number,
    data: { rating?: number; comment?: string }
  ): Promise<any> {
    return this.request(
      `/market-reviews/${reviewId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async deleteMarketReview(reviewId: number): Promise<any> {
    return this.request(
      `/market-reviews/${reviewId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  // Market Roles API methods
  async getDefaultMarketRoles(): Promise<any[]> {
    return this.request(`/market-roles/defaults`, {}, false);
  }

  async getMarketRoles(marketId: number): Promise<{
    defaultRoles: any[];
    customRoles: any[];
    allRoles: any[];
  }> {
    return this.request(`/market-roles/market/${marketId}`, {}, false);
  }

  async createMarketRole(data: {
    marketId: number;
    name: string;
    nameEn?: string;
    nameRu?: string;
    nameHy?: string;
    permissions?: any;
  }): Promise<any> {
    return this.request(
      `/market-roles`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async updateMarketRole(
    roleId: number,
    data: {
      marketId: number;
      name?: string;
      nameEn?: string;
      nameRu?: string;
      nameHy?: string;
      permissions?: any;
    }
  ): Promise<any> {
    return this.request(
      `/market-roles/${roleId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
      true
    );
  }

  async deleteMarketRole(roleId: number, marketId: number): Promise<any> {
    return this.request(
      `/market-roles/${roleId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ marketId }),
      },
      true
    );
  }

  // Market Subscriptions API methods
  async purchaseMarketSubscription(
    marketId: number,
    planId: number
  ): Promise<any> {
    return this.request(
      `/subscriptions/markets/${marketId}/purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      },
      true
    );
  }

  async getMarketActiveSubscription(marketId: number): Promise<any> {
    return this.request(
      `/subscriptions/markets/${marketId}/active`,
      {},
      false
    );
  }

  async getMarketSubscriptions(marketId: number): Promise<any[]> {
    return this.request(
      `/subscriptions/markets/${marketId}/subscriptions`,
      {},
      false
    );
  }

  // Market Media Files API methods
  async uploadMarketMediaFile(mediaData: {
    marketId: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    mimeType: string;
    fileSize: number;
  }): Promise<any> {
    return this.request(
      `/media-files/markets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mediaData),
      },
      true
    );
  }

  async getMarketMediaFiles(marketId: number): Promise<any[]> {
    return this.request(`/media-files/markets/${marketId}`, {}, false);
  }

  async deleteMarketMediaFile(mediaFileId: number): Promise<any> {
    return this.request(
      `/media-files/markets/${mediaFileId}`,
      {
        method: "DELETE",
      },
      true
    );
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export default
export default apiService;
