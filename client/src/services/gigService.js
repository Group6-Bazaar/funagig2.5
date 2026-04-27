import { fetchApi } from '../lib/api.js';

export const gigService = {
  getGigs: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.businessId) queryParams.append('businessId', filters.businessId);
    if (filters.search) queryParams.append('search', filters.search);
    
    return fetchApi(`/gigs?${queryParams.toString()}`);
  },

  getGigById: async (id) => {
    return fetchApi(`/gigs/${id}`);
  },

  createGig: async (gigData) => {
    return fetchApi('/gigs', {
      method: 'POST',
      body: JSON.stringify(gigData)
    });
  },

  updateGig: async (id, gigData) => {
    return fetchApi(`/gigs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(gigData)
    });
  },

  deleteGig: async (id) => {
    return fetchApi(`/gigs/${id}`, {
      method: 'DELETE'
    });
  }
};
