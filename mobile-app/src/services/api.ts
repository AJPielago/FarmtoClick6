import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Auto-detect the dev machine's IP from Expo DevTools so you never have
 * to hard-code it again.  Works for both `expo start` and `expo start --tunnel`.
 *
 * Resolution order:
 *  1. expoConfig.extra.apiUrl          – explicit override in app.json
 *  2. Expo debuggerHost / hostUri       – auto-detected dev-machine IP
 *  3. fallback to localhost (Android emulator loopback)
 */
function getApiBaseUrl(): string {
  // 1. Explicit override via app.json > expo > extra > apiUrl
  const override = Constants.expoConfig?.extra?.apiUrl;
  if (override) return override;

  // 2. Auto-detect from Expo dev server host (e.g. "10.253.232.130:8081")
  const debuggerHost =
    Constants.expoConfig?.hostUri ??           // SDK 49+
    (Constants as any).manifest?.debuggerHost;  // older SDKs
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0]; // strip the Expo port
    return `http://${ip}:5001`;
  }

  // 3. Fallback
  return 'http://10.0.2.2:5001'; // Android emulator -> host machine
}

const API_BASE_URL = getApiBaseUrl();
console.log('[api] Using API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});


api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Let axios set the correct Content-Type (with boundary) for FormData.
      // In React Native/Expo the FormData implementation may not be an instanceof FormData,
      // so also detect by presence of `append` method.
      const isFormData = (d: any) => {
        if (!d) return false;
        if (typeof FormData !== 'undefined' && d instanceof FormData) return true;
        return typeof d.append === 'function';
      };

      if (isFormData(config.data)) {
        // remove any default JSON content-type so XHR can set the multipart boundary
        if (config.headers) {
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
        }
        try {
          const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
          console.log('[api] Sending FormData to', config.method, fullUrl);
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      console.error('[api] response error:', error.message, error.config?.url);
    } catch (e) {}

    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

export { api, API_BASE_URL };

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (userData: any) =>
    api.post('/api/auth/register', userData),
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/api/products'),
  getById: (id: string) => api.get(`/api/products/${id}`),
  // Farmer product management
  getProducts: () => api.get('/api/farmer/products'),
  // Co-vendors marketplace
  getCovendors: () => api.get('/api/products/covendors'),
  addProduct: (formData: FormData) => api.post('/api/farmer/products', formData),
  updateProduct: (id: string, formData: FormData) => api.put(`/api/farmer/products/${id}`, formData),
  deleteProduct: (id: string) => api.delete(`/api/farmer/products/${id}`),
};

// Farmers API
export const farmersAPI = {
  getAll: () => api.get('/api/farmers'),
  getById: (id: string) => api.get(`/api/farmer/${id}`),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: (userData: any) => api.put('/api/user/profile', userData),
  updateProfileWithFormData: (formData: FormData) => api.put('/api/user/profile', formData),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/api/cart'),
  addToCart: (productId: string, quantity: number) => 
    api.post('/api/cart', { product_id: productId, quantity }),
  updateQuantity: (productId: string, quantity: number) => 
    api.put(`/api/cart/${productId}`, { quantity }),
  removeItem: (productId: string) => api.delete(`/api/cart/${productId}`),
  clearCart: () => api.delete('/api/cart'),
  checkout: (orderData: any) => api.post('/api/orders', orderData),
};

// Orders API
export const ordersAPI = {
  getOrders: () => api.get('/api/orders'),
  getOrderById: (id: string) => api.get(`/api/orders/${id}`),
  createOrder: (orderData: any) => api.post('/api/orders', orderData),
  updateOrderStatus: (id: string, status: string) => 
    api.put(`/api/orders/${id}/status`, { status }),
  getSellerOrders: () => api.get('/api/farmer/orders'),
  updateSellerOrderStatus: (id: string, payload: any) => 
    api.post(`/api/order/${id}/status`, payload),
  getOrderTracking: (id: string) => api.get(`/api/orders/${id}/tracking`),
  getRiderOrders: () => api.get('/api/rider/orders'),
  getRiderDashboard: (period?: string) => api.get('/api/rider/dashboard', { params: { period: period || '7d' } }),
  updateRiderOrderStatus: (id: string, payload: any) => 
    api.post(`/api/rider/orders/${id}/status`, payload),
  assignRider: (id: string, payload: any) => api.post(`/api/orders/${id}/assign-rider`, payload),
  confirmPaymongo: (orderId: string) => api.post('/api/paymongo/confirm', { order_id: orderId }),
  updateOrderLocation: (orderId: string, lat: number, lng: number) =>
    api.post(`/api/orders/${orderId}/location`, { lat, lng }),
};

// DTI Price API
export const dtiAPI = {
  suggestPrice: (name: string, unit?: string, category?: string, audience?: string) =>
    api.get('/api/dti/suggest-price', { params: { name, unit, category, audience } }),
  suggestProductNames: (name: string, limit: number = 10) =>
    api.get('/api/dti/product-suggestions', { params: { name, limit } }),
  getPrices: () => api.get('/api/dti/prices'),
  uploadPdf: (formData: FormData) => api.post('/api/dti/upload-pdf', formData),
  bulkDelete: (recordIds: string[], deleteAll: boolean = false) =>
    api.post('/api/dti/records/bulk-delete', { record_ids: recordIds, delete_all: deleteAll }),
  getTrendableProducts: () => api.get('/api/dti/trendable-products'),
  getTrends: (name: string, days: number = 30) =>
    api.get('/api/dti/trends', { params: { name, days } }),
  getPredictionAccuracy: (name: string) =>
    api.get('/api/dti/prediction-accuracy', { params: { name } }),
  getPublicPredictions: () => api.get('/api/dti/public-predictions'),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: () => api.get('/api/user/notifications'),
  markAsRead: (id: string) => api.post(`/api/user/notifications/${id}/read`),
};

// Riders / Admin riders API
export const ridersAPI = {
  getActive: () => api.get('/api/riders'),
  getAdminRiders: () => api.get('/api/admin/riders'),
  createAdminRider: (payload: any) => api.post('/api/admin/riders', payload),
  updateAdminRider: (id: string, payload: any) => api.put(`/api/admin/riders/${id}`, payload),
  deleteAdminRider: (id: string) => api.delete(`/api/admin/riders/${id}`),
};

// Farmer Verification API
export const verificationAPI = {
  submitVerification: (formData: FormData) => 
    api.post('/api/farmer/verify', formData),
  getVerificationStatus: () => api.get('/api/user/verification-status'),
};

// Admin API
export const adminAPI = {
  // Dashboard stats
  getDashboardStats: () => api.get('/api/admin/dashboard'),
  // Products management
  getProducts: () => api.get('/api/admin/products'),
  deleteProduct: (id: string) => api.delete(`/api/admin/products/${id}`),
  // Farmers management
  getFarmers: () => api.get('/api/admin/farmers'),
  // Orders management
  getOrders: () => api.get('/api/admin/orders'),
  // Verifications management - uses permit_verifications collection
  getVerifications: () => api.get('/api/admin/permit-verifications'),
  getVerificationDetail: (verificationId: string) => 
    api.get(`/api/admin/permit-verifications/${verificationId}`),
  approveVerification: (verificationId: string) => 
    api.put(`/api/admin/permit-verifications/${verificationId}`, { status: 'verified' }),
  rejectVerification: (verificationId: string, reason: string) => 
    api.put(`/api/admin/permit-verifications/${verificationId}`, { status: 'rejected', admin_notes: reason }),
  // Reports
  getReports: (days: number = 30) => api.get(`/api/admin/reports?days=${days}`),
  // Users
  getUsers: () => api.get('/api/admin/users'),
  updateUserRole: (userId: string, role: string) => 
    api.put(`/api/admin/users/${userId}/role`, { role }),
};

// Reviews API
export const reviewsAPI = {
  getProductReviews: (productId: string) => api.get(`/api/products/${productId}/reviews`),
  checkEligibility: (productId: string) => api.get(`/api/products/${productId}/reviews/eligibility`),
  createReview: (productId: string, data: any) => api.post(`/api/products/${productId}/reviews`, data),
  updateReview: (reviewId: string, data: any) => api.put(`/api/reviews/${reviewId}`, data),
  deleteReview: (reviewId: string) => api.delete(`/api/reviews/${reviewId}`),
  // Admin
  getAdminReviews: (params?: any) => api.get('/api/admin/reviews', { params }),
  adminDeleteReview: (reviewId: string) => api.delete(`/api/admin/reviews/${reviewId}`),
};

export default api;