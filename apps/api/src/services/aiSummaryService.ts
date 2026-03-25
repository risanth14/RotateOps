import { env } from "../config/env.js";

export async function generateComplianceSummary(input: {
  provider: string;
  integrationName: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  failureReason: string | null;
  newFingerprint: string | null;
}): Promise<string | null> {
  if (!env.ENABLE_AI_SUMMARIES) {
    return null;
  }

  if (!env.OPENAI_API_KEY) {
    return `AI summaries enabled but OPENAI_API_KEY is missing. Rotation for ${input.integrationName} (${input.provider}) finished with status ${input.status}.`;
  }

  const prompt = `Write a concise compliance summary for a credential rotation job.
Integration: ${input.integrationName}
Provider: ${input.provider}
Status: ${input.status}
Started: ${input.startedAt.toISOString()}
Completed: ${input.completedAt?.toISOString() ?? "n/a"}
Failure reason: ${input.failureReason ?? "none"}
New fingerprint: ${input.newFingerprint ?? "n/a"}
Rules:
- 2 short sentences
- Mention verification and revocation safety posture
- Never include raw secrets`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt,
        max_output_tokens: 120
      })
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as { output_text?: string };
    return json.output_text?.trim() || null;
  } catch {
    return null;
  }
}
