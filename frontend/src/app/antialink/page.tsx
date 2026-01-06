'use client';

import Link from 'next/link';

export default function AntiaLink() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            Antia<span className="text-green-400 font-light">Link</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg transition font-medium text-sm flex items-center gap-2"
              data-testid="header-login-btn"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-transparent to-emerald-600/5" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
              <span className="text-green-400 text-sm font-medium">Red de afiliación premium</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Convierte tu tráfico
              <br />
              <span className="text-green-400">en ingresos</span>
            </h1>
            <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
              AntiaLink conecta a creadores de contenido con las mejores casas de apuestas. 
              Enlaces geolocalizados, tracking avanzado y comisiones competitivas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#contact"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg transition font-medium text-lg"
              >
                Solicitar acceso
              </a>
              <a
                href="#partners"
                className="border border-gray-600 text-white px-8 py-4 rounded-lg hover:bg-white/5 transition font-medium text-lg"
              >
                Ver partners
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
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-gray-500">Partners activos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">180+</div>
              <div className="text-gray-500">Países cubiertos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">€500K+</div>
              <div className="text-gray-500">Comisiones pagadas</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">Real-time</div>
              <div className="text-gray-500">Tracking</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Cómo funciona <span className="text-green-400">AntiaLink</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Un proceso simple para empezar a generar ingresos con tu audiencia
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-green-400">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Solicita acceso</h3>
              <p className="text-gray-400">
                Rellena el formulario de solicitud. Nuestro equipo revisará tu perfil en 24-48h.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-green-400">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Elige campañas</h3>
              <p className="text-gray-400">
                Accede al catálogo de casas y selecciona las que mejor encajan con tu audiencia.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-green-400">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Genera ingresos</h3>
              <p className="text-gray-400">
                Comparte tus enlaces y cobra comisiones por cada usuario que se registre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Todo lo que <span className="text-green-400">necesitas</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-green-500/30 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Enlaces geolocalizados</h3>
              <p className="text-gray-400">
                Detectamos automáticamente el país del usuario y lo redirigimos a la casa disponible en su región.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-green-500/30 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Tracking en tiempo real</h3>
              <p className="text-gray-400">
                Dashboard completo con métricas de clics, conversiones y ganancias actualizadas al instante.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-green-500/30 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Pagos puntuales</h3>
              <p className="text-gray-400">
                Cobramos de las casas y te pagamos mensualmente. Sin retrasos ni complicaciones.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-green-500/30 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Partners verificados</h3>
              <p className="text-gray-400">
                Solo trabajamos con casas con licencia. Seguridad y confianza para tu audiencia.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-green-500/30 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Landing pages</h3>
              <p className="text-gray-400">
                Páginas de aterrizaje personalizadas con tu marca y múltiples casas para elegir.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-green-500/30 transition group">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Soporte dedicado</h3>
              <p className="text-gray-400">
                Un account manager asignado para optimizar tus campañas y maximizar ingresos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Nuestros <span className="text-green-400">Partners</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Trabajamos con las mejores casas de apuestas del mercado
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
            {['Stake', 'bet365', 'Betfair', 'Betway', '1xBet', 'Pinnacle', 'Bwin', 'William Hill', '888sport', 'Unibet', 'LeoVegas', 'Codere'].map((partner, i) => (
              <div key={i} className="bg-[#141414] rounded-xl p-6 border border-gray-800 flex items-center justify-center hover:border-green-500/30 transition">
                <span className="text-gray-400 font-medium">{partner}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Solicita acceso a AntiaLink</h2>
              <p className="text-gray-400">
                Déjanos tus datos y nuestro equipo se pondrá en contacto contigo en 24-48h.
              </p>
            </div>

            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nombre</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Canal principal</label>
                <select className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white">
                  <option value="">Selecciona una opción</option>
                  <option value="telegram">Telegram</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="instagram">Instagram</option>
                  <option value="web">Web/Blog</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Audiencia estimada</label>
                <select className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white">
                  <option value="">Selecciona una opción</option>
                  <option value="1k-10k">1.000 - 10.000</option>
                  <option value="10k-50k">10.000 - 50.000</option>
                  <option value="50k-100k">50.000 - 100.000</option>
                  <option value="100k+">+100.000</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mensaje (opcional)</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                  placeholder="Cuéntanos sobre tu proyecto..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 text-white px-6 py-4 rounded-lg hover:bg-green-600 transition font-medium text-lg"
              >
                Enviar solicitud
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080808] border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="text-xl font-semibold">
              Antia<span className="text-green-400 font-light">Link</span>
            </Link>
            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <Link href="/" className="hover:text-white transition">Inicio</Link>
              <Link href="/antiapay" className="hover:text-white transition">AntiaPay</Link>
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
