# 📚 Complete API Endpoints Documentation

## 🎯 **Purpose**

This document serves as a comprehensive reference for all API endpoints used in the mobile application. When making general changes, always consult this document to ensure no endpoints or attributes are missed.

---

## 🔐 **AUTHENTICATION ENDPOINTS**

### **Login & Registration**

| Method | Endpoint           | Auth Required | Parameters                        | Response                 |
| ------ | ------------------ | ------------- | --------------------------------- | ------------------------ |
| `POST` | `/auth/login`      | ❌ No         | `{ email, password }`             | `{ access_token, user }` |
| `POST` | `/auth/signup`     | ❌ No         | `{ name, email, password, role }` | `{ access_token, user }` |
| `POST` | `/auth/verify-otp` | ❌ No         | `{ phone, otp, name }`            | `{ access_token, user }` |
| `POST` | `/auth/logout`     | ✅ Yes        | `{}`                              | `{ success, message }`   |

### **Profile Management**

| Method  | Endpoint                 | Auth Required | Parameters                         | Response      |
| ------- | ------------------------ | ------------- | ---------------------------------- | ------------- |
| `GET`   | `/auth/profile`          | ✅ Yes        | `{}`                               | `UserProfile` |
| `PUT`   | `/auth/profile`          | ✅ Yes        | `UpdateUserProfileData`            | `UserProfile` |
| `PATCH` | `/auth/profile/password` | ✅ Yes        | `{ currentPassword, newPassword }` | `{ message }` |

### **User Management**

| Method   | Endpoint      | Auth Required | Parameters                          | Response      |
| -------- | ------------- | ------------- | ----------------------------------- | ------------- |
| `GET`    | `/users/{id}` | ❌ No         | `id: number`                        | `UserProfile` |
| `PATCH`  | `/users/{id}` | ❌ No         | `id: number, UpdateUserProfileData` | `UserProfile` |
| `DELETE` | `/users/{id}` | ✅ Yes        | `id: number`                        | `{ success }` |

---

## 🛠️ **SERVICES ENDPOINTS**

### **Service Discovery**

| Method | Endpoint                      | Auth Required | Parameters                               | Response              |
| ------ | ----------------------------- | ------------- | ---------------------------------------- | --------------------- |
| `GET`  | `/services/root`              | ❌ No         | `?language=en`                           | `Service[]`           |
| `GET`  | `/services`                   | ❌ No         | `?page=1&limit=10&parentId?&language=en` | `ServiceListResponse` |
| `GET`  | `/services/{id}`              | ❌ No         | `id: number, ?language=en`               | `Service`             |
| `GET`  | `/services/parent/{parentId}` | ❌ No         | `parentId: number, ?language=en`         | `Service[]`           |
| `GET`  | `/services/search`            | ❌ No         | `?q=query&page=1&limit=10&language=en`   | `ServiceListResponse` |

### **Service Attributes**

```typescript
interface Service {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  averagePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  features: string[];
  technologies: string[];
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
```

---

## 👥 **SPECIALISTS ENDPOINTS**

### **Specialist Discovery**

| Method | Endpoint                  | Auth Required | Parameters         | Response                 |
| ------ | ------------------------- | ------------- | ------------------ | ------------------------ |
| `GET`  | `/users/specialists`      | ❌ No         | `?page=1&limit=10` | `SpecialistListResponse` |
| `GET`  | `/users/specialists`      | ✅ Yes        | `?page=1&limit=10` | `SpecialistListResponse` |
| `GET`  | `/users/specialists/{id}` | ❌ No         | `id: number`       | `SpecialistProfile`      |

### **Specialist Attributes**

```typescript
interface SpecialistProfile {
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
```

---

## 📋 **ORDERS ENDPOINTS**

### **Order Management**

| Method   | Endpoint            | Auth Required | Parameters                                                    | Response              |
| -------- | ------------------- | ------------- | ------------------------------------------------------------- | --------------------- |
| `GET`    | `/orders/{id}`      | ❌ No         | `id: number`                                                  | `Order`               |
| `GET`    | `/orders`           | ✅ Yes        | `?page=1&limit=10&status?&serviceId?&clientId?`               | `OrderListResponse`   |
| `GET`    | `/orders`           | ❌ No         | `?page=1&limit=10&status?&serviceId?&clientId?`               | `OrderListResponse`   |
| `GET`    | `/orders/my-orders` | ✅ Yes        | `{}`                                                          | `{ orders: Order[] }` |
| `GET`    | `/orders/my-jobs`   | ✅ Yes        | `{}`                                                          | `{ orders: Order[] }` |
| `GET`    | `/orders/available` | ❌ No         | `?page=1&limit=10&serviceId?&location?&budgetMin?&budgetMax?` | `OrderListResponse`   |
| `GET`    | `/orders/search`    | ❌ No         | `?q=query&page=1&limit=10`                                    | `OrderListResponse`   |
| `POST`   | `/orders/create`    | ✅ Yes        | `CreateOrderData`                                             | `Order`               |
| `PATCH`  | `/orders/{id}`      | ✅ Yes        | `id: number, UpdateOrderData`                                 | `Order`               |
| `DELETE` | `/orders/{id}`      | ✅ Yes        | `id: number`                                                  | `{ success }`         |

### **Order Attributes**

```typescript
interface Order {
  id: number;
  clientId: number;
  serviceId?: number;
  title: string;
  description: string;
  budget: number;
  status: string;
  location?: string;
  skills: string[];
  availableDates: string[];
  createdAt: string;
  updatedAt: string;
  Client: OrderClient;
  Service?: Service;
  Proposals?: any[];
  Reviews?: any[];
  MediaFiles?: MediaFile[];
  _count: {
    Proposals: number;
    Reviews: number;
  };
}
```

---

## 💼 **PROPOSALS ENDPOINTS**

### **Proposal Management**

| Method   | Endpoint                           | Auth Required | Parameters                                      | Response               |
| -------- | ---------------------------------- | ------------- | ----------------------------------------------- | ---------------------- |
| `POST`   | `/order-proposals`                 | ❌ No         | `CreateProposalData`                            | `Proposal`             |
| `POST`   | `/order-proposals/apply`           | ✅ Yes        | `{ orderId, message? }`                         | `Proposal`             |
| `GET`    | `/order-proposals`                 | ❌ No         | `?page=1&limit=10&status?&orderId?&userId?`     | `ProposalListResponse` |
| `GET`    | `/order-proposals/{id}`            | ❌ No         | `id: number`                                    | `Proposal`             |
| `PATCH`  | `/order-proposals/{id}`            | ❌ No         | `id: number, UpdateProposalData`                | `Proposal`             |
| `DELETE` | `/order-proposals/{id}`            | ❌ No         | `id: number`                                    | `{ success }`          |
| `GET`    | `/order-proposals/order/{orderId}` | ❌ No         | `orderId: number`                               | `Proposal[]`           |
| `GET`    | `/order-proposals/user/{userId}`   | ❌ No         | `userId: number`                                | `Proposal[]`           |
| `PATCH`  | `/order-proposals/{id}`            | ✅ Yes        | `id: number, { status: "specialist-canceled" }` | `Proposal`             |

### **Proposal Data Types**

```typescript
interface CreateProposalData {
  orderId: number;
  specialistProfileId?: number;
  userId?: number;
  price?: number;
  message?: string;
}

interface UpdateProposalData {
  price?: number;
  message?: string;
  status?: string;
}
```

---

## ⭐ **REVIEWS ENDPOINTS**

### **Review Management**

| Method | Endpoint                         | Auth Required | Parameters                             | Response             |
| ------ | -------------------------------- | ------------- | -------------------------------------- | -------------------- |
| `GET`  | `/reviews/reviewer/{reviewerId}` | ❌ No         | `reviewerId: number, ?page=1&limit=10` | `ReviewListResponse` |

### **Review Attributes**

```typescript
interface Review {
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
```

---

## 🎯 **REASONS ENDPOINTS**

### **Cancellation Reasons**

| Method | Endpoint   | Auth Required | Parameters | Response   |
| ------ | ---------- | ------------- | ---------- | ---------- |
| `GET`  | `/reasons` | ❌ No         | `{}`       | `Reason[]` |

### **Reason Attributes**

```typescript
interface Reason {
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
```

---

## 💬 **CHAT ENDPOINTS**

### **Chat Management**

| Method | Endpoint              | Auth Required | Parameters               | Response       |
| ------ | --------------------- | ------------- | ------------------------ | -------------- |
| `POST` | `/chat/conversations` | ✅ Yes        | `CreateConversationData` | `Conversation` |
| `POST` | `/chat/messages`      | ✅ Yes        | `SendMessageData`        | `Message`      |

### **Chat Data Types**

```typescript
interface CreateConversationData {
  orderId?: number;
  title?: string;
  participantIds: number[];
}

interface SendMessageData {
  conversationId: number;
  content: string;
  messageType?: string;
  metadata?: any;
}
```

---

## 🎯 **HIRING ENDPOINTS**

### **Hiring Management**

| Method | Endpoint               | Auth Required | Parameters                           | Response       |
| ------ | ---------------------- | ------------- | ------------------------------------ | -------------- |
| `POST` | `/hiring/check-status` | ✅ Yes        | `{ specialistId, orderId }`          | `HiringStatus` |
| `POST` | `/hiring`              | ✅ Yes        | `{ specialistId, message, orderId }` | `HiringResult` |

---

## 📁 **MEDIA FILES ENDPOINTS**

### **File Management**

| Method | Endpoint       | Auth Required | Parameters      | Response    |
| ------ | -------------- | ------------- | --------------- | ----------- |
| `POST` | `/media-files` | ❌ No         | `MediaFileData` | `MediaFile` |

### **Media File Attributes**

```typescript
interface MediaFile {
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

interface MediaFileData {
  orderId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
}
```

---

## 👤 **USER SERVICES ENDPOINTS**

### **User Service Management**

| Method   | Endpoint                                             | Auth Required | Parameters                                                    | Response                          |
| -------- | ---------------------------------------------------- | ------------- | ------------------------------------------------------------- | --------------------------------- |
| `GET`    | `/users/{userId}/services`                           | ✅ Yes        | `userId: number`                                              | `{ userServices: UserService[] }` |
| `POST`   | `/users/{userId}/services`                           | ✅ Yes        | `userId: number, { serviceId, notificationsEnabled }`         | `UserService`                     |
| `DELETE` | `/users/{userId}/services/{serviceId}`               | ✅ Yes        | `userId: number, serviceId: number`                           | `{ message }`                     |
| `PATCH`  | `/users/{userId}/services/{serviceId}/notifications` | ✅ Yes        | `userId: number, serviceId: number, { notificationsEnabled }` | `UserService`                     |

### **User Service Attributes**

```typescript
interface UserService {
  id: number;
  userId: number;
  serviceId: number;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  Service: Service;
}
```

---

## 📱 **PHONE VERIFICATION ENDPOINTS**

### **Phone Verification**

| Method | Endpoint                     | Auth Required | Parameters        | Response               |
| ------ | ---------------------------- | ------------- | ----------------- | ---------------------- |
| `POST` | `/phone-verification/send`   | ❌ No         | `{ phone }`       | `{ success, message }` |
| `POST` | `/phone-verification/verify` | ❌ No         | `{ phone, otp }`  | `{ success, message }` |
| `POST` | `/phone-verification/track`  | ❌ No         | `{ phoneNumber }` | `{ success }`          |

---

## 🔄 **COMMON RESPONSE PATTERNS**

### **Pagination Response**

```typescript
interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### **Error Response**

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
```

### **Success Response**

```typescript
interface SuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}
```

---

## 🎯 **USAGE PATTERNS BY SCREEN**

### **Services Screen**

- `getRootServices()` - Main categories
- `getAllServices(page, limit)` - Paginated services
- `getServiceById(id)` - Service details

### **Specialists Screen**

- `getAllSpecialists(page, limit)` - Paginated specialists
- `getSpecialistById(id)` - Specialist details
- `getMyOrders()` - User's orders for hiring logic

### **Orders Screen**

- `getMyOrders()` - User's created orders
- `getMyJobs()` - User's applied jobs
- `getAllOrders()` - All orders (authenticated)
- `getPublicOrders()` - Public orders (non-authenticated)
- `searchOrders(query)` - Search functionality
- `deleteOrder(id)` - Delete order
- `cancelProposal(id)` - Cancel proposal

### **Profile Screen**

- `getUserProfile()` - Current user profile
- `getUserById(id)` - Other user profiles
- `updateUserProfile(data)` - Update profile
- `getReviewsByReviewer(id)` - User's reviews
- `deleteAccount(id, phone)` - Delete account

### **Feedback Dialog**

- `getReasons()` - Cancellation reasons

### **Skills Management**

- `getUserServices(userId)` - User's services
- `addUserService(userId, serviceId, notifications)` - Add service
- `removeUserService(userId, serviceId)` - Remove service
- `updateUserServiceNotifications(userId, serviceId, enabled)` - Update notifications

---

## ⚠️ **IMPORTANT NOTES**

1. **Authentication**: Some endpoints require `Authorization: Bearer {token}` header
2. **Pagination**: Most list endpoints support `page` and `limit` parameters
3. **Language**: Service endpoints support `language` parameter (en, ru, hy)
4. **Error Handling**: All endpoints can return error responses with appropriate status codes
5. **File Uploads**: Media file uploads require proper content-type headers
6. **Real-time**: Chat and hiring endpoints may require WebSocket connections for real-time updates

---

## 🔍 **WHEN MAKING CHANGES**

**Always check this document for:**

- ✅ **All affected endpoints** - Don't miss any API calls
- ✅ **Required parameters** - Ensure all attributes are included
- ✅ **Authentication requirements** - Some endpoints need auth tokens
- ✅ **Response types** - Match expected data structures
- ✅ **Error handling** - Implement proper error states
- ✅ **Loading states** - Show appropriate loading indicators

**This document should be your first reference for any API-related changes!** 📚
