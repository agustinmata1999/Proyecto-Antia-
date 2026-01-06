import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin - Sales')
@Controller('admin/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@ApiBearerAuth()
export class AdminSalesController {
  private readonly logger = new Logger(AdminSalesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all sales/orders with filters' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'tipsterId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentProvider', required: false })
  @ApiQuery({ name: 'country', required: false })
  async getAllSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tipsterId') tipsterId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('paymentProvider') paymentProvider?: string,
    @Query('country') country?: string,
  ) {
    try {
      // Build filter
      const filter: any = {
        status: { $in: ['PAGADA', 'PAGADA_SIN_ACCESO', 'ACCESS_GRANTED', 'REFUNDED', 'PENDIENTE'] },
      };

      if (startDate) {
        filter.created_at = {
          ...filter.created_at,
          $gte: { $date: new Date(startDate).toISOString() },
        };
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.created_at = { ...filter.created_at, $lte: { $date: endDateObj.toISOString() } };
      }
      if (tipsterId) {
        filter.tipster_id = tipsterId;
      }
      if (productId) {
        filter.product_id = productId;
      }
      if (status) {
        filter.status = status;
      }
      if (paymentProvider) {
        filter.payment_provider = paymentProvider;
      }
      if (country) {
        filter.client_country = country;
      }

      // Get orders
      const ordersResult = (await this.prisma.$runCommandRaw({
        find: 'orders',
        filter,
        sort: { created_at: -1 },
        limit: 500,
      })) as any;

      const orders = ordersResult.cursor?.firstBatch || [];

      // Get unique tipster IDs and product IDs
      const tipsterIds = [...new Set(orders.map((o: any) => o.tipster_id).filter(Boolean))];
      const productIds = [...new Set(orders.map((o: any) => o.product_id).filter(Boolean))];

      // Fetch tipsters
      const tipstersMap: Record<string, string> = {};
      if (tipsterIds.length > 0) {
        const tipstersResult = (await this.prisma.$runCommandRaw({
          find: 'tipster_profiles',
          filter: { _id: { $in: tipsterIds.map((id: string) => ({ $oid: id })) } },
          projection: { public_name: 1 },
        })) as any;
        const tipsters = tipstersResult.cursor?.firstBatch || [];
        tipsters.forEach((t: any) => {
          const id = t._id.$oid || t._id;
          tipstersMap[id] = t.public_name;
        });
      }

      // Fetch products
      const productsMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const productsResult = (await this.prisma.$runCommandRaw({
          find: 'products',
          filter: { _id: { $in: productIds.map((id: string) => ({ $oid: id })) } },
          projection: { title: 1 },
        })) as any;
        const products = productsResult.cursor?.firstBatch || [];
        products.forEach((p: any) => {
          const id = p._id.$oid || p._id;
          productsMap[id] = p.title;
        });
      }

      // Calculate stats
      let totalGrossCents = 0;
      let totalPlatformFeeCents = 0;
      let totalNetCents = 0;

      // Map orders to sales with commission info
      const sales = orders.map((order: any) => {
        const grossAmount = order.amount_cents || 0;
        const platformFeePercent = order.platform_fee_percent || 10;
        const platformFee = Math.round(grossAmount * (platformFeePercent / 100));
        const netAmount = grossAmount - platformFee;

        totalGrossCents += grossAmount;
        totalPlatformFeeCents += platformFee;
        totalNetCents += netAmount;

        return {
          id: order._id.$oid || order._id,
          clientEmail: order.client_email || order.guest_email,
          clientTelegramId: order.client_telegram_id,
          productTitle: productsMap[order.product_id] || 'Producto',
          productId: order.product_id,
          tipsterName: tipstersMap[order.tipster_id] || 'Tipster',
          tipsterId: order.tipster_id,
          amountCents: order.amount_cents,
          currency: order.currency || 'EUR',
          status: order.status,
          paymentProvider: order.payment_provider,
          paymentMethod: order.payment_method,
          country: order.client_country,
          createdAt: order.created_at?.$date || order.created_at,
          // Commission details (admin only)
          grossAmountCents: grossAmount,
          platformFeeCents: platformFee,
          netAmountCents: netAmount,
          platformFeePercent,
        };
      });

      return {
        sales,
        stats: {
          totalSales: sales.length,
          totalGrossCents,
          totalPlatformFeeCents,
          totalNetCents,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching sales:', error);
      return {
        sales: [],
        stats: { totalSales: 0, totalGrossCents: 0, totalPlatformFeeCents: 0, totalNetCents: 0 },
      };
    }
  }
}
