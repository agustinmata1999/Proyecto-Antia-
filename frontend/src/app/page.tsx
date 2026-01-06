'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="text-2xl font-semibold tracking-tight">
            Antia
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg transition font-medium text-sm flex items-center gap-2"
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
      <section className="relative min-h-screen flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-2xl">
            <p className="text-gray-400 text-lg mb-4">Monetiza tu audiencia</p>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              La infraestructura para monetizar tu contenido{' '}
              <span className="italic font-light">Igaming</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Convierte tu contenido en ingresos recurrentes sin preocuparte por la 
              gestión. Automatizamos pagos, suscripciones y accesos para que tu 
              comunidad disfrute de una experiencia fluida y profesional. Todo lo que 
              necesitas para monetizar contenido premium en el ecosistema iGaming.
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
        </div>
      </section>

      {/* User Type Selection Section */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 italic">
              Antes de avanzar
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              ¿que situación te define mejor?
            </h3>
            <p className="text-gray-500">
              Todo lo que estas buscando, lo encontraras en un mismo lugar
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Particular */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition">
              <h4 className="text-2xl font-bold mb-4">Particular</h4>
              <p className="text-gray-400 mb-6">
                Quiero disfrutar del contenido de mis creadores favoritos y apoyarles
              </p>
              <Link
                href="/register?type=personal"
                className="flex items-center justify-center gap-2 border border-gray-600 text-white px-6 py-3 rounded-lg hover:bg-white/5 transition font-medium w-full"
                data-testid="user-type-personal-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cuenta Personal
              </Link>
            </div>

            {/* Empresa */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition">
              <h4 className="text-2xl font-bold mb-4">Empresa</h4>
              <p className="text-gray-400 mb-6">
                Quiero vender acceso a mi canal, curso, contenido o sala y cobrar fácilmente
              </p>
              <Link
                href="/register?type=business"
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition font-medium w-full"
                data-testid="user-type-business-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Cuenta Business
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Products Selection Section */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              Selecciona tu mejor opción
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold italic">
              según tus <span className="font-light">objetivos</span>
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* AntiaPay */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition">
              <h4 className="text-2xl font-bold mb-8">
                Antia<span className="font-light">Pay</span>
              </h4>
              <ul className="space-y-4 mb-8 text-gray-300">
                <li className="flex items-center gap-3">
                  <span className="text-blue-400">✦</span>
                  Pagos en un click
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-blue-400">◈</span>
                  Suscripciones
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-blue-400">👥</span>
                  Gestión de audiencia
                </li>
              </ul>
              <Link
                href="/register"
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg transition font-medium"
                data-testid="antiapay-cta-btn"
              >
                Comenzar ahora
              </Link>
            </div>

            {/* AntiaLink */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 border-dashed hover:border-gray-600 transition">
              <h4 className="text-2xl font-bold mb-8">
                Antia<span className="font-light">Link</span>
              </h4>
              <ul className="space-y-4 mb-8 text-gray-300">
                <li className="flex items-center gap-3">
                  <span className="text-blue-400">🔗</span>
                  Enlaces geolocalizados
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-blue-400">📍</span>
                  Los mejores partners
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-blue-400">💰</span>
                  Convierte tu alcance en ingresos
                </li>
              </ul>
              <a
                href="#contact"
                className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg transition font-medium"
                data-testid="antialink-contact-btn"
              >
                Hablar con ventas
              </a>
            </div>
          </div>

          {/* Included Features Bar */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              <span className="text-white font-medium">Incluidos sin coste adicional:</span>
              {'  '}
              <span className="inline-flex items-center gap-2 mx-2">
                <span className="text-gray-400">🔗</span> Enlaces de pago
              </span>
              <span className="inline-flex items-center gap-2 mx-2">
                <span className="text-gray-400">📄</span> Facturación
              </span>
              <span className="inline-flex items-center gap-2 mx-2">
                <span className="text-gray-400">🛒</span> Checkout
              </span>
              <span className="inline-flex items-center gap-2 mx-2">
                <span className="text-gray-400">🔄</span> Recurrente
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Una plataforma con <span className="font-light">control total</span>
            </h2>
            <Link
              href="/register"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg transition font-medium"
              data-testid="features-cta-btn"
            >
              Comenzar ahora
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
            {/* Feature 1 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-8 border border-gray-800">
              <div className="text-2xl mb-6">◈</div>
              <h4 className="text-xl font-bold mb-4">Gestión de suscripciones</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Olvídate de la gestión manual. automatiza las suscripciones, los 
                cobros y los accesos para que todo funcione de forma continua y 
                sin interrupciones
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-8 border border-gray-800">
              <div className="text-2xl mb-6">✦</div>
              <h4 className="text-xl font-bold mb-4">Pagos en un click</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Permite ejecutar pagos de forma rápida y directa en un solo clic, 
                optimizando la experiencia del usuario en cada transacción
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-8 border border-gray-800">
              <div className="text-2xl mb-6">📡</div>
              <h4 className="text-xl font-bold mb-4">Campañas de afiliación</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Empieza a generar ingresos con tus redes sociales o tu web a 
                través de acuerdos con nuestros partners.
                <br /><br />
                Accede a campañas de afiliación seleccionadas y gestiona todo 
                desde un único sistema.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AntiaPay Showcase Section */}
      <section className="py-24 bg-gradient-to-b from-[#0a0a0a] to-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Image/Mockup */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-900/20 to-transparent rounded-3xl p-8">
                <div className="relative">
                  {/* Decorative elements */}
                  <div className="absolute -left-4 top-1/2 w-1 h-32 bg-gradient-to-b from-blue-500 to-transparent rounded-full" />
                  <div className="absolute right-8 top-8 w-3 h-3 bg-blue-500 rounded-full" />
                  
                  {/* AntiaPay Card */}
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-full px-8 py-4 border border-gray-700 inline-flex items-center gap-4 shadow-2xl shadow-blue-500/10">
                    <span className="text-2xl font-bold">
                      Antia<span className="font-light text-blue-400">Pay</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Aumenta tus Ingresos
                <br />
                con Antia<span className="font-light text-blue-400">Pay</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Centraliza los pagos de tu contenido premium en un solo sistema. 
                AntiaPay combina suscripciones automatizadas, pagos en un clic y 
                gestión de accesos para ofrecer una experiencia de pago rápida y fluida
              </p>
              <Link
                href="/antiapay"
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg transition font-medium"
                data-testid="antiapay-info-btn"
              >
                Mas información
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Campaigns Section */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Gestiona tus campañas de <span className="italic font-light">Afiliación</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Accede a campañas activas, genera tus enlaces y controla el 
              rendimiento desde un único panel, con una visión clara de resultados.
            </p>
          </div>
          
          {/* Mockup Display */}
          <div className="relative max-w-5xl mx-auto">
            <div className="flex justify-center items-end gap-8">
              {/* Mobile mockup */}
              <div className="hidden md:block bg-[#1a1a1a] rounded-3xl p-4 border border-gray-700 w-64 shadow-2xl">
                <div className="bg-gray-900 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full" />
                    <div>
                      <div className="text-sm font-medium">ANALIZA TÍ</div>
                      <div className="text-xs text-green-400">●  #1003</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {['Stake', 'Betfair', 'bet365', 'Betway', '1xBet'].map((house, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-2 flex justify-between items-center">
                        <span className="text-xs text-gray-300">{house}</span>
                        <span className="text-xs bg-blue-500 px-2 py-1 rounded">Registrarse</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Desktop mockup */}
              <div className="bg-[#1a1a1a] rounded-2xl p-3 border border-gray-700 flex-1 max-w-2xl shadow-2xl">
                <div className="bg-gray-900 rounded-xl p-6">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-700">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full" />
                    <div>
                      <div className="text-lg font-medium">ANALIZA TÍ</div>
                      <div className="text-sm text-green-400">●  #1003</div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-4">Selecciona tu pronóstico</p>
                    <div className="space-y-3">
                      <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-bold italic">Stake</div>
                          <span className="text-gray-400 text-sm">Deposita al menos 10€</span>
                        </div>
                        <button className="bg-blue-500 px-4 py-2 rounded-lg text-sm">Registrarse →</button>
                      </div>
                      <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-bold text-green-500">bet365</div>
                          <span className="text-gray-400 text-sm">Deposita al menos 10€</span>
                        </div>
                        <button className="bg-blue-500 px-4 py-2 rounded-lg text-sm">Registrarse →</button>
                      </div>
                    </div>
                  </div>

                  {/* Footer logos */}
                  <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-500">🎰 juego seguro</div>
                    <div className="text-xs text-gray-500">🔞 +18</div>
                    <div className="text-xs text-gray-500">⚠️ autoexclusión</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link
              href="/register"
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg transition font-medium text-center"
              data-testid="affiliate-cta-btn"
            >
              Comenzar ahora
            </Link>
            <a
              href="#contact"
              className="border border-gray-600 text-white px-8 py-4 rounded-lg hover:bg-white/5 transition font-medium text-center"
              data-testid="affiliate-contact-btn"
            >
              Contactanos
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">¿Tienes preguntas?</h2>
              <p className="text-gray-400 text-lg">
                Estamos aquí para ayudarte. Contáctanos y te responderemos lo antes posible.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      placeholder="Tu nombre"
                      data-testid="contact-name-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      placeholder="tu@email.com"
                      data-testid="contact-email-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Mensaje
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      placeholder="Cuéntanos en qué podemos ayudarte..."
                      data-testid="contact-message-input"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-medium"
                    data-testid="contact-submit-btn"
                  >
                    Enviar mensaje
                  </button>
                </form>
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold mb-4">Información de contacto</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-white">Email</div>
                        <div className="text-gray-400">soporte@antia.com</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-white">Teléfono</div>
                        <div className="text-gray-400">+34 900 000 000</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
                  <h4 className="font-bold text-white mb-2">¿Prefieres chatear?</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Nuestro equipo está disponible en Telegram para responder tus preguntas al instante.
                  </p>
                  <a
                    href="https://t.me/antia_soporte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
                    data-testid="telegram-link"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                    </svg>
                    Abrir chat en Telegram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080808] border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">Antia</div>
              <p className="text-gray-500 text-sm">
                La plataforma líder para monetizar contenido en el ecosistema iGaming.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Producto</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><Link href="/antiapay" className="hover:text-white transition">AntiaPay</Link></li>
                <li><Link href="/antialink" className="hover:text-white transition">AntiaLink</Link></li>
                <li><Link href="/login" className="hover:text-white transition">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Legal</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><a href="#" className="hover:text-white">Términos y Condiciones</a></li>
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Disclaimer +18</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Contacto</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li>soporte@antia.com</li>
                <li>+34 900 000 000</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 Antia. Todos los derechos reservados. +18 | Juega con responsabilidad.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
