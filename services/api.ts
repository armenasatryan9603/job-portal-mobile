// API Configuration and Service Layer
import { getApiBaseUrl } from "@/config/api";

const API_BASE_URL = getApiBaseUrl();

// Types based on your backend response structure
export interface Service {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  averagePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  features: { id: number; name: string; description?: string }[];
  technologies: { id: number; name: string; description?: string }[];
  completionRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  Parent?: Service;
  Children?: Service[];
  specialistCount: number;
  recentOrders: number;
  _count?: {
    SpecialistProfiles: number;
    Orders: number;
  };
}

export interface ServiceListResponse {
  services: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UserService {
  id: number;
  userId: number;
  serviceId: number;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  Service: Service;
}

// Specialist Profile Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  verified: boolean;
  createdAt: string;
}

export interface SpecialistProfile {
  id: number;
  userId: number;
  serviceId?: number;
  experienceYears?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  User: User;
  Service?: Service;
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
  bio?: string;
  creditBalance: number;
  verified: boolean;
  languages?: UserLanguage[];
  createdAt: string;
  experienceYears?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
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
  serviceId?: number;
  title?: string;
  description?: string;
  budget?: number;
  status: string;
  createdAt: string;
  Client: ReviewUser;
  Service?: Service;
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

export interface Order {
  rejectionReason?: string | null;
  id: number;
  clientId: number;
  serviceId?: number;
  title: string;
  description: string;
  titleEn?: string;
  titleRu?: string;
  titleHy?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  descriptionHy?: string;
  budget: number;
  status: string;
  location?: string;
  skills: string[];
  availableDates: string[];
  createdAt: string;
  updatedAt: string;
  creditCost?: number; // Credit cost based on order budget
  bannerImageId?: number; // ID of the banner image
  BannerImage?: {
    id: number;
    fileUrl: string;
    fileType: string;
  };
  Client: OrderClient;
  Service?: Service;
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

    // Get auth token only if authentication is required
    const token = requireAuth ? await this.getAuthToken() : null;

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
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch (e) {
          // Not JSON, use text as is
        }

        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).originalMessage = errorText;
        throw error;
      }

      const data = await response.json();
      return data;
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

  // Services API methods
  async getRootServices(language: string = "en"): Promise<Service[]> {
    return this.request<Service[]>(
      `/services/root?language=${language}`,
      {},
      false
    ); // No auth required for public services
  }

  async getAllServices(
    page: number = 1,
    limit: number = 10,
    parentId?: number,
    language: string = "en"
  ): Promise<ServiceListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      language: language,
    });

    if (parentId !== undefined) {
      params.append("parentId", parentId.toString());
    }

    return this.request<ServiceListResponse>(`/services?${params}`, {}, false); // No auth required
  }

  async getServiceById(id: number, language: string = "en"): Promise<Service> {
    return this.request<Service>(
      `/services/${id}?language=${language}`,
      {},
      false
    ); // No auth required
  }

  async getChildServices(
    parentId: number,
    language: string = "en"
  ): Promise<Service[]> {
    return this.request<Service[]>(
      `/services/parent/${parentId}?language=${language}`,
      {},
      false
    ); // No auth required
  }

  async searchServices(
    query: string,
    page: number = 1,
    limit: number = 10,
    language: string = "en"
  ): Promise<ServiceListResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
      language: language,
    });

    return this.request<ServiceListResponse>(`/services/search?${params}`);
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
      serviceId?: number;
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
    serviceId?: number,
    serviceIds?: number[],
    clientId?: number
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append("status", status);
    if (serviceIds && serviceIds.length > 0) {
      params.append("serviceIds", serviceIds.join(","));
    } else if (serviceId) {
      params.append("serviceId", serviceId.toString());
    }
    if (clientId) params.append("clientId", clientId.toString());

    return this.request<OrderListResponse>(`/orders?${params}`, {}, true);
  }

  async createOrder(orderData: {
    title: string;
    description: string;
    budget: number;
    serviceId: number;
    location?: string;
    skills?: string[];
    availableDates?: string[];
    useAIEnhancement?: boolean;
    questions?: string[];
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
      status?: string;
      location?: string;
      skills?: string[];
      availableDates?: string[];
      useAIEnhancement?: boolean;
      titleEn?: string;
      titleRu?: string;
      titleHy?: string;
      descriptionEn?: string;
      descriptionRu?: string;
      descriptionHy?: string;
      questions?: string[];
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
    serviceId?: number,
    location?: string,
    budgetMin?: number,
    budgetMax?: number
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (serviceId) params.append("serviceId", serviceId.toString());
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
    serviceId?: number,
    serviceIds?: number[],
    clientId?: number
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append("status", status);
    if (serviceIds && serviceIds.length > 0) {
      params.append("serviceIds", serviceIds.join(","));
    } else if (serviceId) {
      params.append("serviceId", serviceId.toString());
    }
    if (clientId) params.append("clientId", clientId.toString());

    return this.request<OrderListResponse>(`/orders?${params}`, {}, false);
  }

  async searchOrders(
    query: string,
    page: number = 1,
    limit: number = 10,
    serviceIds?: number[]
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });

    if (serviceIds && serviceIds.length > 0) {
      params.append("serviceIds", serviceIds.join(","));
    }

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

  // User Services API methods
  async getUserServices(
    userId: number
  ): Promise<{ userServices: UserService[] }> {
    return this.request<{ userServices: UserService[] }>(
      `/users/${userId}/services`,
      {},
      true
    );
  }

  async addUserService(
    userId: number,
    serviceId: number,
    notificationsEnabled: boolean = true
  ): Promise<UserService> {
    return this.request<UserService>(
      `/users/${userId}/services`,
      {
        method: "POST",
        body: JSON.stringify({
          serviceId,
          notificationsEnabled,
        }),
      },
      true
    );
  }

  async removeUserService(
    userId: number,
    serviceId: number
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/users/${userId}/services/${serviceId}`,
      {
        method: "DELETE",
      },
      true
    );
  }

  async updateUserServiceNotifications(
    userId: number,
    serviceId: number,
    notificationsEnabled: boolean
  ): Promise<UserService> {
    return this.request<UserService>(
      `/users/${userId}/services/${serviceId}/notifications`,
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

  // Credit Refill API
  async initiateCreditRefill(amount: number): Promise<{
    orderId: string;
    paymentUrl: string | null;
    paymentHtml?: string | null;
    paymentData: any;
  }> {
    return this.post("/credit/refill/initiate", { amount }, true);
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
}

// Export singleton instance
export const apiService = new ApiService();

// Export default
export default apiService;
