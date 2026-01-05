import { API_BASE_URL } from "../config/api";

export interface Conversation {
  id: number;
  orderId?: number;
  title?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  Participants: ConversationParticipant[];
  Messages: Message[];
  Order?: {
    id: number;
    title: string;
    status: string;
    clientId: number;
  };
  _count?: {
    Messages: number;
  };
}

export interface ConversationParticipant {
  id: number;
  conversationId: number;
  userId: number;
  joinedAt: string;
  lastReadAt?: string;
  isActive: boolean;
  User: {
    id: number;
    name: string;
    avatarUrl?: string;
    role: string;
  };
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: "text" | "image" | "file" | "system";
  metadata?: any;
  isEdited: boolean;
  editedAt?: string;
  status?: string;
  createdAt: string;
  Sender: {
    id: number;
    name: string;
    avatarUrl?: string;
  };
}

export interface CreateConversationRequest {
  orderId?: number;
  title?: string;
  participantIds: number[];
}

export interface SendMessageRequest {
  conversationId: number;
  content: string;
  messageType?: "text" | "image" | "file" | "system";
  metadata?: any;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GetMessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class ChatService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  }

  private async getAuthToken(): Promise<string> {
    // Get token from AsyncStorage or your auth context
    // This should be implemented based on your auth system
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    return token;
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    data: CreateConversationRequest
  ): Promise<Conversation> {
    return this.makeRequest<Conversation>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get user's conversations
   */
  async getConversations(
    page: number = 1,
    limit: number = 20
  ): Promise<GetConversationsResponse> {
    return this.makeRequest<GetConversationsResponse>(
      `/chat/conversations?page=${page}&limit=${limit}`
    );
  }

  /**
   * Get specific conversation
   */
  async getConversation(conversationId: number): Promise<Conversation> {
    return this.makeRequest<Conversation>(
      `/chat/conversations/${conversationId}`
    );
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<GetMessagesResponse> {
    return this.makeRequest<GetMessagesResponse>(
      `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
  }

  /**
   * Send a message
   */
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    return this.makeRequest<Message>("/chat/messages", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: number): Promise<void> {
    return this.makeRequest<void>(
      `/chat/conversations/${conversationId}/read`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return this.makeRequest<{ unreadCount: number }>("/chat/unread-count");
  }

  /**
   * Create conversation for order
   * proposalId is optional and used to include peers in group applications
   */
  async createOrderConversation(
    orderId: number,
    proposalId?: number
  ): Promise<Conversation> {
    return this.makeRequest<Conversation>(
      `/chat/orders/${orderId}/conversation`,
      {
        method: "POST",
        body: proposalId ? JSON.stringify({ proposalId }) : undefined,
      }
    );
  }

  /**
   * Get conversation participants
   */
  async getParticipants(
    conversationId: number
  ): Promise<ConversationParticipant["User"][]> {
    return this.makeRequest<ConversationParticipant["User"][]>(
      `/chat/conversations/${conversationId}/participants`
    );
  }

  /**
   * Reject application and refund credit
   * proposalId and rejectPeerIds are optional for individual peer rejection
   */
  async rejectApplication(
    orderId: number,
    proposalId?: number,
    rejectPeerIds?: number[]
  ): Promise<any> {
    const body: any = {};
    if (proposalId) body.proposalId = proposalId;
    if (rejectPeerIds && rejectPeerIds.length > 0)
      body.rejectPeerIds = rejectPeerIds;
    return this.makeRequest<any>(`/chat/orders/${orderId}/reject`, {
      method: "POST",
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Choose application
   */
  async chooseApplication(orderId: number): Promise<any> {
    return this.makeRequest<any>(`/chat/orders/${orderId}/choose`, {
      method: "POST",
    });
  }

  /**
   * Leave a conversation
   */
  async leaveConversation(conversationId: number): Promise<any> {
    return this.makeRequest<any>(
      `/chat/conversations/${conversationId}/leave`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Cancel chosen application and reopen order
   */
  async cancelApplication(orderId: number): Promise<any> {
    return this.makeRequest<any>(`/chat/orders/${orderId}/cancel`, {
      method: "POST",
    });
  }

  /**
   * Complete order and close conversation
   */
  async completeOrder(orderId: number): Promise<any> {
    return this.makeRequest<any>(`/chat/orders/${orderId}/complete`, {
      method: "POST",
    });
  }

  /**
   * Submit feedback for an order
   */
  async submitFeedback(feedbackData: {
    orderId: number;
    specialistId?: number;
    rating: number;
    comment?: string;
    feedbackType: "completed" | "canceled";
    reasonIds?: number[]; // Array of reason IDs for negative feedback
  }): Promise<any> {
    return this.makeRequest<any>("/reviews/feedback", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    });
  }

  async getReviewsByOrder(orderId: number): Promise<any> {
    return this.makeRequest<any>(`/reviews/order/${orderId}`, {
      method: "GET",
    });
  }

  /**
   * Send typing status for a conversation
   */
  async sendTypingStatus(
    conversationId: number,
    isTyping: boolean
  ): Promise<void> {
    await this.makeRequest<void>(
      `/chat/conversations/${conversationId}/typing`,
      {
        method: "POST",
        body: JSON.stringify({ isTyping }),
      }
    );
  }

  /**
   * Delete a conversation (mark as removed)
   */
  async deleteConversation(conversationId: number): Promise<any> {
    return this.makeRequest<any>(`/chat/conversations/${conversationId}`, {
      method: "DELETE",
    });
  }
}

export const chatService = new ChatService();
