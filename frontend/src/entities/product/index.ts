export type { Product, ProductDraft } from './model/types';
export { selectProductById, selectProducts, useProductStore } from './model/store';
export { filterProducts } from './lib/filterProducts';
export { getStockStatus, isLowStock } from './lib/stockStatus';
export type { StockStatus } from './lib/stockStatus';
export { ProductCard } from './ui/ProductCard';
