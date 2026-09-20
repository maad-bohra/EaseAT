/**
 * Single place the browser talks to the API. The token lives in localStorage
 * and is attached here; no API keys ever reach this bundle.
 */
const BASE = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'EaseAT.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, query, isForm } = {}) {
  const url = new URL(`${BASE}/api${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
  }

  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event('EaseAT:signed-out'));
    }
    throw new ApiError(data?.error?.message || 'Something went wrong', response.status, data?.error?.details);
  }
  return data;
}

export const api = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    me: () => request('/auth/me'),
    updateProfile: (body) => request('/auth/me', { method: 'PUT', body }),
    changePassword: (body) => request('/auth/password', { method: 'PUT', body }),
  },
  subjects: {
    list: () => request('/subjects'),
    create: (body) => request('/subjects', { method: 'POST', body }),
    update: (id, body) => request(`/subjects/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
  },
  timetable: {
    list: () => request('/timetable'),
    create: (body) => request('/timetable', { method: 'POST', body }),
    createMany: (entries) => request('/timetable/bulk', { method: 'POST', body: { entries } }),
    update: (id, body) => request(`/timetable/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/timetable/${id}`, { method: 'DELETE' }),
  },
  attendance: {
    list: (query) => request('/attendance', { query }),
    today: () => request('/attendance/today'),
    summary: (query) => request('/attendance/summary', { query }),
    predictions: () => request('/attendance/predictions'),
    prediction: (subjectId, query) => request(`/attendance/${subjectId}/prediction`, { query }),
    mark: (id, body) => request(`/attendance/${id}`, { method: 'PUT', body }),
    bulkMark: (sessionIds, status) => request('/attendance/bulk', { method: 'POST', body: { sessionIds, status } }),
    create: (body) => request('/attendance', { method: 'POST', body }),
    remove: (id) => request(`/attendance/${id}`, { method: 'DELETE' }),
    reschedule: (id, body) => request(`/attendance/${id}/reschedule`, { method: 'POST', body }),
    generate: (from, to) => request('/attendance/generate', { method: 'POST', body: { from, to } }),
  },
  calendar: {
    list: (query) => request('/calendar', { query }),
    month: (year, month) => request('/calendar/month', { query: { year, month } }),
    day: (date) => request('/calendar/day', { query: { date } }),
    create: (body) => request('/calendar', { method: 'POST', body }),
    update: (id, body) => request(`/calendar/${id}`, { method: 'PUT', body }),
    verify: (ids) => request('/calendar/verify', { method: 'POST', body: { ids } }),
    remove: (id) => request(`/calendar/${id}`, { method: 'DELETE' }),
    upload: (file) => {
      const form = new FormData();
      form.append('file', file);
      return request('/calendar/upload', { method: 'POST', body: form, isForm: true });
    },
    uploads: () => request('/calendar/uploads'),
    removeUpload: (id) => request(`/calendar/uploads/${id}`, { method: 'DELETE' }),
  },
  notifications: {
    list: (query) => request('/notifications', { query }),
    refresh: () => request('/notifications/refresh', { method: 'POST' }),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
    remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },
  ai: {
    status: () => request('/ai/status'),
    ask: (question, history) => request('/ai/assistant', { method: 'POST', body: { question, history } }),
    parseTimetable: (text) => request('/ai/timetable/parse', { method: 'POST', body: { text } }),
    confirmTimetable: (entries) => request('/ai/timetable/confirm', { method: 'POST', body: { entries } }),
  },
};
