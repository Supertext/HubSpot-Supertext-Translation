import type { Account, Store } from '../store/store.js';
import { HubSpotError, refreshTokens, type OAuthOptions, type Tokens, type TokenSource } from './client.js';

/**
 * Keeps each account's HubSpot access token fresh. Access tokens live 30
 * minutes: one due within a minute is refreshed before the request, and a 401
 * forces a refresh once (HubSpotClient). Refreshes of the same account share
 * one request. If HubSpot refuses the refresh token (the app was uninstalled),
 * the tokens are forgotten and the account has to connect again.
 */
export class TokenManager {
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(
    private readonly store: Store,
    private readonly oauth: OAuthOptions,
    private readonly now: () => number = Date.now,
  ) {}

  /** The token source for one account's HubSpotClient. */
  source(account: Pick<Account, 'accountId'>): TokenSource {
    return {
      accessToken: () => this.accessToken(account.accountId, false),
      refreshed: () => this.accessToken(account.accountId, true),
    };
  }

  private async accessToken(accountId: string, force: boolean): Promise<string> {
    const running = this.inFlight.get(accountId);
    if (running) return running;
    const account = await this.store.getAccount(accountId);
    if (!account?.refreshToken) {
      throw new HubSpotError('HubSpot is not connected.', 'notConnected');
    }
    if (!force && account.accessToken && account.tokenExpiresAt - 60_000 > this.now()) return account.accessToken;
    const refresh = this.refresh(account).finally(() => this.inFlight.delete(accountId));
    this.inFlight.set(accountId, refresh);
    return refresh;
  }

  private async refresh(account: Account): Promise<string> {
    let tokens: Tokens;
    try {
      tokens = await refreshTokens(this.oauth, account.refreshToken);
    } catch (error) {
      if (error instanceof HubSpotError && error.code === 'hubspotAuth') {
        await this.store.saveTokens(account.accountId, null);
        console.warn(`Supertext: HubSpot refused the refresh token of account ${account.accountId}; it has to connect again.`);
      }
      throw error;
    }
    await this.store.saveTokens(account.accountId, tokens);
    return tokens.accessToken;
  }
}
