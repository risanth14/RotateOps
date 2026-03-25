import { BaseConnector } from "./baseConnector.js";

export class GitHubConnector extends BaseConnector {
  constructor() {
    super("github", "ghp");
  }
}
