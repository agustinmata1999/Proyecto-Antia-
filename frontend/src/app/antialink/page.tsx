'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AntiaLink() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-medium tracking-tight">
            Antia<span className="font-light">Link</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#contact" className="text-gray-400 hover:text-white text-sm transition">Contacto</a>
            <Link href="/register" className="text-gray-400 hover:text-white text-sm transition">Empezar a vender</Link>
            <Link
              href="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition font-medium text-sm flex items-center gap-2"
              data-testid="header-login-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-16 relative overflow-hidden">
        {/* Background world map */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='%23333' d='M200 150c20-10 50-5 70 10s30 40 20 60-40 30-70 20-40-40-30-60 10-30 10-30zm300 50c30-20 70-10 90 20s10 70-20 90-70 10-90-20-10-70 20-90zm200-50c20 10 30 40 20 60s-40 30-60 20-30-40-20-60 40-30 60-20z'/%3E%3C/svg%3E")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                <span className="italic">Convierte</span> tu
                <br />
                audiencia en una
                <br />
                fuente de <span className="font-normal">ingresos</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg">
                Accede a campañas de afiliación seleccionadas y empieza a 
                generar ingresos desde tus redes sociales o tu web.
                Todo el proceso se gestiona desde una única plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg transition font-medium text-center"
                  data-testid="hero-cta-btn"
                >
                  Comenzar ahora
                </Link>
                <a
                  href="#contact"
                  className="border border-gray-600 text-white px-8 py-4 rounded-lg hover:bg-white/5 transition font-medium text-center"
                  data-testid="hero-contact-btn"
                >
                  Contactanos
                </a>
              </div>
            </div>

            {/* Right content - Phone mockup */}
            <div className="relative flex justify-center lg:justify-end">
              {/* Labels */}
              <div className="absolute -left-4 top-8 flex items-center gap-2">
                <div className="w-1 h-8 bg-blue-500 rounded-full" />
                <span className="text-blue-400 text-sm">Perfil personalizable</span>
              </div>
              <div className="absolute right-0 top-1/4 flex items-center gap-2">
                <div className="w-1 h-8 bg-blue-500 rounded-full" />
                <span className="text-blue-400 text-sm">Tus campañas</span>
              </div>

              {/* Phone mockup */}
              <div className="bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl shadow-blue-500/10 border border-gray-700 w-72">
                <div className="bg-[#0f0f0f] rounded-[2.5rem] overflow-hidden">
                  {/* Phone screen content */}
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-800">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">AT</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">ANALIZA TI</div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          <span className="text-xs text-gray-400">#1003</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Betting houses list */}
                    <div className="space-y-2">
                      {[
                        { name: 'Stake', color: 'text-white' },
                        { name: 'Betfair', color: 'text-yellow-400' },
                        { name: 'bet365', color: 'text-green-400' },
                        { name: 'Betway', color: 'text-gray-300' },
                        { name: '1xBet', color: 'text-blue-400' },
                      ].map((house, i) => (
                        <div key={i} className="bg-[#1a1a1a] rounded-lg p-2.5 flex justify-between items-center">
                          <span className={`text-xs font-medium ${house.color}`}>{house.name}</span>
                          <span className="text-[10px] bg-blue-500 px-2 py-1 rounded">Registrarse</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer icons */}
                    <div className="flex justify-center gap-3 mt-4 pt-3 border-t border-gray-800">
                      <span className="text-[10px] text-gray-500">🎰</span>
                      <span className="text-[10px] text-gray-500">🔞</span>
                      <span className="text-[10px] text-gray-500">⚠️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners & Steps Section */}
      <section className="py-20 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Monetiza el potencial de tus <span className="font-light">canales</span>
            </h2>
          </div>

          {/* Partner logos */}
          <div className="flex justify-center items-center gap-8 md:gap-16 mb-16 flex-wrap">
            <div className="text-2xl font-bold text-gray-400 hover:text-white transition">
              <span className="flex items-center gap-1">
                <span className="text-green-400">✦</span> luckia
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-400 hover:text-white transition">
              1XBET
            </div>
            <div className="text-2xl font-bold text-gray-400 hover:text-white transition">
              bet365
            </div>
            <div className="text-2xl font-bold text-gray-400 hover:text-white transition italic">
              Stake
            </div>
          </div>

          {/* 4 Steps */}
          <div className="grid md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-[#141414] rounded-2xl p-6 border border-gray-800">
              <h4 className="font-bold mb-2">Accede al programa de afiliación</h4>
              <p className="text-gray-500 text-sm">
                Registrate y desbloquea el acceso a campañas activas.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#141414] rounded-2xl p-6 border border-gray-800">
              <h4 className="font-bold mb-2">Elige tu campaña</h4>
              <p className="text-gray-500 text-sm">
                Genera enlaces únicos adaptados a tu audiencia.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#141414] rounded-2xl p-6 border border-gray-800">
              <h4 className="font-bold mb-2">Pon tu enlace en circulación</h4>
              <p className="text-gray-500 text-sm">
                Saca el máximo rendimiento a tus canales
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-[#141414] rounded-2xl p-6 border border-gray-800">
              <h4 className="font-bold mb-2">Obtén resultados</h4>
              <p className="text-gray-500 text-sm">
                Monetiza tu tráfico y visualiza tus comisiones desde el panel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Telegram Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="font-light">Monetiza</span> el
                <br />
                potencial de tus
                <br />
                canales
              </h2>
              <p className="text-gray-400 mb-4 leading-relaxed">
                Con AntiaLink accedes a campañas de afiliación activas y herramientas 
                diseñadas para monetizar tus canales de forma sencilla y controlada.
              </p>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Nuestra plataforma centraliza la gestión de enlaces, resultados y 
                comisiones para que puedas centrarte en hacer crecer tu audiencia.
              </p>
              
              {/* Feature list */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-blue-400">🔗</span>
                  <span className="text-gray-300">Enlaces geocalizados</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-400">◈</span>
                  <span className="text-gray-300">Los mejores partners</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-400">📄</span>
                  <span className="text-gray-300">Páginas de conversión personalizadas</span>
                </div>
              </div>

              <Link
                href="#campaigns"
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg transition font-medium"
              >
                Más información
              </Link>
            </div>

            {/* Right content - Telegram icons floating */}
            <div className="relative h-96 flex items-center justify-center">
              {/* Main Telegram icon */}
              <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </div>
              
              {/* Floating smaller icons */}
              <div className="absolute top-8 right-8 w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </div>
              <div className="absolute top-20 left-4 w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </div>
              <div className="absolute bottom-12 left-16 w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </div>
              <div className="absolute bottom-4 right-12 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campaign Types Section */}
      <section id="campaigns" className="py-24 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              Un ecosistema de
              <br />
              campañas de <span className="italic font-light">afiliación</span>
            </h2>
          </div>

          {/* Campaign cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Sports */}
            <div className="relative group overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=300&fit=crop" 
                alt="Campañas deportivas"
                className="w-full h-64 object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute bottom-4 left-4 z-20">
                <h3 className="text-lg font-bold">Campañas deportivas</h3>
              </div>
            </div>

            {/* Casino */}
            <div className="relative group overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400&h=300&fit=crop" 
                alt="Campañas de casino"
                className="w-full h-64 object-cover group-hover:scale-105 transition duration-500 grayscale"
              />
              <div className="absolute bottom-4 left-4 z-20">
                <h3 className="text-lg font-bold">Campañas de casino</h3>
              </div>
            </div>

            {/* Poker */}
            <div className="relative group overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=400&h=300&fit=crop" 
                alt="Campañas de póker"
                className="w-full h-64 object-cover group-hover:scale-105 transition duration-500 grayscale"
              />
              <div className="absolute bottom-4 left-4 z-20">
                <h3 className="text-lg font-bold">Campañas de póker</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Todo lo que <span className="text-blue-400">necesitas</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Enlaces geolocalizados</h3>
              <p className="text-gray-400">
                Detectamos automáticamente el país del usuario y lo redirigimos a la casa disponible en su región.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Tracking en tiempo real</h3>
              <p className="text-gray-400">
                Dashboard completo con métricas de clics, conversiones y ganancias actualizadas al instante.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Pagos puntuales</h3>
              <p className="text-gray-400">
                Cobramos de las casas y te pagamos mensualmente. Sin retrasos ni complicaciones.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Partners verificados</h3>
              <p className="text-gray-400">
                Solo trabajamos con casas con licencia. Seguridad y confianza para tu audiencia.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Landing pages</h3>
              <p className="text-gray-400">
                Páginas de aterrizaje personalizadas con tu marca y múltiples casas para elegir.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-blue-500/30 transition group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Canal principal</label>
                <select className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white">
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
                <select className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white">
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
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  placeholder="Cuéntanos sobre tu proyecto..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white px-6 py-4 rounded-lg hover:bg-blue-600 transition font-medium text-lg"
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
            <Link href="/" className="text-xl font-medium">
              Antia<span className="font-light">Link</span>
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
