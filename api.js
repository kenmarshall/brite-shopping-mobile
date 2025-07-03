import axios from 'axios';

const api = axios.create({
  baseURL: 'https://example.com/api', // TODO: update to real backend
});

export const fetchProducts = () => api.get('/products');

export const fetchProductById = (id) => api.get(`/products/${id}`);

export const fetchStores = () => api.get('/stores');

export const addProduct = (product) => api.post('/products', product);

export const addStore = (store) => api.post('/stores', store);

export default api;
