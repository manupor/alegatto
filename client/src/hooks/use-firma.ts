import { useMutation, useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { toast } from "sonner";

type EnviarFirmaInput = z.infer<typeof api.firma.enviar.input>;

export function useEnviarFirma() {
  return useMutation({
    mutationFn: async (data: EnviarFirmaInput) => {
      const res = await fetch(api.firma.enviar.path, {
        method: api.firma.enviar.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Error al enviar solicitud de firma");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Solicitud de firma enviada correctamente");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });
}

export function useFirmaStatus(documentId: string) {
  return useQuery({
    queryKey: [api.firma.status.path, documentId],
    queryFn: async () => {
      const url = buildUrl(api.firma.status.path, { documentId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch firma status");
      return res.json();
    },
    enabled: !!documentId,
  });
}
