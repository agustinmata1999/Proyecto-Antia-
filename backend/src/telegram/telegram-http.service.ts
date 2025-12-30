import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

/**
 * TelegramHttpService - Direct HTTP calls to Telegram API via proxy
 * Uses allorigins.win as a CORS proxy to bypass firewall restrictions.
 * This is a reliable fallback when direct connections to api.telegram.org are blocked.
 */
@Injectable()
export class TelegramHttpService {
  private readonly logger = new Logger(TelegramHttpService.name);
  private readonly botToken: string;
  private readonly apiBaseUrl: string = 'https://api.telegram.org';
  private readonly proxyBaseUrl: string = 'https://api.allorigins.win/raw?url=';
  private axiosInstance: AxiosInstance;
  private useProxy: boolean = true; // Always use proxy since direct connection is blocked

  constructor(private config: ConfigService) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN') || '';
    
    // Create axios instance with longer timeout
    this.axiosInstance = axios.create({
      timeout: 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true,
      }),
    });

    this.logger.log(`TelegramHttpService initialized (using proxy: ${this.proxyBaseUrl})`);
  }

  /**
   * Make a direct API call to Telegram via proxy
   * For GET requests (no body needed)
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
    const proxyUrl = `${this.proxyBaseUrl}${encodeURIComponent(telegramUrl)}`;
    
    try {
      this.logger.debug(`Calling Telegram API: ${method}`);
      const response = await this.axiosInstance.get(proxyUrl);

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
   * Make a POST API call to Telegram via proxy
   * For methods that require sending data in body
   */
  private async callApiPost<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    // For POST, we need to use a different approach since allorigins only supports GET
    // We'll convert POST params to GET query params for methods that support it
    return this.callApiGet<T>(method, params);
  }

  /**
   * Alias for callApiGet - main method for API calls
   */
  private async callApi<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    return this.callApiGet<T>(method, params);
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
  async sendMessage(chatId: string | number, text: string, options: {
    parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    replyMarkup?: any;
  } = {}): Promise<any> {
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
  async createChatInviteLink(chatId: string | number, options: {
    name?: string;
    expireDate?: number;
    memberLimit?: number;
    createsJoinRequest?: boolean;
  } = {}): Promise<any> {
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
  async banChatMember(chatId: string | number, userId: number, untilDate?: number): Promise<boolean> {
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
  async setWebhook(url: string, options: {
    allowedUpdates?: string[];
    dropPendingUpdates?: boolean;
    maxConnections?: number;
  } = {}): Promise<boolean> {
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
