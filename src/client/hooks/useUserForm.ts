import { useState, FormEvent } from "react";
import { api, ApiError } from "../api.js";

interface InviteFormData {
  email: string;
}

interface UseInviteFormReturn {
  formData: InviteFormData;
  setFormData: React.Dispatch<React.SetStateAction<InviteFormData>>;
  error: string | null;
  success: string | null;
  isSubmitting: boolean;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  resetForm: () => void;
}

const initialFormData: InviteFormData = {
  email: "",
};

/**
 * Hook for managing user invite form state and submission
 */
export function useUserForm(): UseInviteFormReturn {
  const [formData, setFormData] = useState<InviteFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await api("/api/users/invite", {
        method: "POST",
        body: formData,
      });

      setSuccess("Invite sent successfully!");
      setFormData(initialFormData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to send invite. Please try again.");
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
