import { BaseConnector } from "./baseConnector.js";

export class StripeConnector extends BaseConnector {
  constructor() {
    super("stripe", "sk_live");
  }
}
