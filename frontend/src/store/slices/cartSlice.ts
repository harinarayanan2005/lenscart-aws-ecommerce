import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { cartApi, extractErrorMessage } from '../../services/api';
import type { CartSummary } from '../../types';

interface CartState {
  summary: CartSummary;
  loading: boolean;
  error: string | null;
}

const emptyCart: CartSummary = {
  user_id: '',
  items: [],
  item_count: 0,
  subtotal: 0,
  discount_total: 0,
  shipping_fee: 0,
  tax_amount: 0,
  final_total: 0,
  has_stock_issues: false,
};

const initialState: CartState = {
  summary: emptyCart,
  loading: false,
  error: null,
};

export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    return await cartApi.getCart();
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async (
    { productId, quantity = 1 }: { productId: string; quantity?: number },
    { rejectWithValue }
  ) => {
    try {
      return await cartApi.addItem(productId, quantity);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateCartItemQuantity',
  async ({ itemId, quantity }: { itemId: string; quantity: number }, { rejectWithValue }) => {
    try {
      return await cartApi.updateItem(itemId, quantity);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const removeCartItem = createAsyncThunk(
  'cart/removeCartItem',
  async (itemId: string, { rejectWithValue }) => {
    try {
      return await cartApi.removeItem(itemId);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCartState: (state) => {
      state.summary = emptyCart;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.error = null;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.error = null;
      })
      .addCase(updateCartItemQuantity.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.error = null;
      });
  },
});

export const { clearCartState } = cartSlice.actions;
export default cartSlice.reducer;

