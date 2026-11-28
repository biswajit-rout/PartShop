const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "STORE_MANAGER" | "COUNTER_STAFF";
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const authApi = {
  /**
   * Log in cashier using OAuth2 form-data contract.
   * Stores access_token in localStorage upon success.
   */
  async login(username = "cashier1", password = "Password123!"): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Authentication failed");
    }

    const data: LoginResponse = await res.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("partshop_token", data.access_token);
    }
    return data;
  },

  /**
   * Fetch current authenticated cashier or manager profile.
   */
  async getMe(): Promise<UserProfile> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("partshop_token") : null;

    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("partshop_token");
      }
      throw new Error("Failed to retrieve user profile");
    }

    return res.json();
  },

  /**
   * Clear session token on logout.
   */
  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("partshop_token");
    }
  },

  /**
   * Check if a token currently exists.
   */
  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("partshop_token");
    }
    return false;
  },
};
