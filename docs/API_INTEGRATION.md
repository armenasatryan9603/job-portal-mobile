# API Integration Guide

This document explains how the mobile app integrates with the backend API for services data.

## Overview

The mobile app now fetches real service data from the backend API instead of using dummy data. This provides:

- Real-time service information
- Dynamic pricing and specialist counts
- Proper service hierarchy (parent/child relationships)
- Features and technologies lists
- Performance metrics

## Architecture

### API Service Layer (`/services/api.ts`)

- Centralized API communication
- TypeScript interfaces matching backend responses
- Error handling and request configuration
- Singleton pattern for consistent usage

### Configuration (`/config/api.ts`)

- Environment-based API URL configuration
- Timeout and retry settings
- Development vs Production endpoints

## Key Features

### Services Index Screen (`/app/services/index.tsx`)

- Fetches root services and all services on load
- Real-time search and filtering
- Loading states with spinner
- Error handling with retry functionality
- Dynamic specialist counts and pricing

### Service Detail Screen (`/app/services/[id].tsx`)

- Fetches individual service details by ID
- Displays features, technologies, and sub-services
- Loading and error states
- Navigation to related services

### Specialists Index Screen (`/app/specialists/index.tsx`)

- Fetches all specialist profiles from backend
- Real-time search and filtering by service and price
- Dynamic service filter options from actual data
- Loading states with spinner
- Error handling with retry functionality

### Specialist Detail Screen (`/app/specialists/[id].tsx`)

- Fetches individual specialist profile by ID
- Displays user information, service details, and contact info
- Shows verification status and experience
- Loading and error states
- Hire and message functionality

### Profile Main Screen (`/app/profile/profile.tsx`)

- Fetches authenticated user's profile from backend
- Displays user information, contact details, and account status
- Shows credit balance and verification status
- **Reviews section** showing all reviews given by the user
- Real-time data from PostgreSQL database
- Loading and error states with retry functionality
- Empty state handling for users with no reviews

### Profile Edit Screen (`/app/profile/edit.tsx`)

- Fetches current user profile for editing
- Complete user edit flow with form validation
- Updates name, phone, and bio fields
- Save functionality with loading states
- Error handling with user feedback

## Data Structure

The app now uses the following data structure from the backend:

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
  specialistCount: number; // computed
  recentOrders: number; // computed
  Children?: Service[]; // sub-services
}

interface SpecialistProfile {
  id: number;
  userId: number;
  serviceId?: number;
  experienceYears?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  User: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    verified: boolean;
    createdAt: string;
  };
  Service?: Service; // associated service
  _count?: {
    Proposals: number; // proposals sent
  };
}

interface UserProfile {
  id: number;
  role: string; // user role (client, specialist, admin)
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  creditBalance: number; // user's credit balance
  verified: boolean; // account verification status
  createdAt: string; // account creation date
}

interface Review {
  id: number;
  orderId: number;
  reviewerId: number; // user who wrote the review
  specialistId?: number; // specialist being reviewed
  rating: number; // 1-5 star rating
  comment?: string; // review text
  createdAt: string; // review date
  Order: {
    // associated order details
    id: number;
    title?: string;
    description?: string;
    budget?: number;
    status: string;
    Service?: Service; // service that was reviewed
  };
  Reviewer: {
    // user who wrote the review
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}
```

## API Endpoints Used

- `GET /services/root` - Fetch main service categories
- `GET /services` - Fetch all services with pagination
- `GET /services/:id` - Fetch specific service details
- `GET /services/search?q=query` - Search services
- `GET /users/specialists` - Fetch all specialist profiles with pagination
- `GET /users/specialists/:id` - Fetch specific specialist profile details
- `GET /users/specialists/service/:serviceId` - Fetch specialists by service
- `GET /users/specialists/search?q=query` - Search specialist profiles
- `GET /auth/profile` - Fetch authenticated user's profile
- `PUT /auth/profile` - Update authenticated user's profile
- `GET /users/:id` - Fetch specific user profile by ID
- `PATCH /auth/profile/password` - Update user password
- `GET /reviews` - Fetch all reviews with pagination
- `GET /reviews/reviewer/:reviewerId` - Fetch reviews by reviewer (user)
- `GET /reviews/specialist/:specialistId` - Fetch reviews for a specialist
- `GET /reviews/:id` - Fetch specific review details

## Error Handling

The app includes comprehensive error handling:

- Network connection errors
- API server errors
- Invalid service IDs
- Timeout handling
- User-friendly error messages with retry options

## Configuration

### Development

- API URL: `http://localhost:8080`
- Backend should be running on port 8080

### Production

- Update `API_CONFIG.BASE_URL` in `/config/api.ts`
- Ensure CORS is properly configured on backend

## Testing

To test the integration:

1. Start the backend server:

   ```bash
   cd backend && npm run start:dev
   ```

2. Start the mobile app:

   ```bash
   cd job-portal-mobile && npm start
   ```

3. Navigate to Services screen and verify:
   - Services load from API
   - Search functionality works
   - Service details display correctly
   - Error states work when backend is offline

## Troubleshooting

### Common Issues

1. **"Failed to load services"**

   - Ensure backend is running on correct port
   - Check network connectivity
   - Verify API endpoints are accessible

2. **Empty services list**

   - Check if services are seeded in database
   - Verify API response format
   - Check console for API errors

3. **Loading states stuck**
   - Check for JavaScript errors in console
   - Verify API timeout settings
   - Ensure proper error handling

### Debug Tips

- Use React Native Debugger to inspect API calls
- Check backend logs for API request errors
- Verify network requests in dev tools
- Test API endpoints directly with curl/Postman

## Future Enhancements

Potential improvements:

- Caching with AsyncStorage
- Offline support
- Pull-to-refresh functionality
- Pagination for large service lists
- Image support for services
- Real-time updates with WebSocket
