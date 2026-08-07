export async function apiFetch(url: string, options: RequestInit = {}) {
  const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return fetch(url, { ...options, headers });
}
