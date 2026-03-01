import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { toast } from "sonner";

type CreateDocumentInput = z.infer<typeof api.documents.create.input>;
type UpdateDocumentInput = z.infer<typeof api.documents.update.input>;

export function useDocuments() {
  return useQuery({
    queryKey: [api.documents.list.path],
    queryFn: async () => {
      const res = await fetch(api.documents.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: [api.documents.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.documents.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Document not found");
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateDocumentInput) => {
      const res = await fetch(api.documents.create.path, {
        method: api.documents.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      toast.success("Documento creado");
    },
    onError: () => {
      toast.error("Error al crear el documento");
    }
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateDocumentInput) => {
      const url = buildUrl(api.documents.update.path, { id });
      const res = await fetch(url, {
        method: api.documents.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update document");
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, variables.id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.documents.delete.path, { id });
      const res = await fetch(url, {
        method: api.documents.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      toast.success("Documento eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar el documento");
    }
  });
}
