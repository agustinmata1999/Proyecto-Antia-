import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

/**
 * TelegramHttpService - Direct HTTP calls to Telegram API via proxy
 * Uses multiple CORS proxies with fallback to ensure reliability.
 */
@Injectable()
export class TelegramHttpService {
  private readonly logger = new Logger(TelegramHttpService.name);
  private readonly botToken: string;
  private readonly apiBaseUrl: string = 'https://api.telegram.org';

  // Multiple proxies for redundancy - direct connection first, then proxies
  private readonly useDirectConnection: boolean = true;
  private readonly proxyUrls: string[] = [
    '', // Empty string = direct connection (no proxy)
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
  ];

  private axiosInstance: AxiosInstance;
  private currentProxyIndex: number = 0;
  private consecutiveFailures: number = 0;
  private lastSuccessTime: number = 0;

  constructor(private config: ConfigService) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN') || '';

    // Create axios instance with curl-like headers (required to bypass proxy restrictions)
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'curl/7.88.1',
        Accept: '*/*',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true,
      }),
    });

    this.logger.log(`TelegramHttpService initialized with ${this.proxyUrls.length} proxy(s)`);
  }

  /**
   * Get the current proxy URL
   */
  private getCurrentProxy(): string {
    return this.proxyUrls[this.currentProxyIndex % this.proxyUrls.length];
  }

  /**
   * Rotate to the next proxy
   */
  private rotateProxy(): void {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyUrls.length;
    this.logger.log(`Rotated to proxy: ${this.getCurrentProxy()}`);
  }

  /**
   * Make an API call with retry logic across multiple proxies
   */
  private async callApiWithRetry<T>(
    method: string,
    params: Record<string, any> = {},
    retries: number = 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this.callApiGet<T>(method, params);
        this.consecutiveFailures = 0;
        this.lastSuccessTime = Date.now();
        return result;
      } catch (error) {
        lastError = error;
        this.consecutiveFailures++;
        this.logger.warn(`API call failed (attempt ${attempt + 1}/${retries}): ${error.message}`);

        // If too many failures, try rotating proxy
        if (this.consecutiveFailures >= 2 && this.proxyUrls.length > 1) {
          this.rotateProxy();
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('All retries failed');
  }

  /**
   * Make a direct API call to Telegram via proxy (GET method)
   */
  private async callApiGet<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    // Build query string
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }

    const queryString = queryParams.toString();
    const telegramUrl = `${this.apiBaseUrl}/bot${this.botToken}/${method}${queryString ? '?' + queryString : ''}`;

    // Get current proxy (empty string means direct connection)
    const currentProxy = this.getCurrentProxy();
    const finalUrl = currentProxy
      ? `${currentProxy}${encodeURIComponent(telegramUrl)}`
      : telegramUrl;

    try {
      this.logger.debug(
        `Calling Telegram API: ${method} (${currentProxy ? 'via proxy' : 'direct'})`,
      );
      const response = await this.axiosInstance.get(finalUrl);

      if (!response.data.ok) {
        throw new Error(response.data.description || 'Telegram API error');
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(`Telegram API call failed (${method}):`, error.message);
      throw error;
    }
  }

  /**
   * Main API call method with retry logic
   */
  private async callApi<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    return this.callApiWithRetry<T>(method, params);
  }

  /**
   * Get bot information
   */
  async getMe(): Promise<any> {
    return this.callApi('getMe');
  }

  /**
   * Send a text message
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    options: {
      parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
      replyMarkup?: any;
    } = {},
  ): Promise<any> {
    const params: Record<string, any> = {
      chat_id: chatId,
      text,
    };

    if (options.parseMode) {
      params.parse_mode = options.parseMode;
    }

    if (options.replyMarkup) {
      params.reply_markup = JSON.stringify(options.replyMarkup);
    }

    return this.callApi('sendMessage', params);
  }

  /**
   * Get chat information
   */
  async getChat(chatId: string | number): Promise<any> {
    return this.callApi('getChat', { chat_id: chatId });
  }

  /**
   * Get chat member information
   */
  async getChatMember(chatId: string | number, userId: number): Promise<any> {
    return this.callApi('getChatMember', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  /**
   * Get chat administrators
   */
  async getChatAdministrators(chatId: string | number): Promise<any[]> {
    return this.callApi('getChatAdministrators', { chat_id: chatId });
  }

  /**
   * Export chat invite link
   */
  async exportChatInviteLink(chatId: string | number): Promise<string> {
    return this.callApi('exportChatInviteLink', { chat_id: chatId });
  }

  /**
   * Create a new chat invite link with more options
   */
  async createChatInviteLink(
    chatId: string | number,
    options: {
      name?: string;
      expireDate?: number;
      memberLimit?: number;
      createsJoinRequest?: boolean;
    } = {},
  ): Promise<any> {
    const params: Record<string, any> = { chat_id: chatId };

    if (options.name) params.name = options.name;
    if (options.expireDate) params.expire_date = options.expireDate;
    if (options.memberLimit) params.member_limit = options.memberLimit;
    if (options.createsJoinRequest !== undefined) {
      params.creates_join_request = options.createsJoinRequest;
    }

    return this.callApi('createChatInviteLink', params);
  }

  /**
   * Approve a chat join request
   */
  async approveChatJoinRequest(chatId: string | number, userId: number): Promise<boolean> {
    return this.callApi('approveChatJoinRequest', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  /**
   * Decline a chat join request
   */
  async declineChatJoinRequest(chatId: string | number, userId: number): Promise<boolean> {
    return this.callApi('declineChatJoinRequest', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  /**
   * Ban a chat member
   */
  async banChatMember(
    chatId: string | number,
    userId: number,
    untilDate?: number,
  ): Promise<boolean> {
    const params: Record<string, any> = {
      chat_id: chatId,
      user_id: userId,
    };
    if (untilDate) params.until_date = untilDate;

    return this.callApi('banChatMember', params);
  }

  /**
   * Unban a chat member
   */
  async unbanChatMember(chatId: string | number, userId: number): Promise<boolean> {
    return this.callApi('unbanChatMember', {
      chat_id: chatId,
      user_id: userId,
      only_if_banned: true,
    });
  }

  /**
   * Set webhook URL
   */
  async setWebhook(
    url: string,
    options: {
      allowedUpdates?: string[];
      dropPendingUpdates?: boolean;
      maxConnections?: number;
    } = {},
  ): Promise<boolean> {
    const params: Record<string, any> = { url };

    if (options.allowedUpdates) {
      params.allowed_updates = JSON.stringify(options.allowedUpdates);
    }
    if (options.dropPendingUpdates !== undefined) {
      params.drop_pending_updates = options.dropPendingUpdates;
    }
    if (options.maxConnections) {
      params.max_connections = options.maxConnections;
    }

    return this.callApi('setWebhook', params);
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(dropPendingUpdates: boolean = false): Promise<boolean> {
    return this.callApi('deleteWebhook', { drop_pending_updates: dropPendingUpdates });
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<any> {
    return this.callApi('getWebhookInfo');
  }

  /**
   * Test connection to Telegram API
   */
  async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    try {
      await this.getMe();
      return {
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime,
      };
    }
  }
}
