export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Calls the portal API. The X-Portal header is required by the server on every change (CSRF protection).
export async function api(path, { method = 'GET', body, keepalive } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      keepalive,
      headers: { 'X-Portal': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Can’t reach the portal. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

// PUTs a file to a signed upload URL, reporting progress as 0..1.
export function uploadFile(target, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', target.url);
    Object.entries(target.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`The upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error('The upload failed. Check your connection and try again.'));
    xhr.send(file);
  });
}
