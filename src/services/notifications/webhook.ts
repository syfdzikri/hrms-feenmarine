export interface WebhookPayload {
  type: 'approval_pending' | 'contract_expiring' | 'visa_expired' | 'low_leave_balance' | 'general';
  title: string;
  message: string;
  employeeName?: string;
  department?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const WEBHOOK_URLS_KEY = 'hrms_webhook_urls';

interface WebhookTargets {
  email?: string;
  whatsapp?: string;
  telegram?: string;
}

export const getWebhookTargets = (): WebhookTargets => {
  try {
    const raw = localStorage.getItem(WEBHOOK_URLS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as WebhookTargets;
  } catch {
    return {};
  }
};

const postJson = async (url: string, payload: WebhookPayload) => {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const sendWebhookNotifications = async (payload: WebhookPayload): Promise<void> => {
  const targets = getWebhookTargets();
  const jobs: Promise<unknown>[] = [];
  if (targets.email) jobs.push(postJson(targets.email, payload));
  if (targets.whatsapp) jobs.push(postJson(targets.whatsapp, payload));
  if (targets.telegram) jobs.push(postJson(targets.telegram, payload));
  if (!jobs.length) return;
  await Promise.allSettled(jobs);
};
