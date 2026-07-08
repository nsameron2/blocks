import { invoke } from "@tauri-apps/api/core";
import type { Block, CompletionTone } from "./types";

type NotificationPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "promptWithRationale";

interface NotificationPermission {
  state: NotificationPermissionState;
  canNotify: boolean;
}

interface SystemNotification {
  title?: string;
  body: string;
}

let permissionRequest: Promise<boolean> | null = null;

export async function sendBlockCompletionNotification(
  block: Block,
  tone: CompletionTone,
) {
  if (!isTauriRuntime()) return;

  const canNotify = await ensureNotificationPermission();
  if (!canNotify) return;

  await sendSystemNotification({
    title: "Block complete",
    body: blockCompletionBody(block, tone),
  });
}

export async function sendTimerCompletionNotification() {
  if (!isTauriRuntime()) return;

  const canNotify = await ensureNotificationPermission();
  if (!canNotify) return;

  await sendSystemNotification({
    title: "Timer complete",
    body: "Time to log off!",
  });
}

export async function notificationPermissionState() {
  if (!isTauriRuntime()) {
    return {
      state: "denied",
      canNotify: false,
    } satisfies NotificationPermission;
  }

  return invoke<NotificationPermission>("notification_permission_state");
}

export async function requestNotificationPermission() {
  if (!isTauriRuntime()) {
    return {
      state: "denied",
      canNotify: false,
    } satisfies NotificationPermission;
  }

  return invoke<NotificationPermission>("request_notification_permission");
}

export async function sendSystemNotification(notification: SystemNotification) {
  if (!isTauriRuntime()) return;
  await invoke("send_system_notification", { notification });
}

async function ensureNotificationPermission() {
  if (!permissionRequest) {
    permissionRequest = resolveNotificationPermission().finally(() => {
      permissionRequest = null;
    });
  }

  return permissionRequest;
}

async function resolveNotificationPermission() {
  const permission = await notificationPermissionState();
  if (permission.canNotify) return true;
  if (permission.state === "denied") return false;

  const requestedPermission = await requestNotificationPermission();
  return requestedPermission.canNotify;
}

function blockCompletionBody(block: Block, tone: CompletionTone) {
  const name = block.name.trim() || "Block";
  const label = tone === "good" ? "Good block" : tone === "bad" ? "Bad block" : "Block";
  return `${block.emoji} ${label} finished: ${name}`;
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
