import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseConnector } from "../src/connectors/baseConnector.js";

const tokenVaultMock = {
  issueToken: vi.fn(),
  introspectToken: vi.fn(),
  revokeToken: vi.fn()
};

vi.mock("../src/services/tokenVault/client.js", () => ({
  getTokenVaultClient: () => tokenVaultMock
}));

class TestVaultConnector extends BaseConnector {
  constructor() {
    super("github", "ghp");
  }
}

const context = {
  integration: {
    id: "integration-1",
    organizationId: "org-1",
    provider: "github",
    name: "GitHub Prod",
    mode: "provider",
    metadata: {
      vaultTokenId: "old-token-id"
    }
  },
  targets: [{ id: "target-1", name: "Runtime Env", kind: "runtime_env" }],
  mode: "provider"
} as const;

describe("rotation flow with token vault integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues, introspects, and revokes provider tokens through Token Vault", async () => {
    const connector = new TestVaultConnector();

    tokenVaultMock.issueToken.mockResolvedValue({
      tokenId: "new-token-id",
      token: "vault_token_value",
      maskedReference: "va****ue"
    });
    tokenVaultMock.introspectToken.mockResolvedValue({
      tokenId: "new-token-id",
      active: true
    });
    tokenVaultMock.revokeToken.mockResolvedValue(undefined);

    const secret = await connector.rotate(context);
    expect(secret.vaultTokenId).toBe("new-token-id");
    expect(tokenVaultMock.issueToken).toHaveBeenCalledWith({
      provider: "github",
      organizationId: "org-1",
      integrationId: "integration-1",
      metadata: {
        integrationName: "GitHub Prod"
      }
    });

    const propagation = await connector.propagate(context, secret);
    expect(propagation.ok).toBe(true);
    expect(tokenVaultMock.introspectToken).toHaveBeenCalledWith("new-token-id");

    const verification = await connector.verify(context, secret);
    expect(verification.ok).toBe(true);

    await connector.revokeOld(context, "old-fingerprint");
    expect(tokenVaultMock.revokeToken).toHaveBeenCalledWith("old-token-id");
  });
});

