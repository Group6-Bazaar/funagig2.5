export const API_BASE_URL = '/api.php';

const CSRF = {
    token: null,
    tokenPromise: null,
    
    async getToken() {
        if (this.token) return this.token;
        if (this.tokenPromise) return this.tokenPromise;
        
        this.tokenPromise = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/csrf-token`);
                const data = await response.json();
                if (data.success && data.csrf_token) {
                    this.token = data.csrf_token;
                    return this.token;
                }
                return null;
            } catch (error) {
                console.error('Error fetching CSRF token:', error);
                return null;
            } finally {
                this.tokenPromise = null;
            }
        })();
        return this.tokenPromise;
    },
    
    clearToken() {
        this.token = null;
        this.tokenPromise = null;
    }
};

export const apiCall = async (endpoint, options = {}) => {
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    let isJsonPayload = false;
    let fetchOptions = { ...options };
    
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        fetchOptions.body = JSON.stringify(options.body);
        isJsonPayload = true;
    }
    
    const defaultHeaders = {
        'Accept': 'application/json'
    };
    if (isJsonPayload) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') {
        const skipEndpoints = ['/login', '/signup', '/auth/forgot-password', '/auth/reset-password'];
        const shouldSkip = skipEndpoints.some(skip => endpoint.includes(skip));
        
        if (!shouldSkip) {
            const csrfToken = await CSRF.getToken();
            if (csrfToken) {
                defaultHeaders['X-CSRF-Token'] = csrfToken;
            }
        }
    }

    const config = {
        ...fetchOptions,
        headers: {
            ...defaultHeaders,
            ...(fetchOptions.headers || {})
        }
    };

    let response = await fetch(url, config);
    let data;
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        if (response.status === 403 && data.error && data.error.includes('CSRF')) {
            CSRF.clearToken();
            const newToken = await CSRF.getToken();
            if (newToken) {
                config.headers['X-CSRF-Token'] = newToken;
                response = await fetch(url, config);
                try {
                    data = await response.json();
                } catch {
                    data = {};
                }
            }
        }
        
        if (!response.ok) {
            if (response.status === 401 && !url.includes('/login')) {
                // Trigger global logout event on 401 Unauthorized
                window.dispatchEvent(new Event('unauthorized'));
            }

            const error = new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }
    }

    return data;
};

export default {
    get: (endpoint, options) => apiCall(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options) => apiCall(endpoint, { ...options, method: 'POST', body }),
    put: (endpoint, body, options) => apiCall(endpoint, { ...options, method: 'PUT', body }),
    delete: (endpoint, options) => apiCall(endpoint, { ...options, method: 'DELETE' }),
    upload: async (file, type = 'general', options = {}) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        if (options.gigId) formData.append('gig_id', options.gigId);
        if (options.messageId) formData.append('message_id', options.messageId);

        return apiCall('/upload', {
            method: 'POST',
            body: formData
        });
    }
};
