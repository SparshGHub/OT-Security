const getApiUrl = () => {
    // This env var is set by Docker automatically in the docker-compose.yml file.
    // For local development outside Docker, you might need a .env.local file.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    return apiUrl;
}

const getHeaders = (token: string | null) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export const fetchFromApi = async (endpoint: string, token: string | null, options: RequestInit = {}) => {
    const url = `${getApiUrl()}${endpoint}`;
    
    // Server-side rendering is not applicable here since data fetching is client-side.
    // This check is kept for robustness in case of future changes.
    if (typeof window === 'undefined') {
        console.warn(`Skipping API call on server: ${url}`);
        // Return a promise that resolves to a mock response to prevent breaking server components.
        return Promise.resolve({
            processes: [],
            components: [],
            setpoints: [],
            connectivity: [],
            rules: [],
            mitigations: [],
        });
    }

    const response = await fetch(url, {
        ...options,
        headers: getHeaders(token),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'An API error occurred');
    }
    
    if (response.status === 204) {
        return null;
    }

    return response.json();
}
