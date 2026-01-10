import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const getProducts = () => api.get('/products');
export const createProduct = (data: any) => api.post('/products', data);
export const getTransactions = (params?: any) => api.get('/transactions', { params });
export const createTransaction = (data: any) => api.post('/transactions', data);
export const createSale = (data: any) => api.post('/sales', data);
export const getAlerts = () => api.get('/alerts');
export const getPriceBoards = () => api.get('/price-boards');
export const getPriceBoardItems = (boardId: number) => api.get(`/price-boards/${boardId}/items`);
export const createPriceBoard = (data: any) => api.post('/price-boards', data);
export const addPriceItem = (boardId: number, data: any) => api.post(`/price-boards/${boardId}/items`, data);
export const activatePriceBoard = (boardId: number) => api.post(`/price-boards/${boardId}/activate`);
export const createUnitConversion = (data: any) => api.post('/unit-conversions', data);
export const getStockReport = (boardId?: number, useConversion: boolean = false) =>
    api.get('/reports/stock', { params: { board_id: boardId, use_conversion: useConversion } });

export default api;
