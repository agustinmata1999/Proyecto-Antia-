import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTicketDto {
  category: 'access' | 'payment' | 'telegram_change' | 'other';
  subject: string;
  description: string;
  orderId?: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crear un nuevo ticket de soporte
   */
  async createTicket(userId: string, userEmail: string, data: CreateTicketDto) {
    const ticketId = uuidv4();

    await this.prisma.$runCommandRaw({
      insert: 'support_tickets',
      documents: [{
        _id: ticketId,
        user_id: userId,
        user_email: userEmail,
        order_id: data.orderId || null,
        category: data.category,
        subject: data.subject,
        description: data.description,
        status: 'OPEN',
        priority: 'NORMAL',
        admin_notes: null,
        resolved_at: null,
        created_at: { $date: new Date().toISOString() },
        updated_at: { $date: new Date().toISOString() },
      }],
    });

    this.logger.log(`Created support ticket ${ticketId} for user ${userId}`);

    return {
      success: true,
      ticketId,
      message: 'Ticket creado correctamente. Te responderemos lo antes posible.',
    };
  }

  /**
   * Obtener tickets del usuario
   */
  async getMyTickets(userId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter: { user_id: userId },
      sort: { created_at: -1 },
    }) as any;

    const tickets = result.cursor?.firstBatch || [];

    return tickets.map((ticket: any) => ({
      id: ticket._id,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      orderId: ticket.order_id,
      createdAt: ticket.created_at?.$date || ticket.created_at,
      resolvedAt: ticket.resolved_at?.$date || ticket.resolved_at,
    }));
  }

  /**
   * Obtener detalle de un ticket
   */
  async getTicketDetails(userId: string, ticketId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter: { 
        _id: ticketId,
        user_id: userId,
      },
      limit: 1,
    }) as any;

    const ticket = result.cursor?.firstBatch?.[0];

    if (!ticket) {
      return null;
    }

    return {
      id: ticket._id,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      orderId: ticket.order_id,
      adminNotes: ticket.admin_notes,
      createdAt: ticket.created_at?.$date || ticket.created_at,
      resolvedAt: ticket.resolved_at?.$date || ticket.resolved_at,
    };
  }

  /**
   * Obtener todos los tickets (para admin)
   */
  async getAllTickets(status?: string) {
    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const result = await this.prisma.$runCommandRaw({
      find: 'support_tickets',
      filter,
      sort: { created_at: -1 },
    }) as any;

    const tickets = result.cursor?.firstBatch || [];

    return tickets.map((ticket: any) => ({
      id: ticket._id,
      userId: ticket.user_id,
      userEmail: ticket.user_email,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      orderId: ticket.order_id,
      adminNotes: ticket.admin_notes,
      createdAt: ticket.created_at?.$date || ticket.created_at,
      resolvedAt: ticket.resolved_at?.$date || ticket.resolved_at,
    }));
  }

  /**
   * Actualizar ticket (para admin)
   */
  async updateTicket(ticketId: string, data: {
    status?: string;
    priority?: string;
    adminNotes?: string;
  }) {
    const updateFields: any = {
      updated_at: { $date: new Date().toISOString() },
    };

    if (data.status) {
      updateFields.status = data.status;
      if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
        updateFields.resolved_at = { $date: new Date().toISOString() };
      }
    }
    if (data.priority) updateFields.priority = data.priority;
    if (data.adminNotes !== undefined) updateFields.admin_notes = data.adminNotes;

    await this.prisma.$runCommandRaw({
      update: 'support_tickets',
      updates: [{
        q: { _id: ticketId },
        u: { $set: updateFields },
      }],
    });

    return { success: true, message: 'Ticket actualizado' };
  }
}
