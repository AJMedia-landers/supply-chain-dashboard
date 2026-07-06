export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "user" | "admin" | "super-admin";
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface SignupResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    verification_required: boolean;
  };
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

export interface ProfileResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export interface ApiError {
  success: false;
  message: string;
  data?: {
    email?: string;
    verification_required?: boolean;
  };
  errors?: { field: string; message: string }[];
}
