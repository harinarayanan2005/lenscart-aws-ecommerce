import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  Address,
  AdminDashboardMetrics,
  ApiResponse,
  CartSummary,
  Category,
  InventoryRecord,
  Order,
  OrderStatus,
  Product,
  ProductFilterParams,
  Review,
  UserProfile,
  WishlistItem,
} from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(
  /\/+$/,
  ''
);
export const CLOUDFRONT_MEDIA_URL = (import.meta.env.VITE_CLOUDFRONT_MEDIA_URL || '').replace(
  /\/+$/,
  ''
);

export function resolveMediaAssetUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }
  const clean = pathOrUrl.replace(/^\/+/, '');
  if (CLOUDFRONT_MEDIA_URL) {
    const key = clean.startsWith('media/') ? clean.slice('media/'.length) : clean;
    return `${CLOUDFRONT_MEDIA_URL}/${key}`;
  }
  if (pathOrUrl.startsWith('/media/')) {
    return `${API_BASE_URL}${pathOrUrl}`;
  }
  if (clean.startsWith('product_media/')) {
    return `${API_BASE_URL}/media/${clean}`;
  }
  return pathOrUrl;
}

function transformMediaUrlsInPayload<T>(input: T): T {
  if (!input || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => transformMediaUrlsInPayload(item)) as unknown as T;
  }
  const record = { ...(input as Record<string, unknown>) };
  for (const [k, v] of Object.entries(record)) {
    if ((k === 'image' || k === 'hero_image' || k === 'thumbnail_image') && typeof v === 'string') {
      record[k] = resolveMediaAssetUrl(v);
    } else if (k === 'images' && Array.isArray(v)) {
      record[k] = v.map((img) => (typeof img === 'string' ? resolveMediaAssetUrl(img) : img));
    } else if (v && typeof v === 'object') {
      record[k] = transformMediaUrlsInPayload(v);
    }
  }
  return record as T;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const TOKEN_STORAGE_KEY = 'lenscart_jwt_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'lenscart_refresh_token';
export const USER_STORAGE_KEY = 'lenscart_user_profile';

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use((response) => {
  if (response.data) {
    response.data = transformMediaUrlsInPayload(response.data);
  }
  return response;
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ error?: { message?: string }; detail?: string }>;
    return (
      axiosErr.response?.data?.error?.message ||
      axiosErr.response?.data?.detail ||
      axiosErr.message ||
      'An unexpected network error occurred.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// Auth & Identity API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<
      ApiResponse<{
        access_token: string;
        id_token: string;
        refresh_token?: string;
        user: UserProfile;
      }>
    >('/auth/login', { email, password });
    return data.data;
  },
  register: async (payload: { name: string; email: string; password: string; phone?: string }) => {
    const { data } = await apiClient.post<
      ApiResponse<{
        access_token: string;
        id_token: string;
        refresh_token?: string;
        requires_confirmation?: boolean;
        user: UserProfile;
      }>
    >('/auth/register', payload);
    return data.data;
  },
  confirmSignup: async (payload: { email: string; confirmation_code: string }) => {
    const { data } = await apiClient.post<ApiResponse<{ confirmed: boolean; email: string }>>(
      '/auth/confirm-signup',
      payload
    );
    return data.data;
  },
  refreshSession: async (refreshToken: string) => {
    const { data } = await apiClient.post<
      ApiResponse<{ access_token: string; id_token: string; refresh_token: string }>
    >('/auth/refresh', { refresh_token: refreshToken });
    return data.data;
  },
  logout: async () => {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/auth/logout');
    return data.data;
  },
  requestPasswordReset: async (email: string) => {
    const { data } = await apiClient.post<
      ApiResponse<{ message: string; reset_code_hint?: string }>
    >('/auth/forgot-password', { email });
    return data.data;
  },
  confirmPasswordReset: async (payload: {
    email: string;
    verification_code: string;
    new_password: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/reset-password',
      payload
    );
    return data.data;
  },
  getMe: async () => {
    const { data } = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return data.data;
  },
  getAddresses: async () => {
    const { data } = await apiClient.get<ApiResponse<Address[]>>('/profile/addresses');
    return data.data;
  },
  createAddress: async (payload: Omit<Address, 'address_id' | 'user_id' | 'created_at'>) => {
    const { data } = await apiClient.post<ApiResponse<Address>>('/profile/addresses', payload);
    return data.data;
  },
  deleteAddress: async (addressId: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/profile/addresses/${encodeURIComponent(addressId)}`
    );
    return data.data;
  },
};

// Products & Categories API
export const catalogApi = {
  getProducts: async (params?: ProductFilterParams) => {
    const { data } = await apiClient.get<ApiResponse<Product[]>>('/products', { params });
    return data;
  },
  getProductById: async (productId: string) => {
    const { data } = await apiClient.get<
      ApiResponse<{ product: Product; compatible_products: Product[] }>
    >(`/products/${encodeURIComponent(productId)}`);
    return data.data;
  },
  getCategories: async () => {
    const { data } = await apiClient.get<ApiResponse<Category[]>>('/categories');
    return data.data;
  },
  getCategoryById: async (categoryId: string) => {
    const { data } = await apiClient.get<
      ApiResponse<{ category: Category; products: Product[] }>
    >(`/categories/${encodeURIComponent(categoryId)}`);
    return data.data;
  },
  getCompatibleEquipment: async (productId: string) => {
    const { data } = await apiClient.get<
      ApiResponse<{
        source_product: Product;
        lens_mount: string;
        compatible_lenses: Product[];
        compatible_accessories: Product[];
      }>
    >(`/products/${encodeURIComponent(productId)}/compatibility`);
    return data.data;
  },
  compareProducts: async (productIds: string[]) => {
    const { data } = await apiClient.post<
      ApiResponse<{
        products: Product[];
        spec_keys: string[];
        comparison_matrix: Record<string, Record<string, string | number | boolean>>;
      }>
    >('/products/compare', { product_ids: productIds });
    return data.data;
  },
  getReviews: async (productId: string) => {
    const { data } = await apiClient.get<ApiResponse<Review[]>>(
      `/products/${encodeURIComponent(productId)}/reviews`
    );
    return data.data;
  },
  createReview: async (
    productId: string,
    payload: { rating: number; title: string; comment: string }
  ) => {
    const { data } = await apiClient.post<ApiResponse<Review>>(
      `/products/${encodeURIComponent(productId)}/reviews`,
      payload
    );
    return data.data;
  },
};

// Cart API
export const cartApi = {
  getCart: async () => {
    const { data } = await apiClient.get<ApiResponse<CartSummary>>('/cart');
    return data.data;
  },
  addItem: async (productId: string, quantity: number = 1) => {
    const { data } = await apiClient.post<ApiResponse<CartSummary>>('/cart/items', {
      product_id: productId,
      quantity,
    });
    return data.data;
  },
  updateItem: async (itemId: string, quantity: number) => {
    const { data } = await apiClient.patch<ApiResponse<CartSummary>>(
      `/cart/items/${encodeURIComponent(itemId)}`,
      { quantity }
    );
    return data.data;
  },
  removeItem: async (itemId: string) => {
    const { data } = await apiClient.delete<ApiResponse<CartSummary>>(
      `/cart/items/${encodeURIComponent(itemId)}`
    );
    return data.data;
  },
};

// Wishlist API
export const wishlistApi = {
  getWishlist: async () => {
    const { data } = await apiClient.get<ApiResponse<WishlistItem[]>>('/wishlist');
    return data.data;
  },
  addToWishlist: async (productId: string) => {
    const { data } = await apiClient.post<ApiResponse<WishlistItem[]>>('/wishlist', {
      product_id: productId,
    });
    return data.data;
  },
  removeFromWishlist: async (productId: string) => {
    const { data } = await apiClient.delete<ApiResponse<WishlistItem[]>>(
      `/wishlist/${encodeURIComponent(productId)}`
    );
    return data.data;
  },
};

// Orders API
export const orderApi = {
  createOrder: async (payload: {
    address_id: string;
    payment_method: 'SIMULATED_CARD' | 'SIMULATED_UPI' | 'SIMULATED_NETBANKING';
    idempotency_key: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<Order>>('/orders', payload);
    return data.data;
  },
  getMyOrders: async () => {
    const { data } = await apiClient.get<ApiResponse<Order[]>>('/orders');
    return data.data;
  },
  getOrderById: async (orderId: string) => {
    const { data } = await apiClient.get<ApiResponse<Order>>(
      `/orders/${encodeURIComponent(orderId)}`
    );
    return data.data;
  },
  cancelOrder: async (orderId: string, reason?: string) => {
    const { data } = await apiClient.post<ApiResponse<Order>>(
      `/orders/${encodeURIComponent(orderId)}/cancel`,
      { reason: reason || 'Customer requested cancellation' }
    );
    return data.data;
  },
};

// Admin API
export const adminApi = {
  getDashboard: async () => {
    const { data } = await apiClient.get<ApiResponse<AdminDashboardMetrics>>('/admin/dashboard');
    return data.data;
  },
  createProduct: async (payload: Partial<Product> & { initial_stock?: number }) => {
    const { data } = await apiClient.post<ApiResponse<Product>>('/admin/products', payload);
    return data.data;
  },
  updateProduct: async (productId: string, payload: Partial<Product>) => {
    const { data } = await apiClient.patch<ApiResponse<Product>>(
      `/admin/products/${encodeURIComponent(productId)}`,
      payload
    );
    return data.data;
  },
  deleteProduct: async (productId: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ product_id: string; status: string }>>(
      `/admin/products/${encodeURIComponent(productId)}`
    );
    return data.data;
  },
  getPresignedUploadUrl: async (payload: {
    filename: string;
    content_type: string;
    file_size_bytes: number;
    category_folder?: string;
  }) => {
    const { data } = await apiClient.post<
      ApiResponse<{
        upload_url: string;
        public_asset_url: string;
        delivery_url?: string;
        object_key: string;
        expires_in: number;
      }>
    >('/admin/products/upload-url', payload);
    return data.data;
  },
  deleteProductImage: async (objectKey: string) => {
    const { data } = await apiClient.post<ApiResponse<{ deleted: boolean; object_key: string }>>(
      '/admin/products/delete-image',
      { object_key: objectKey }
    );
    return data.data;
  },
  getOrders: async (params?: { status?: string; search?: string }) => {
    const { data } = await apiClient.get<ApiResponse<Order[]>>('/admin/orders', { params });
    return data.data;
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus, note?: string) => {
    const { data } = await apiClient.patch<ApiResponse<Order>>(
      `/admin/orders/${encodeURIComponent(orderId)}`,
      { status, note }
    );
    return data.data;
  },
  getInventory: async (lowStockOnly?: boolean) => {
    const { data } = await apiClient.get<ApiResponse<InventoryRecord[]>>('/admin/inventory', {
      params: lowStockOnly ? { low_stock_only: true } : undefined,
    });
    return data.data;
  },
  adjustStock: async (
    productId: string,
    payload: { delta: number; reason: string; low_stock_threshold?: number }
  ) => {
    const { data } = await apiClient.post<ApiResponse<InventoryRecord>>(
      `/admin/inventory/${encodeURIComponent(productId)}/adjust`,
      payload
    );
    return data.data;
  },
  getInventoryLogs: async (productId: string) => {
    const { data } = await apiClient.get<ApiResponse<Array<Record<string, unknown>>>>(
      `/admin/inventory/${encodeURIComponent(productId)}/logs`
    );
    return data.data;
  },
  getCustomers: async () => {
    const { data } = await apiClient.get<
      ApiResponse<
        Array<
          UserProfile & {
            order_count: number;
            total_spent: number;
            recent_orders: Order[];
          }
        >
      >
    >('/admin/customers');
    return data.data;
  },
  updateCustomerStatus: async (userId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    const { data } = await apiClient.patch<ApiResponse<UserProfile>>(
      `/admin/customers/${encodeURIComponent(userId)}/status`,
      { status }
    );
    return data.data;
  },
};
