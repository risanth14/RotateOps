import axios from "axios";
import { env } from "../config/env.js";

export async function sendSlackNotification(input: {
  title: string;
  status: "success" | "failed";
  lines: string[];
}): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) {
    return;
  }

  await axios.post(env.SLACK_WEBHOOK_URL, {
    text: `${input.title} (${input.status.toUpperCase()})`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${input.title} (${input.status.toUpperCase()})`
        }
      },
      ...input.lines.map((line) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: line
        }
      }))
    ]
  });
}
