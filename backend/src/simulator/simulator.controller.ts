import { Controller, Get, Post, Query, Body, Res, Req, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectId } from 'mongodb';

/**
 * SIMULADOR DE CASA DE APUESTAS
 *
 * Este controlador simula el comportamiento de una casa de apuestas real para testing.
 * Permite probar el flujo completo de tracking de afiliados:
 *
 * 1. Usuario hace clic en link de afiliado → Landing de Antía
 * 2. Landing redirige a casa con subid → Este simulador
 * 3. Usuario se "registra" en el simulador
 * 4. Simulador envía postback a Antía → Conversión registrada
 *
 * URLs del simulador:
 * - Landing: /api/simulator/landing?subid=xxx
 * - Registro: /api/simulator/register (POST)
 * - Estado: /api/simulator/status
 * - Historial: /api/simulator/history
 */
@Controller('simulator')
export class SimulatorController {
  private readonly logger = new Logger('BettingHouseSimulator');

  // In-memory storage for simulation (in production this would be a database)
  private simulatedUsers: Map<
    string,
    {
      id: string;
      email: string;
      subid: string;
      registeredAt: Date;
      hasDeposited: boolean;
      depositAmount?: number;
      postbackSent: boolean;
    }
  > = new Map();

  private clickHistory: Array<{
    subid: string;
    timestamp: Date;
    userAgent?: string;
    ip?: string;
  }> = [];

  constructor(private prisma: PrismaService) {}

  /**
   * Landing page del simulador - simula la página de registro de una casa de apuestas
   * El usuario llega aquí después de hacer clic en un link de afiliado
   */
  @Public()
  @Get('landing')
  async simulatorLanding(
    @Query('subid') subid: string,
    @Query('affiliate') affiliate: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`🎰 [SIMULATOR] User arrived with subid=${subid}, affiliate=${affiliate}`);

    // Record the click
    this.clickHistory.push({
      subid: subid || 'unknown',
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Render a simple registration form
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎰 Simulador Casa de Apuestas - TestBet</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            font-size: 2.5rem;
            color: #e63946;
        }
        .logo p {
            color: #666;
            margin-top: 5px;
        }
        .tracking-info {
            background: #f8f9fa;
            border: 1px dashed #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 25px;
        }
        .tracking-info h3 {
            color: #495057;
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
        .tracking-info code {
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            color: #d63384;
            word-break: break-all;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            color: #495057;
            font-weight: 500;
            margin-bottom: 8px;
        }
        input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        input:focus {
            outline: none;
            border-color: #e63946;
        }
        .btn {
            width: 100%;
            padding: 14px;
            background: #e63946;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #c1121f;
        }
        .note {
            text-align: center;
            margin-top: 20px;
            color: #6c757d;
            font-size: 0.85rem;
        }
        .badge {
            display: inline-block;
            background: #ffc107;
            color: #000;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <span class="badge">🧪 MODO SIMULACIÓN</span>
            <h1>🎰 TestBet</h1>
            <p>Simulador de Casa de Apuestas</p>
        </div>
        
        <div class="tracking-info">
            <h3>📊 Datos de Tracking Recibidos:</h3>
            <p><strong>SubID:</strong> <code>${subid || 'No recibido'}</code></p>
            <p><strong>Affiliate:</strong> <code>${affiliate || 'antia'}</code></p>
            <p><strong>Timestamp:</strong> <code>${new Date().toISOString()}</code></p>
        </div>
        
        <form action="/api/simulator/register" method="POST">
            <input type="hidden" name="subid" value="${subid || ''}">
            <input type="hidden" name="affiliate" value="${affiliate || 'antia'}">
            
            <div class="form-group">
                <label for="email">📧 Email</label>
                <input type="email" id="email" name="email" placeholder="tu@email.com" required>
            </div>
            
            <div class="form-group">
                <label for="username">👤 Nombre de usuario</label>
                <input type="text" id="username" name="username" placeholder="Usuario123" required>
            </div>
            
            <button type="submit" class="btn">
                ✅ Simular Registro
            </button>
        </form>
        
        <p class="note">
            Este es un simulador para testing. Al registrarte, se enviará<br>
            un postback automático a Antía con tu subid.
        </p>
    </div>
</body>
</html>
    `;

    res.type('html').send(html);
  }

  /**
   * Procesa el "registro" del usuario y envía postback a Antía
   */
  @Public()
  @Post('register')
  async simulateRegistration(
    @Body() body: { email: string; username: string; subid: string; affiliate?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { email, username, subid, affiliate } = body;

    this.logger.log(`🎰 [SIMULATOR] Registration: email=${email}, subid=${subid}`);

    // Create simulated user
    const userId = new ObjectId().toHexString();
    const user = {
      id: userId,
      email,
      subid: subid || '',
      registeredAt: new Date(),
      hasDeposited: false,
      postbackSent: false,
    };

    this.simulatedUsers.set(userId, user);

    // Send postback to Antía
    let postbackResult = { success: false, error: 'No subid provided' };

    if (subid) {
      try {
        // Send postback for REGISTRATION event
        const postbackUrl = `http://localhost:8001/api/r/postback`;
        const postbackData = {
          subid: subid,
          house: 'simulator',
          event: 'REGISTRATION',
          txid: userId,
        };

        this.logger.log(`📤 [SIMULATOR] Sending postback to ${postbackUrl}`);
        this.logger.log(`📤 [SIMULATOR] Postback data: ${JSON.stringify(postbackData)}`);

        const response = await fetch(postbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postbackData),
        });

        postbackResult = await response.json();
        user.postbackSent = postbackResult.success;

        this.logger.log(`📥 [SIMULATOR] Postback response: ${JSON.stringify(postbackResult)}`);
      } catch (error) {
        this.logger.error(`❌ [SIMULATOR] Postback failed: ${error.message}`);
        postbackResult = { success: false, error: error.message };
      }
    }

    // Render success page
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✅ Registro Exitoso - TestBet Simulator</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .success-icon {
            text-align: center;
            font-size: 4rem;
            margin-bottom: 20px;
        }
        h1 {
            text-align: center;
            color: #198754;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        .info-box {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .info-box h3 {
            color: #495057;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-row .label {
            color: #6c757d;
        }
        .info-row .value {
            font-weight: 500;
            color: #212529;
        }
        .info-row .value.success {
            color: #198754;
        }
        .info-row .value.error {
            color: #dc3545;
        }
        code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.85rem;
        }
        .btn {
            display: block;
            width: 100%;
            padding: 14px;
            background: #0d6efd;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
            margin-top: 20px;
        }
        .btn:hover {
            background: #0b5ed7;
        }
        .btn-secondary {
            background: #6c757d;
            margin-top: 10px;
        }
        .postback-status {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .postback-status.success {
            background: #d1e7dd;
            border: 1px solid #badbcc;
        }
        .postback-status.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">🎉</div>
        <h1>¡Registro Simulado Exitoso!</h1>
        <p class="subtitle">El flujo de tracking ha sido completado</p>
        
        <div class="postback-status ${postbackResult.success ? 'success' : 'error'}">
            <strong>${postbackResult.success ? '✅ Postback enviado correctamente' : '❌ Error en postback'}</strong>
            ${!postbackResult.success ? `<br><small>Error: ${(postbackResult as any).error || 'Unknown'}</small>` : ''}
            ${postbackResult.success && (postbackResult as any).conversionId ? `<br><small>Conversion ID: ${(postbackResult as any).conversionId}</small>` : ''}
        </div>
        
        <div class="info-box">
            <h3>👤 Datos del Usuario Simulado</h3>
            <div class="info-row">
                <span class="label">ID</span>
                <span class="value"><code>${userId}</code></span>
            </div>
            <div class="info-row">
                <span class="label">Email</span>
                <span class="value">${email}</span>
            </div>
            <div class="info-row">
                <span class="label">Username</span>
                <span class="value">${username}</span>
            </div>
        </div>
        
        <div class="info-box">
            <h3>📊 Datos de Tracking</h3>
            <div class="info-row">
                <span class="label">SubID (Tipster)</span>
                <span class="value"><code>${subid || 'N/A'}</code></span>
            </div>
            <div class="info-row">
                <span class="label">Affiliate</span>
                <span class="value">${affiliate || 'antia'}</span>
            </div>
            <div class="info-row">
                <span class="label">Postback enviado</span>
                <span class="value ${postbackResult.success ? 'success' : 'error'}">${postbackResult.success ? 'Sí ✓' : 'No ✗'}</span>
            </div>
        </div>
        
        <div class="info-box">
            <h3>📤 Detalles del Postback Enviado</h3>
            <div class="info-row">
                <span class="label">URL</span>
                <span class="value"><code>/api/r/postback</code></span>
            </div>
            <div class="info-row">
                <span class="label">Método</span>
                <span class="value">POST</span>
            </div>
            <div class="info-row">
                <span class="label">Payload</span>
                <span class="value"><code>subid=${subid}, event=REGISTRATION</code></span>
            </div>
        </div>
        
        <a href="/api/simulator/deposit?userId=${userId}" class="btn">
            💰 Simular Depósito (Siguiente Paso)
        </a>
        
        <a href="/api/simulator/status" class="btn btn-secondary">
            📊 Ver Estado del Simulador
        </a>
    </div>
</body>
</html>
    `;

    res.type('html').send(html);
  }

  /**
   * Simula un depósito del usuario
   */
  @Public()
  @Get('deposit')
  async simulateDeposit(
    @Query('userId') userId: string,
    @Query('amount') amount: string,
    @Res() res: Response,
  ) {
    const depositAmount = parseFloat(amount) || 50;
    const user = this.simulatedUsers.get(userId);

    if (!user) {
      return res.type('html').send(`
        <h1>❌ Usuario no encontrado</h1>
        <p>El usuario ${userId} no existe en el simulador.</p>
        <a href="/api/simulator/landing?subid=test">Volver al inicio</a>
      `);
    }

    // Send deposit postback
    let postbackResult = { success: false, error: 'No subid' };

    if (user.subid) {
      try {
        const postbackUrl = `http://localhost:8001/api/r/postback`;
        const postbackData = {
          subid: user.subid,
          house: 'simulator',
          event: 'DEPOSIT',
          amount: depositAmount,
          currency: 'EUR',
          txid: `dep_${userId}_${Date.now()}`,
        };

        this.logger.log(`📤 [SIMULATOR] Sending DEPOSIT postback: ${JSON.stringify(postbackData)}`);

        const response = await fetch(postbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postbackData),
        });

        postbackResult = await response.json();
        user.hasDeposited = true;
        user.depositAmount = depositAmount;

        this.logger.log(
          `📥 [SIMULATOR] Deposit postback response: ${JSON.stringify(postbackResult)}`,
        );
      } catch (error) {
        this.logger.error(`❌ [SIMULATOR] Deposit postback failed: ${error.message}`);
        postbackResult = { success: false, error: error.message };
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💰 Depósito Simulado - TestBet</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        .icon { font-size: 4rem; margin-bottom: 20px; }
        h1 { color: #198754; margin-bottom: 10px; }
        .amount { font-size: 2.5rem; font-weight: bold; color: #0d6efd; margin: 20px 0; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
        .info p { margin: 8px 0; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        .status { padding: 10px; border-radius: 8px; margin: 15px 0; }
        .status.success { background: #d1e7dd; color: #0f5132; }
        .status.error { background: #f8d7da; color: #842029; }
        .btn { display: inline-block; padding: 12px 24px; background: #0d6efd; color: white; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
        .btn:hover { background: #0b5ed7; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">💰</div>
        <h1>¡Depósito Simulado!</h1>
        <div class="amount">${depositAmount}€</div>
        
        <div class="status ${postbackResult.success ? 'success' : 'error'}">
            ${postbackResult.success ? '✅ Postback de depósito enviado' : '❌ Error: ' + (postbackResult.error || 'Unknown')}
        </div>
        
        <div class="info">
            <p><strong>Usuario:</strong> ${user.email}</p>
            <p><strong>SubID:</strong> <code>${user.subid}</code></p>
            <p><strong>Evento:</strong> DEPOSIT</p>
            <p><strong>Transaction ID:</strong> <code>dep_${userId}_...</code></p>
        </div>
        
        <a href="/api/simulator/status" class="btn">📊 Ver Estado</a>
        <a href="/api/simulator/landing?subid=${user.subid}" class="btn">🔄 Nueva Prueba</a>
    </div>
</body>
</html>
    `;

    res.type('html').send(html);
  }

  /**
   * Muestra el estado del simulador y el historial de eventos
   */
  @Public()
  @Get('status')
  async getSimulatorStatus(@Res() res: Response) {
    const users = Array.from(this.simulatedUsers.values());
    const clicks = this.clickHistory.slice(-20); // Last 20 clicks

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Estado del Simulador - TestBet</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; margin-bottom: 20px; }
        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .card h2 { color: #495057; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
        .badge.success { background: #d1e7dd; color: #0f5132; }
        .badge.pending { background: #fff3cd; color: #664d03; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-card .number { font-size: 2.5rem; font-weight: bold; color: #0d6efd; }
        .stat-card .label { color: #6c757d; margin-top: 5px; }
        .btn { display: inline-block; padding: 10px 20px; background: #0d6efd; color: white; text-decoration: none; border-radius: 8px; margin: 5px; }
        .btn:hover { background: #0b5ed7; }
        .test-links { background: #e7f1ff; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
        .test-links h3 { color: #0d6efd; margin-bottom: 15px; }
        .test-links code { display: block; background: white; padding: 10px; margin: 10px 0; border-radius: 4px; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎰 Estado del Simulador de Casa de Apuestas</h1>
        
        <div class="stats">
            <div class="stat-card">
                <div class="number">${clicks.length}</div>
                <div class="label">Clics Recibidos</div>
            </div>
            <div class="stat-card">
                <div class="number">${users.length}</div>
                <div class="label">Registros Simulados</div>
            </div>
            <div class="stat-card">
                <div class="number">${users.filter((u) => u.hasDeposited).length}</div>
                <div class="label">Depósitos Simulados</div>
            </div>
            <div class="stat-card">
                <div class="number">${users.filter((u) => u.postbackSent).length}</div>
                <div class="label">Postbacks Enviados</div>
            </div>
        </div>
        
        <div class="test-links">
            <h3>🧪 Links de Prueba</h3>
            <p>Usa estos links para probar el flujo completo:</p>
            <p><strong>1. Landing del simulador con subid de prueba:</strong></p>
            <code>/api/simulator/landing?subid=TEST_TIPSTER_123&affiliate=antia</code>
            <p><strong>2. Landing desde una campaña real:</strong></p>
            <code>Visita /go/[slug-de-campaña] y haz clic en una casa de apuestas</code>
        </div>
        
        <div class="card">
            <h2>📋 Últimos Clics Recibidos</h2>
            <table>
                <thead>
                    <tr>
                        <th>SubID</th>
                        <th>Timestamp</th>
                        <th>User Agent</th>
                    </tr>
                </thead>
                <tbody>
                    ${clicks.length === 0 ? '<tr><td colspan="3">No hay clics registrados</td></tr>' : ''}
                    ${clicks
                      .reverse()
                      .map(
                        (c) => `
                        <tr>
                            <td><code>${c.subid}</code></td>
                            <td>${c.timestamp.toISOString()}</td>
                            <td>${(c.userAgent || 'N/A').substring(0, 50)}...</td>
                        </tr>
                    `,
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h2>👥 Usuarios Simulados</h2>
            <table>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>SubID</th>
                        <th>Registrado</th>
                        <th>Depósito</th>
                        <th>Postback</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.length === 0 ? '<tr><td colspan="5">No hay usuarios registrados</td></tr>' : ''}
                    ${users
                      .map(
                        (u) => `
                        <tr>
                            <td>${u.email}</td>
                            <td><code>${u.subid}</code></td>
                            <td>${u.registeredAt.toISOString()}</td>
                            <td>${u.hasDeposited ? `${u.depositAmount}€` : '-'}</td>
                            <td><span class="badge ${u.postbackSent ? 'success' : 'pending'}">${u.postbackSent ? '✓ Enviado' : 'Pendiente'}</span></td>
                        </tr>
                    `,
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        
        <a href="/api/simulator/landing?subid=TEST_${Date.now()}" class="btn">🧪 Nueva Prueba</a>
        <a href="/api/simulator/clear" class="btn" style="background: #dc3545;">🗑️ Limpiar Datos</a>
    </div>
</body>
</html>
    `;

    res.type('html').send(html);
  }

  /**
   * Limpia los datos del simulador
   */
  @Public()
  @Get('clear')
  async clearSimulator(@Res() res: Response) {
    this.simulatedUsers.clear();
    this.clickHistory = [];

    res.redirect('/api/simulator/status');
  }

  /**
   * API endpoint para obtener estadísticas en JSON
   */
  @Public()
  @Get('api/stats')
  async getStats() {
    return {
      totalClicks: this.clickHistory.length,
      totalUsers: this.simulatedUsers.size,
      totalDeposits: Array.from(this.simulatedUsers.values()).filter((u) => u.hasDeposited).length,
      totalPostbacks: Array.from(this.simulatedUsers.values()).filter((u) => u.postbackSent).length,
      recentClicks: this.clickHistory.slice(-10),
      users: Array.from(this.simulatedUsers.values()),
    };
  }
}
