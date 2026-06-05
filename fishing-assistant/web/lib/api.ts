import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const ENDPOINTS = {
  conditions: '/conditions',
  conditionsSpecies: '/conditions/species',
  spotsNearby: '/spots/nearby',
  spotsSearch: '/spots/search',
  spotsEnrich: '/spots/enrich',
  spotsUser: '/spots/user',
  advisorBait: '/advisor/bait',
};

export default api;
