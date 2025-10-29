// Base API client configuration and utilities

export interface ApiError {
  error: string;
  message?: string;
}

export class BaseApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Include cookies for session authentication
      ...options,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));

      // Handle authentication errors
      if (response.status === 401) {
        // Redirect to sign-in page on authentication error
        if (typeof window !== "undefined") {
          window.location.href = "/auth/signin";
        }
      }

      throw new Error(errorData.error || "API request failed");
    }

    return response.json();
  }
}
