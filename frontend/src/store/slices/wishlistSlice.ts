import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { extractErrorMessage, wishlistApi } from '../../services/api';
import type { WishlistItem } from '../../types';

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
}

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      return await wishlistApi.getWishlist();
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const addWishlistItem = createAsyncThunk(
  'wishlist/addWishlistItem',
  async (productId: string, { rejectWithValue }) => {
    try {
      return await wishlistApi.addToWishlist(productId);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const removeWishlistItem = createAsyncThunk(
  'wishlist/removeWishlistItem',
  async (productId: string, { rejectWithValue }) => {
    try {
      return await wishlistApi.removeFromWishlist(productId);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlistState: (state) => {
      state.items = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addWishlistItem.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(removeWishlistItem.fulfilled, (state, action) => {
        state.items = action.payload;
      });
  },
});

export const { clearWishlistState } = wishlistSlice.actions;
export default wishlistSlice.reducer;

