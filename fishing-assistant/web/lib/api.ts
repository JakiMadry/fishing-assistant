import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://fishing-assistant.onrender.com/api';

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
