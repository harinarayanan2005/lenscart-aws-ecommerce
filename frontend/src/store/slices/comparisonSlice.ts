import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../types';

const COMPARE_STORAGE_KEY = 'lenscart_compare_products';

function loadSavedCompare(): Product[] {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}

interface ComparisonState {
  comparedProducts: Product[];
}

const initialState: ComparisonState = {
  comparedProducts: loadSavedCompare(),
};

const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    toggleCompareProduct: (state, action: PayloadAction<Product>) => {
      const exists = state.comparedProducts.some(
        (p) => p.product_id === action.payload.product_id
      );
      if (exists) {
        state.comparedProducts = state.comparedProducts.filter(
          (p) => p.product_id !== action.payload.product_id
        );
      } else if (state.comparedProducts.length < 4) {
        state.comparedProducts.push(action.payload);
      }
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(state.comparedProducts));
    },
    removeFromCompare: (state, action: PayloadAction<string>) => {
      state.comparedProducts = state.comparedProducts.filter(
        (p) => p.product_id !== action.payload
      );
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(state.comparedProducts));
    },
    clearComparison: (state) => {
      state.comparedProducts = [];
      localStorage.removeItem(COMPARE_STORAGE_KEY);
    },
  },
});

export const { toggleCompareProduct, removeFromCompare, clearComparison } =
  comparisonSlice.actions;
export default comparisonSlice.reducer;

