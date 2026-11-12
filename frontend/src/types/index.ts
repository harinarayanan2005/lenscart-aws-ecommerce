export type UserRole = 'Customer' | 'Admin';

export interface UserProfile {
  sub: string;
  email: string;
  name: string;
  phone?: string;
  roles: UserRole[];
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export type CategorySlug =
  | 'cameras'
  | 'lenses'
  | 'tripods'
  | 'lighting'
  | 'audio'
  | 'accessories'
  | 'storage'
  | 'bags';

export interface Category {
  category_id: string;
  slug: CategorySlug;
  name: string;
  description: string;
  hero_image: string;
  sort_order: number;
  product_count: number;
  spec_fields: string[];
}

export type LensMount =
  | 'Sony E'
  | 'Canon RF'
  | 'Nikon Z'
  | 'Fujifilm X'
  | 'L-Mount'
  | 'Micro Four Thirds'
  | 'Universal';

export interface ProductSpecifications {
  // Cameras
  sensor_type?: string;
  megapixels?: number;
  lens_mount?: LensMount | string;
  iso_range?: string;
  max_video_resolution?: string;
  autofocus_points?: number;
  in_body_stabilization?: boolean;
  weather_sealed?: boolean;
  continuous_shooting_fps?: number;
  // Lenses
  focal_length_mm?: string;
  focal_type?: 'Prime' | 'Zoom';
  max_aperture?: string;
  min_aperture?: string;
  optical_stabilization?: boolean;
  filter_thread_mm?: number;
  min_focus_distance_cm?: number;
  full_frame_compatible?: boolean;
  // Tripods & Stabilizers
  equipment_type?: string;
  material?: string;
  max_payload_kg?: number;
  max_height_cm?: number;
  folded_length_cm?: number;
  head_type?: string;
  quick_release_plate?: string;
  // Lighting
  light_type?: string;
  power_output_watts?: number;
  color_temperature_kelvin?: string;
  cri_rating?: number;
  tlci_rating?: number;
  mount_type?: string;
  battery_option?: string;
  // Audio
  microphone_type?: string;
  polar_pattern?: string;
  frequency_response?: string;
  connectivity?: string;
  // Storage
  card_type?: string;
  capacity_gb?: number;
  read_speed_mbps?: number;
  write_speed_mbps?: number;
  video_speed_class?: string;
  // Bags & Accessories
  compatible_mounts?: string[];
  interior_dimensions_cm?: string;
  laptop_compartment_inch?: number;
  // Common
  weight_grams?: number;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  category_id: string;
  category_slug: CategorySlug;
  category_name: string;
  short_description: string;
  description: string;
  price: number;
  discount_percent: number;
  final_price: number;
  images: string[];
  specifications: ProductSpecifications;
  warranty_info: string;
  in_the_box: string[];
  compatible_product_ids: string[];
  lens_mount?: LensMount | string;
  rating_avg: number;
  review_count: number;
  popularity_score: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  catalog_status: 'ACTIVE' | 'INACTIVE';
  available_qty: number;
  low_stock_threshold: number;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFilterParams {
  q?: string;
  category_id?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  lens_mount?: string;
  in_stock_only?: boolean;
  featured?: boolean;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  on_sale?: boolean;
  sort_by?: 'popularity' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page?: number;
  page_size?: number;
}

export interface CartItem {
  item_id: string;
  product_id: string;
  name: string;
  brand: string;
  image: string;
  category_name: string;
  unit_price: number;
  discount_percent: number;
  final_unit_price: number;
  quantity: number;
  line_subtotal: number;
  line_discount: number;
  line_total: number;
  available_qty: number;
  in_stock: boolean;
  stock_warning?: string;
}

export interface CartSummary {
  user_id: string;
  items: CartItem[];
  item_count: number;
  subtotal: number;
  discount_total: number;
  shipping_fee: number;
  tax_amount: number;
  final_total: number;
  has_stock_issues: boolean;
}

export interface WishlistItem {
  product_id: string;
  added_at: string;
  product: Product;
}

export interface Address {
  address_id: string;
  user_id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
  actor: string;
}

export interface OrderItem {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  image: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  final_unit_price: number;
  line_total: number;
}

export interface Order {
  order_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  items: OrderItem[];
  shipping_address: Address;
  subtotal: number;
  discount_total: number;
  shipping_fee: number;
  tax_amount: number;
  final_total: number;
  order_status: OrderStatus;
  payment_method: 'SIMULATED_CARD' | 'SIMULATED_UPI' | 'SIMULATED_NETBANKING';
  payment_status: 'PAID_SIMULATED' | 'REFUNDED_SIMULATED' | 'PENDING';
  payment_reference: string;
  timeline: OrderTimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface Review {
  review_id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
}

export interface InventoryRecord {
  product_id: string;
  sku: string;
  product_name: string;
  brand: string;
  category_name: string;
  available_qty: number;
  reserved_qty: number;
  low_stock_threshold: number;
  stock_alert_status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  updated_at: string;
  recent_logs?: InventoryLogEntry[];
}

export interface InventoryLogEntry {
  log_id: string;
  product_id: string;
  delta: number;
  previous_qty: number;
  new_qty: number;
  reason: string;
  actor: string;
  timestamp: string;
}

export interface AdminDashboardMetrics {
  total_orders: number;
  total_products: number;
  total_customers: number;
  total_revenue: number;
  pending_orders_count: number;
  low_stock_count: number;
  recent_orders: Order[];
  low_stock_products: InventoryRecord[];
  popular_products: Product[];
  daily_sales: Array<{ date: string; revenue: number; orders: number }>;
  monthly_sales: Array<{ month: string; revenue: number; orders: number }>;
  category_performance: Array<{ category: string; revenue: number; units_sold: number; share_percent: number }>;
  order_status_breakdown: Record<string, number>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    page_size?: number;
    total?: number;
    total_pages?: number;
    request_id?: string;
  };
}

