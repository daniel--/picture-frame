import { useState, FormEvent } from "react";
import { api, ApiError } from "../api.js";

interface UserFormData {
  name: string;
  email: string;
  password: string;
}

interface UseUserFormReturn {
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  error: string | null;
  success: string | null;
  isSubmitting: boolean;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  resetForm: () => void;
}

const initialFormData: UserFormData = {
  name: "",
  email: "",
  password: "",
};

/**
 * Hook for managing user creation form state and submission
 */
export function useUserForm(): UseUserFormReturn {
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await api("/api/users/create", {
        method: "POST",
        body: formData,
      });

      setSuccess("User created successfully!");
      setFormData(initialFormData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create user. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setError(null);
    setSuccess(null);
  };

  return {
    formData,
    setFormData,
    error,
    success,
    isSubmitting,
    handleSubmit,
    resetForm,
  };
}

