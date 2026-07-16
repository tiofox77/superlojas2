const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

async function fetchApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    // Surface the backend error message (Laravel returns { message } / { error }
    // and 422 validation errors) instead of a generic status string.
    let message = `API error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.clone().json();
      if (body?.message) {
        message = body.message;
      } else if (body?.error) {
        message = body.error;
      }
      if (body?.errors && typeof body.errors === 'object') {
        const first = Object.values(body.errors as Record<string, string[]>)[0];
        if (Array.isArray(first) && first[0]) message = first[0];
      }
    } catch {
      // response had no JSON body — keep the status-based message
    }
    throw new Error(message);
  }
  return response.json();
}

export default fetchApi;
