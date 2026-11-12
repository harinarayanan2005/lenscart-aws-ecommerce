import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { catalogApi, extractErrorMessage } from '../../services/api';
import type { Category, Product, ProductFilterParams } from '../../types';

interface ProductState {
  items: Product[];
  categories: Category[];
  selectedProduct: Product | null;
  compatibleProducts: Product[];
  filters: ProductFilterParams;
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  items: [],
  categories: [],
  selectedProduct: null,
  compatibleProducts: [],
  filters: {
    page: 1,
    page_size: 12,
    sort_by: 'popularity',
  },
  pagination: {
    page: 1,
    page_size: 12,
    total: 0,
    total_pages: 1,
  },
  loading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: ProductFilterParams | undefined, { rejectWithValue }) => {
    try {
      return await catalogApi.getProducts(params);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await catalogApi.getCategories();
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchProductDetail = createAsyncThunk(
  'products/fetchProductDetail',
  async (productId: string, { rejectWithValue }) => {
    try {
      return await catalogApi.getProductById(productId);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ProductFilterParams>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = { page: 1, page_size: 12, sort_by: 'popularity' };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        if (action.payload.meta) {
          state.pagination = {
            page: action.payload.meta.page || 1,
            page_size: action.payload.meta.page_size || 12,
            total: action.payload.meta.total || action.payload.data.length,
            total_pages: action.payload.meta.total_pages || 1,
          };
        }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(fetchProductDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload.product;
        state.compatibleProducts = action.payload.compatible_products || [];
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, resetFilters } = productSlice.actions;
export default productSlice.reducer;

