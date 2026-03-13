/**
 * Product Service — FE API calls for product endpoints
 * Connects to BE /api/v1/products/*
 */
import api from './api';

const productService = {
  /**
   * Get all products with optional filters
   * @param {Object} params - { category, region, type, search, page, limit, sort }
   */
  getAll: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  /**
   * Get a single product by ID
   * @param {string} id - Product MongoDB _id
   */
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  /**
   * Get similar products for a given product
   * @param {string} id - Product MongoDB _id
   * @param {number} limit - Max results (default 4)
   */
  getSimilar: async (id, limit = 4) => {
    const response = await api.get(`/products/${id}/similar`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get products by region (north, central, south)
   * @param {string} region
   */
  getByRegion: async (region) => {
    const response = await api.get(`/products/region/${region}`);
    return response.data;
  },

  /**
   * Create a new product (Farmer only)
   * @param {Object} productData
   */
  create: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  /**
   * Update a product (Owner only)
   * @param {string} id
   * @param {Object} updateData
   */
  update: async (id, updateData) => {
    const response = await api.put(`/products/${id}`, updateData);
    return response.data;
  },

  /**
   * Delete a product (soft delete, Owner only)
   * @param {string} id
   */
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  /**
   * Get current user's products
   */
  getMyProducts: async () => {
    const response = await api.get('/products/my');
    return response.data;
  },

  /**
   * Upload a product image file to the server
   * Uses the dedicated /upload endpoint which saves to disk and returns a URL
   * @param {File} file - File object from input
   * @returns {string} full URL to the uploaded file
   */
  uploadImage: async (file) => {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result?.toString();
        // Strip the "data:image/jpeg;base64," prefix — BE expects raw base64
        resolve(result ? result.split(',')[1] : null);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    if (!base64) throw new Error('Không đọc được file ảnh');
    const response = await api.post('/upload', {
      fileName: file.name,
      fileData: base64,
      fileType: file.type,
    });
    // Return only the server-relative path (e.g. /uploads/filename.ext)
    // so the DB stays portable — full URL is resolved at render time by resolveImageUrl()
    const relativePath = response.data?.data?.url;
    if (!relativePath) throw new Error('Upload không trả về URL');
    return relativePath;
  },

  /**
   * Get reviews for a product
   * @param {string} productId
   */
  getReviews: async (productId) => {
    const response = await api.get(`/products/${productId}/reviews`);
    return response.data;
  },

  /**
   * Add a review for a product (Enterprise only)
   * @param {string} productId
   * @param {{ rating: number, text: string }} reviewData
   */
  addReview: async (productId, reviewData) => {
    const response = await api.post(`/products/${productId}/reviews`, reviewData);
    return response.data;
  },
};

export default productService;

/**
 * Resolve a product image path to a fully qualified URL.
 * - Absolute URLs (http/https) are returned unchanged.
 * - Server-relative paths (/uploads/...) are prefixed with the API server origin.
 * - base64 data URLs are returned unchanged.
 * - Everything else is returned unchanged.
 */
export function resolveImageUrl(image) {
  if (!image) return '/images/products/default.jpg';
  // Already a full URL (old DB records or external images) — use as-is
  if (image.startsWith('http') || image.startsWith('data:')) return image;
  // Server-relative upload path — return as-is; React proxy forwards /uploads/* to BE
  if (image.startsWith('/uploads/')) return image;
  return image;
}
