/**
 * Discourse API helpers - uses Api-Key / Api-Username headers.
 * Used for: sending site PMs, fetching user list & status for banned-user checks.
 */

const DISCOURSE_BASE_URL = process.env.DISCOURSE_BASE_URL || "";
const DISCOURSE_API_KEY = process.env.DISCOURSE_API_KEY || "";
const DISCOURSE_API_USERNAME = process.env.DISCOURSE_API_USERNAME || "system";

function headers(): HeadersInit {
  return {
    "Api-Key": DISCOURSE_API_KEY,
    "Api-Username": DISCOURSE_API_USERNAME,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

export interface DiscourseUser {
  id: number;
  username: string;
  name: string | null;
  avatar_template: string;
  trust_level: number;
  admin: boolean;
  moderator: boolean;
  silenced: boolean; // banned/suspended
  suspended_till?: string | null;
  active: boolean;
}

export interface DiscourseUserDetail extends DiscourseUser {
  email: string;
  external_id?: string;
}

/**
 * Send a private message (site message) to a Discourse user.
 */
export async function sendDiscoursePM(
  toUsername: string,
  title: string,
  raw: string,
  fromUsername: string = DISCOURSE_API_USERNAME
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${DISCOURSE_BASE_URL}/posts.json`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        title,
        raw,
        archetype: "private_message",
        target_usernames: toUsername,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Discourse PM failed: ${res.status} ${text}` };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Get ALL users' basic status in one batched call (for the banned-user checker).
 * Uses /admin/users/list/active.json + /admin/users/list/suspended.json + silenced.
 * Returns a map keyed by external_id (Discourse user id as string).
 */
export async function fetchAllUserStatuses(): Promise<Map<string, {
  externalId: string;
  username: string;
  trustLevel: number;
  admin: boolean;
  moderator: boolean;
  silenced: boolean;
  suspended: boolean;
  suspendedTill: string | null;
  active: boolean;
}>> {
  const map = new Map<string, any>();
  const fetchList = async (url: string) => {
    let page = 1;
    while (true) {
      const res = await fetch(`${DISCOURSE_BASE_URL}${url}?page=${page}`, {
        headers: headers(),
      });
      if (!res.ok) break;
      const data = await res.json();
      const users: any[] = data.users || [];
      if (users.length === 0) break;
      for (const u of users) {
        map.set(String(u.id), {
          externalId: String(u.id),
          username: u.username,
          trustLevel: u.trust_level ?? 0,
          admin: !!u.admin,
          moderator: !!u.moderator,
          silenced: !!u.silenced,
          suspended: false,
          suspendedTill: null,
          active: !!u.active,
        });
      }
      if (users.length < 100) break;
      page++;
      if (page > 50) break; // safety cap
    }
  };

  try {
    await fetchList("/admin/users/list/active.json");
    await fetchList("/admin/users/list/suspended.json").then(async () => {
      // mark suspended
      let page = 1;
      while (true) {
        const res = await fetch(`${DISCOURSE_BASE_URL}/admin/users/list/suspended.json?page=${page}`, { headers: headers() });
        if (!res.ok) break;
        const data = await res.json();
        const users: any[] = data.users || [];
        if (users.length === 0) break;
        for (const u of users) {
          const existing = map.get(String(u.id));
          if (existing) {
            existing.suspended = true;
            existing.suspendedTill = u.suspended_till || null;
          } else {
            map.set(String(u.id), {
              externalId: String(u.id),
              username: u.username,
              trustLevel: u.trust_level ?? 0,
              admin: !!u.admin,
              moderator: !!u.moderator,
              silenced: !!u.silenced,
              suspended: true,
              suspendedTill: u.suspended_till || null,
              active: !!u.active,
            });
          }
        }
        if (users.length < 100) break;
        page++;
        if (page > 50) break;
      }
    });
  } catch (e) {
    console.error("[discourse] fetchAllUserStatuses error:", e);
  }

  return map;
}

/**
 * Get a single user's detail by external_id (Discourse user id).
 */
export async function getUserByExternalId(externalId: string): Promise<DiscourseUserDetail | null> {
  try {
    const res = await fetch(`${DISCOURSE_BASE_URL}/users/by-external/${externalId}.json`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

/**
 * Get trust level + admin status from a user's data.
 */
export async function getUserTrustLevel(externalId: string): Promise<{
  trustLevel: number;
  admin: boolean;
  moderator: boolean;
} | null> {
  const u = await getUserByExternalId(externalId);
  if (!u) return null;
  return {
    trustLevel: u.trust_level ?? 0,
    admin: !!u.admin,
    moderator: !!u.moderator,
  };
}

/**
 * Resolve a full avatar URL from Discourse avatar_template.
 */
export function resolveAvatarUrl(avatarTemplate: string | undefined | null): string | null {
  if (!avatarTemplate) return null;
  const url = avatarTemplate.replace("{size}", "240");
  if (url.startsWith("http")) return url;
  return `${DISCOURSE_BASE_URL}${url}`;
}
