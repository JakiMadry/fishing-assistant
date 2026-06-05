// Tunel localtunnel dla backendu
export const API_BASE = __DEV__
  ? 'https://mental-graduates-museums-kurt.trycloudflare.com/api'
  : 'https://your-production-api.com/api';

export const ENDPOINTS = {
  conditions: `${API_BASE}/conditions`,
  conditionsSpecies: `${API_BASE}/conditions/species`,
  spotsNearby: `${API_BASE}/spots/nearby`,
  spotsSearch: `${API_BASE}/spots/search`,
  spotsEnrich: `${API_BASE}/spots/enrich`,
  spotsUser: `${API_BASE}/spots/user`,
  advisorBait: `${API_BASE}/advisor/bait`,
  advisorCheckConditions: `${API_BASE}/advisor/check-conditions`,
  advisorRegisterPush: `${API_BASE}/advisor/register-push`,
};
