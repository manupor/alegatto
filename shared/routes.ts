import { z } from 'zod';
import { 
  insertUserSchema, 
  insertConversationSchema, 
  insertDocumentEditorSchema,
  insertMessageSchema,
  insertFirmaRequestSchema,
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: { 200: z.any(), 401: errorSchemas.unauthorized }
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: z.object({ email: z.string().email(), password: z.string(), name: z.string().optional() }),
      responses: { 201: z.any(), 400: errorSchemas.validation }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  chat: {
    message: {
      method: 'POST' as const,
      path: '/api/chat' as const,
      input: z.object({ prompt: z.string(), conversationId: z.string().optional() }),
      responses: { 200: z.object({ response: z.string(), conversationId: z.string() }) }
    },
    searchNormativa: {
      method: 'POST' as const,
      path: '/api/search-normativa' as const,
      input: z.object({ query: z.string(), materias: z.array(z.string()).optional(), topK: z.number().optional() }),
      responses: { 200: z.object({ results: z.array(z.any()) }) }
    }
  },
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations' as const,
      responses: { 200: z.array(z.any()) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:id' as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/conversations/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/editor/documents' as const,
      responses: { 200: z.array(z.any()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/editor/documents' as const,
      input: insertDocumentEditorSchema.pick({ titulo: true, contenidoHtml: true, tipo: true }),
      responses: { 201: z.any(), 400: errorSchemas.validation }
    },
    get: {
      method: 'GET' as const,
      path: '/api/editor/documents/:id' as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/editor/documents/:id' as const,
      input: insertDocumentEditorSchema.partial(),
      responses: { 200: z.any(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/editor/documents/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    },
    versions: {
      list: {
        method: 'GET' as const,
        path: '/api/editor/documents/:id/versions' as const,
        responses: { 200: z.array(z.any()), 404: errorSchemas.notFound }
      },
      restore: {
        method: 'POST' as const,
        path: '/api/editor/documents/:id/versions/:versionId/restore' as const,
        responses: { 200: z.any(), 404: errorSchemas.notFound }
      }
    }
  },
  firma: {
    enviar: {
      method: 'POST' as const,
      path: '/api/firma/enviar' as const,
      input: z.object({ 
        documentId: z.string(), 
        firmantes: z.array(z.object({ nombre: z.string(), email: z.string().email() })),
        pdfBase64: z.string().optional()
      }),
      responses: { 200: z.any(), 400: errorSchemas.validation }
    },
    status: {
      method: 'GET' as const,
      path: '/api/firma/:documentId/status' as const,
      responses: { 200: z.array(z.any()) }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
