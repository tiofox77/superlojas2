import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface FollowStatus {
  is_following: boolean;
  followers_count: number;
}

export function useFollowStatus(storeId: string) {
  const { token, isAuthenticated } = useAuth();

  return useQuery<FollowStatus>({
    queryKey: ["follow-status", storeId],
    queryFn: async () => {
      const res = await fetch(`${API}/client/follow/${storeId}/status`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token && isAuthenticated && !!storeId,
    staleTime: 30 * 1000,
  });
}

export function useFollowToggle(storeId: string) {
  const { token } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (action: "follow" | "unfollow") => {
      const res = await fetch(`${API}/client/follow/${storeId}`, {
        method: action === "follow" ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Erro");
      }
      return res.json() as Promise<FollowStatus>;
    },
    onSuccess: (data) => {
      qc.setQueryData(["follow-status", storeId], data);
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
