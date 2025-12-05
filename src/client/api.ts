type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiOptions extends Omit<RequestInit, "method" | "body"> {
  method?: HttpMethod;
  body?: unknown;
}

/**
 * Wrapper around fetch that automatically handles JSON headers and body stringification
 */
export async function api<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers = {}, ...restOptions } = options;

  // Prepare headers - automatically set Content-Type for JSON if body is provided
  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // If body is provided and not already a string/FormData, stringify it and set Content-Type
  let requestBody: BodyInit | null = null;
  if (body !== undefined) {
    if (body instanceof FormData) {
      requestBody = body;
      // Don't set Content-Type for FormData, browser will set it with boundary
    } else if (typeof body === "string") {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
      requestHeaders["Content-Type"] = "application/json";
    }
  }

  // Add Authorization header if token exists
  // useLocalStorage from usehooks-ts stores values as JSON strings
  const tokenRaw = localStorage.getItem("token");
  if (tokenRaw && tokenRaw !== "null") {
    try {
      const token = JSON.parse(tokenRaw);
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Fallback: if it's not JSON, use as-is (shouldn't happen with useLocalStorage)
      requestHeaders["Authorization"] = `Bearer ${tokenRaw}`;
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    method: options.method || "GET",
    headers: requestHeaders,
    body: requestBody,
  });

  // Parse JSON response
  const data = await response.json();

  // Throw error if response is not ok
  if (!response.ok) {
    throw new ApiError((data as { error?: string }).error || "Request failed", response.status);
  }

  return data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}
