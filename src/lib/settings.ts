import { db } from "@/lib/db";

/**
 * System settings helpers - single row with id="default".
 */
export async function getSettings() {
  let settings = await db.systemSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await db.systemSettings.create({ data: { id: "default" } });
  }
  return settings;
}

export async function updateSettings(data: Partial<{
  maxAppsPerUser: number;
  minTrustLevel: number;
  notifyOnSubmit: boolean;
  notifyOnApprove: boolean;
  notifyOnReject: boolean;
  notifyOnFail: boolean;
  sessionTimeoutMin: number;
}>) {
  return db.systemSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
}
