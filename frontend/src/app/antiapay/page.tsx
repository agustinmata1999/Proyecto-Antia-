'use client';

import Link from 'next/link';

export default function AntiaPay() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            Antia<span className="text-blue-400 font-light">Pay</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg transition font-medium text-sm flex items-center gap-2"
              data-testid="header-login-btn"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
              <span className="text-blue-400 text-sm font-medium">Solución de pagos para creadores</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Cobra por tu contenido
              <br />
              <span className="text-blue-400">en un solo clic</span>
            </h1>
            <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
              AntiaPay es la solución todo-en-uno para gestionar pagos, suscripciones y 
              accesos automáticos a tu contenido premium.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg transition font-medium text-lg"
                data-testid="hero-cta-btn"
              >
                Comenzar gratis
              </Link>
              <a
                href="#demo"
                className="border border-gray-600 text-white px-8 py-4 rounded-lg hover:bg-white/5 transition font-medium text-lg"
              >
                Ver demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-gray-500">Creadores activos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">€2M+</div>
              <div className="text-gray-500">Procesado</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">98%</div>
              <div className="text-gray-500">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">24h</div>
              <div className="text-gray-500">Soporte</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Todo lo que necesitas para
              <span className="text-blue-400"> monetizar</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Una suite completa de herramientas diseñadas específicamente para creadores de contenido
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Pagos en 1 clic</h3>
              <p className="text-gray-400">
                Checkout optimizado para máxima conversión. Stripe y Redsys integrados.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Suscripciones automáticas</h3>
              <p className="text-gray-400">
                Cobros recurrentes sin intervención. Renovaciones y cancelaciones automatizadas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Gestión de accesos</h3>
              <p className="text-gray-400">
                Control total sobre quién accede a tu contenido. Grupos de Telegram automatizados.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Analytics en tiempo real</h3>
              <p className="text-gray-400">
                Dashboard completo con métricas de ingresos, conversiones y crecimiento.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Links de pago personalizados</h3>
              <p className="text-gray-400">
                Crea enlaces únicos para cada producto. Compártelos en redes sociales.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Sistema de referidos</h3>
              <p className="text-gray-400">
                Programa de afiliados integrado. Genera comisiones por cada cliente referido.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Precios <span className="text-blue-400">transparentes</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Sin sorpresas. Pagas solo una comisión por transacción.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-4">Gratis</div>
              <p className="text-gray-400 mb-6">Para empezar</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Hasta 3 productos
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  15% comisión
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Soporte por email
                </li>
              </ul>
              <Link href="/register" className="block w-full text-center py-3 border border-gray-600 rounded-lg hover:bg-white/5 transition">
                Empezar gratis
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-blue-600 to-blue-700 rounded-2xl p-8 border border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-4">€49<span className="text-xl text-blue-200">/mes</span></div>
              <p className="text-blue-100 mb-6">Para profesionales</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Productos ilimitados
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  10% comisión
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Soporte prioritario
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Analytics avanzado
                </li>
              </ul>
              <Link href="/register" className="block w-full text-center py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium">
                Comenzar ahora
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-bold mb-4">Custom</div>
              <p className="text-gray-400 mb-6">Para equipos grandes</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Todo de Pro
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  5% comisión
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Account manager
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  API personalizada
                </li>
              </ul>
              <a href="#contact" className="block w-full text-center py-3 border border-gray-600 rounded-lg hover:bg-white/5 transition">
                Contactar ventas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              ¿Listo para monetizar tu contenido?
            </h2>
            <p className="text-blue-100 text-xl mb-8 max-w-2xl mx-auto">
              Únete a más de 500 creadores que ya confían en AntiaPay para gestionar sus pagos.
            </p>
            <Link
              href="/register"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition font-medium text-lg"
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080808] border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="text-xl font-semibold">
              Antia<span className="text-blue-400 font-light">Pay</span>
            </Link>
            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <Link href="/" className="hover:text-white transition">Inicio</Link>
              <Link href="/antialink" className="hover:text-white transition">AntiaLink</Link>
              <a href="#" className="hover:text-white transition">Términos</a>
              <a href="#" className="hover:text-white transition">Privacidad</a>
            </div>
            <div className="text-gray-500 text-sm">
              © 2025 Antia. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
