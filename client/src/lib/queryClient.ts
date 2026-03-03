import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = { message: res.statusText }; }
    if (res.status === 401 && body?.code === "SESSION_REPLACED") {
      window.dispatchEvent(new CustomEvent("session-replaced", { detail: body.message }));
      throw new Error("SESSION_REPLACED");
    }
    throw new Error(`${res.status}: ${body?.message ?? res.statusText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      let body: any;
      try { body = await res.clone().json(); } catch { body = null; }
      if (body?.code === "SESSION_REPLACED") {
        window.dispatchEvent(new CustomEvent("session-replaced", { detail: body.message }));
        throw new Error("SESSION_REPLACED");
      }
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
