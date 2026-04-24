import { API_BASE } from "./api.js";

export async function authFetch(url, options = {}) {
  let res = await fetch(url, {
    credentials: "include",
    ...options
  });

  if (res.status !== 401) {
    return { res, sessionExpired: false };
  }

  const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });

  if (!refreshRes.ok) {
    return { res, sessionExpired: true };
  }

  res = await fetch(url, {
    credentials: "include",
    ...options
  });

  return { res, sessionExpired: false };
}