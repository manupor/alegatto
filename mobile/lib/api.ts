import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers = await getAuthHeaders();
  const config: RequestInit = { method, headers };
  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function uploadFile<T>(path: string, file: { uri: string; name: string; type: string }): Promise<T> {
  const token = await SecureStore.getItemAsync('auth_token');
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Upload failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  org: { id: string; name: string; slug: string; plan: string } | null;
  role: string | null;
}

export interface OrgContext {
  org: { id: string; name: string; slug: string; plan: string } | null;
  role: string | null;
  isAdmin: boolean;
  isSenior: boolean;
  canEdit: boolean;
  canViewAnalytics: boolean;
  canManageTeam: boolean;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: string;
  createdAt: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  meta: {
    materia: string | null;
    riesgo: string | null;
    layerStats: { a: number; b: number; c: number };
    durationMs: number;
    tokensUsed: number;
  };
}

export interface CaseData {
  id: string;
  userId: string;
  orgId: string | null;
  name: string;
  client: string;
  legalArea: string;
  status: string;
  caseNumber: string | null;
  assignedLawyerId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentData {
  id: string;
  userId: string;
  orgId: string | null;
  titulo: string;
  contenidoHtml: string;
  tipo: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppealData {
  id: string;
  userId: string;
  orgId: string | null;
  processType: string;
  caseNumber: string | null;
  resolvingBody: string | null;
  resolutionType: string | null;
  resolutionDate: string | null;
  grievances: any[];
  selectedArticles: any[];
  manualJurisprudence: string | null;
  writingStyle: string | null;
  lawyerName: string | null;
  barNumber: string | null;
  destinationCourt: string | null;
  generatedDocument: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineData {
  id: string;
  caseId: string | null;
  userId: string;
  orgId: string | null;
  description: string;
  dueDate: string;
  status: string;
  createdAt: string;
}

export interface ConversationData {
  id: string;
  userId: string;
  orgId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: MessageData[];
}

export interface MessageData {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  tokensUsed: number;
  createdAt: string;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthUser>('POST', '/api/auth/login', { email, password }),
    logout: () =>
      request<{ message: string }>('POST', '/api/auth/logout'),
    getSession: () =>
      request<AuthUser>('GET', '/api/auth/me'),
  },

  cases: {
    list: () =>
      request<CaseData[]>('GET', '/api/cases'),
    get: (id: string) =>
      request<CaseData>('GET', `/api/cases/${id}`),
    create: (data: Partial<CaseData>) =>
      request<CaseData>('POST', '/api/cases', data),
    update: (id: string, data: Partial<CaseData>) =>
      request<CaseData>('PUT', `/api/cases/${id}`, data),
  },

  documents: {
    list: () =>
      request<DocumentData[]>('GET', '/api/editor/documents'),
    get: (id: string) =>
      request<DocumentData>('GET', `/api/editor/documents/${id}`),
    upload: (file: { uri: string; name: string; type: string }) =>
      uploadFile<{ analysis: any; filename: string }>('/api/analyze-document', file),
    download: (id: string) =>
      request<DocumentData>('GET', `/api/editor/documents/${id}`),
  },

  chat: {
    sendMessage: (prompt: string, conversationId?: string, materias?: string[]) =>
      request<ChatResponse>('POST', '/api/chat', { prompt, conversationId, materias }),
    getConversations: () =>
      request<ConversationData[]>('GET', '/api/conversations'),
    getConversation: (id: string) =>
      request<ConversationData>('GET', `/api/conversations/${id}`),
    deleteConversation: (id: string) =>
      request<void>('DELETE', `/api/conversations/${id}`),
  },

  appeals: {
    create: (data: Partial<AppealData>) =>
      request<AppealData>('POST', '/api/appeals', data),
    list: () =>
      request<AppealData[]>('GET', '/api/appeals'),
    get: (id: string) =>
      request<AppealData>('GET', `/api/appeals/${id}`),
    update: (id: string, data: Partial<AppealData>) =>
      request<AppealData>('PUT', `/api/appeals/${id}`, data),
  },

  deadlines: {
    list: () =>
      request<DeadlineData[]>('GET', '/api/deadlines'),
    create: (data: Partial<DeadlineData>) =>
      request<DeadlineData>('POST', '/api/deadlines', data),
    update: (id: string, data: Partial<DeadlineData>) =>
      request<DeadlineData>('PUT', `/api/deadlines/${id}`, data),
  },

  org: {
    getContext: () =>
      request<OrgContext>('GET', '/api/org/context'),
    getMembers: () =>
      request<OrgMember[]>('GET', '/api/org/members'),
    inviteMember: (email: string, role: string) =>
      request<{ invite: any; inviteLink: string }>('POST', '/api/org/invite', { email, role }),
    register: (name: string, slug: string, plan?: string) =>
      request<{ org: any; role: string }>('POST', '/api/org/register', { name, slug, plan }),
    checkSlug: (slug: string) =>
      request<{ available: boolean }>('GET', `/api/org/slug/${slug}`),
  },
};
