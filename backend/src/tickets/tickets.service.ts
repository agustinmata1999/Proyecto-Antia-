import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../emails/emails.service';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface CreateTicketDto {
  userId: string;
  userEmail: string;
  userType: 'TIPSTER' | 'CLIENT';
  subject: string;
  message: string;
}

export interface TicketResponseDto {
  ticketId: string;
  message: string;
  responderId: string;
  isAdmin: boolean;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create a new support ticket
   */
  async createTicket(dto: CreateTicketDto) {
    const ticketId = this.generateId();
    
    const ticket = {
      id: ticketId,
      user_id: dto.userId,
      user_email: dto.userEmail,
      user_type: dto.userType,
      subject: dto.subject,
      message: dto.message,
      status: 'OPEN' as TicketStatus,
      responses: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.prisma.$runCommandRaw({
      insert: 'support_tickets',
      documents: [ticket],
    });

    // Send confirmation email
    try {
      await this.emailService.sendTicketCreated({
        email: dto.userEmail,
        ticketId: ticketId.slice(-6).toUpperCase(),
        subject: dto.subject,
      });
    } catch (error) {
      this.logger.error('Failed to send ticket created email:', error.message);
    }

    this.logger.log(`Ticket created: ${ticketId} by ${dto.userEmail}`);
    return this.formatTicket(ticket);
  }

  /**
   * Get tickets for a user
   */
  async getTicketsByUser(userId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter: { user_id: userId },
      sort: { created_at: -1 },
      projection: { _id: 0 },
    }) as any;

    const tickets = result.cursor?.firstBatch || [];
    return tickets.map(this.formatTicket);
  }

  /**
   * Get all tickets (admin)
   */
  async getAllTickets(filters: { status?: TicketStatus; userType?: string } = {}) {
    const filter: any = {};
    if (filters.status) filter.status = filters.status;
    if (filters.userType) filter.user_type = filters.userType;

    const result = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter,
      sort: { created_at: -1 },
      projection: { _id: 0 },
    }) as any;

    const tickets = result.cursor?.firstBatch || [];
    return tickets.map(this.formatTicket);
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string, userId?: string) {
    const filter: any = { id: ticketId };
    if (userId) filter.user_id = userId;

    const result = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter,
      limit: 1,
      projection: { _id: 0 },
    }) as any;

    const ticket = result.cursor?.firstBatch?.[0];
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.formatTicket(ticket);
  }

  /**
   * Add response to ticket
   */
  async addResponse(dto: TicketResponseDto) {
    const response = {
      id: this.generateId(),
      message: dto.message,
      responder_id: dto.responderId,
      is_admin: dto.isAdmin,
      created_at: new Date().toISOString(),
    };

    // Get ticket to send email
    const ticketResult = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter: { id: dto.ticketId },
      limit: 1,
      projection: { _id: 0 },
    }) as any;
    const ticket = ticketResult.cursor?.firstBatch?.[0];

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Update ticket with new response
    await this.prisma.$runCommandRaw({
      update: 'support_tickets',
      updates: [{
        q: { id: dto.ticketId },
        u: {
          $push: { responses: response },
          $set: {
            status: dto.isAdmin ? 'IN_PROGRESS' : ticket.status,
            updated_at: new Date().toISOString(),
          },
        },
      }],
    });

    // Send email notification
    try {
      if (dto.isAdmin) {
        // Admin replied - notify user
        await this.emailService.sendTicketReplied({
          email: ticket.user_email,
          ticketId: dto.ticketId.slice(-6).toUpperCase(),
          subject: ticket.subject,
          replyPreview: dto.message.slice(0, 100),
        });
      }
    } catch (error) {
      this.logger.error('Failed to send ticket reply email:', error.message);
    }

    return response;
  }

  /**
   * Update ticket status
   */
  async updateStatus(ticketId: string, status: TicketStatus) {
    const ticketResult = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter: { id: ticketId },
      limit: 1,
      projection: { _id: 0 },
    }) as any;
    const ticket = ticketResult.cursor?.firstBatch?.[0];

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.prisma.$runCommandRaw({
      update: 'support_tickets',
      updates: [{
        q: { id: ticketId },
        u: {
          $set: {
            status,
            updated_at: new Date().toISOString(),
          },
        },
      }],
    });

    // Send closed email if applicable
    if (status === 'CLOSED' || status === 'RESOLVED') {
      try {
        await this.emailService.sendTicketClosed({
          email: ticket.user_email,
          ticketId: ticketId.slice(-6).toUpperCase(),
          subject: ticket.subject,
        });
      } catch (error) {
        this.logger.error('Failed to send ticket closed email:', error.message);
      }
    }

    return { success: true };
  }

  /**
   * Get ticket stats (admin)
   */
  async getStats() {
    const statuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      const result = await this.prisma.$runCommandRaw({
        count: 'support_tickets',
        query: { status },
      }) as any;
      stats[status.toLowerCase()] = result.n || 0;
    }

    const totalResult = await this.prisma.$runCommandRaw({
      count: 'support_tickets',
      query: {},
    }) as any;
    stats.total = totalResult.n || 0;

    return stats;
  }

  private formatTicket(ticket: any) {
    return {
      id: ticket.id,
      userId: ticket.user_id,
      userEmail: ticket.user_email,
      userType: ticket.user_type,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      responses: (ticket.responses || []).map((r: any) => ({
        id: r.id,
        message: r.message,
        responderId: r.responder_id,
        isAdmin: r.is_admin,
        createdAt: r.created_at,
      })),
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}
