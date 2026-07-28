const BASE_URL = import.meta.env.VITE_API_URL;

function getHeaders(isFormData = false) {
  const token = localStorage.getItem('nextrole_token');
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || data.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  get(path) {
    return fetch(`${BASE_URL}${path}`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  post(path, body) {
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse);
  },

  put(path, body) {
    return fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse);
  },

  delete(path) {
    return fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // For multipart file uploads (resume PDF)
  postForm(path, formData) {
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    }).then(handleResponse);
  },
};
