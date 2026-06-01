import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "./useAuth";

// Find-or-create the buyer <-> store conversation, optionally with product
// context, then navigate to it. Powers the "Contact Store" buttons.
export const useStartChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return useCallback(
    async (productId) => {
      if (!user) {
        navigate("/login");
        return;
      }
      try {
        const { data } = await api.post("/conversations/v1", { productId });
        navigate(`/chat/${data.data._id}`);
      } catch (err) {
        console.error("Failed to start chat:", err?.response?.data?.message || err.message);
      }
    },
    [navigate, user]
  );
};
