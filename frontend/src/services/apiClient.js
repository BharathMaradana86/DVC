// Simple API client with base URL and helpers

export const getApiBaseUrl = () => {
    const fromEnv = import.meta?.env?.VITE_API_BASE_URL;
    return fromEnv || 'http://localhost:8000';
};

export const buildUrl = (path) => {
    const base = getApiBaseUrl().replace(/\/$/, '');
    const p = String(path || '').startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
};

export const xhrUpload = ({ url, formData, onProgress, onAbortRef, headers }) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        if (headers) {
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        }
        xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && typeof onProgress === 'function') {
                const percent = Math.round((evt.loaded / evt.total) * 100);
                onProgress({ loaded: evt.loaded, total: evt.total, percent });
            }
        };
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const json = JSON.parse(xhr.responseText || '{}');
                        resolve(json);
                    } catch {
                        resolve({ ok: true });
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        if (onAbortRef) onAbortRef.current = () => xhr.abort();
        xhr.send(formData);
    });
};


