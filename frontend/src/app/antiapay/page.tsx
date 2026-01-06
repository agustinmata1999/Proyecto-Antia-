'use client';

import Link from 'next/link';

export default function AntiaPay() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-medium tracking-tight">
            Antia<span className="font-light">Pay</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#contact" className="text-gray-400 hover:text-white text-sm transition">Contacto</a>
            <Link href="/register?role=tipster" className="text-gray-400 hover:text-white text-sm transition">Empezar a vender</Link>
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
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Una plataforma para
                <br />
                gestionar y vender
                <br />
                <span className="font-normal">contenido digital</span>
              </h1>
              <p className="text-gray-400 text-lg mb-4 leading-relaxed max-w-lg">
                AntiaPay es una plataforma que permite a creadores y proyectos 
                digitales gestionar la venta de contenido premium mediante pagos 
                y suscripciones automatizadas.
              </p>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg">
                Desde un único panel, puedes controlar accesos, renovaciones y 
                transacciones de forma sencilla y organizada.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register?role=tipster"
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

            {/* Right content - AntiaPay 3D mockup */}
            <div className="relative flex justify-center lg:justify-end">
              {/* 3D Card mockup */}
              <div className="relative">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-cyan-400/20 blur-3xl rounded-full scale-150" />
                
                {/* Main card */}
                <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 shadow-2xl transform perspective-1000 rotate-y-6 hover:rotate-y-0 transition-transform duration-500">
                  {/* Inner card design */}
                  <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-full px-8 py-4 border border-gray-600 flex items-center gap-3 shadow-xl">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50" />
                    <span className="text-2xl font-semibold tracking-tight">
                      Antia<span className="font-light italic text-blue-400">Pay</span>
                    </span>
                  </div>
                  
                  {/* Decorative lines */}
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 border-r-2 border-b-2 border-blue-500/30 rounded-br-3xl" />
                  <div className="absolute -top-4 -left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-2xl" />
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-8 right-0 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
                <div className="absolute bottom-0 -left-8 w-3 h-3 bg-cyan-400 rounded-full animate-pulse delay-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Type Selection Section */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 italic">
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
            {/* Particular (Cliente) */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition">
              <h4 className="text-2xl font-bold mb-4">Particular</h4>
              <p className="text-gray-400 mb-6">
                Quiero disfrutar del contenido de mis creadores favoritos y apoyarles
              </p>
              <Link
                href="/register?role=client"
                className="flex items-center justify-center gap-2 border border-gray-600 text-white px-6 py-3 rounded-lg hover:bg-white/5 transition font-medium w-full"
                data-testid="user-type-client-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cuenta Personal
              </Link>
            </div>

            {/* Empresa (Tipster) */}
            <div className="bg-[#141414] rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition">
              <h4 className="text-2xl font-bold mb-4">Empresa</h4>
              <p className="text-gray-400 mb-6">
                Quiero vender acceso a mi canal, curso, contenido o sala y cobrar fácilmente
              </p>
              <Link
                href="/register?role=tipster"
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition font-medium w-full"
                data-testid="user-type-tipster-btn"
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

      {/* Features Section with 3D Icons */}
      <section className="py-24 bg-[#0d0d0d]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Una solución diseñada para la
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold">
              gestión de <span className="font-light">contenido digital</span>
            </h3>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
              AntiaPay ofrece un conjunto de funcionalidades orientadas a la 
              gestión de pagos, suscripciones y accesos a contenido digital 
              desde una única plataforma
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 - Gestión de suscripciones */}
            <div className="text-center">
              <h4 className="text-xl font-bold mb-4">Gestión de suscripciones</h4>
              <p className="text-gray-500 text-sm mb-8">
                Olvidate de la gestión manual, automatiza las suscripciones, los 
                cobros y los accesos para que todo funcione de forma continua y 
                sin interrupciones
              </p>
              {/* 3D Icon */}
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full blur-2xl" />
                <div className="relative bg-gradient-to-br from-blue-400/20 to-cyan-400/10 rounded-3xl p-6 border border-blue-500/20">
                  <div className="flex items-center justify-center h-full">
                    <div className="relative">
                      {/* Monitor icon */}
                      <div className="w-24 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-xl shadow-blue-500/30">
                        <div className="w-16 h-12 bg-blue-300/30 rounded flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                      </div>
                      {/* Settings gear */}
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 - Pagos en un click */}
            <div className="text-center">
              <h4 className="text-xl font-bold mb-4">Pagos en un click</h4>
              <p className="text-gray-500 text-sm mb-8">
                Permite ejecutar pagos de forma rápida y directa en un solo clic, 
                optimizando la experiencia del usuario en cada transacción
              </p>
              {/* 3D Icon */}
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full blur-2xl" />
                <div className="relative bg-gradient-to-br from-blue-400/20 to-cyan-400/10 rounded-3xl p-6 border border-blue-500/20">
                  <div className="flex items-center justify-center h-full">
                    <div className="relative">
                      {/* Cart icon */}
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 transform rotate-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      {/* Check badge */}
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 - Integrado con Telegram */}
            <div className="text-center">
              <h4 className="text-xl font-bold mb-4">Integrado con Telegram</h4>
              <p className="text-gray-500 text-sm mb-8">
                La plataforma puede integrarse con herramientas de mensajería 
                para automatizar la gestión de accesos a comunidades y 
                contenidos privados.
              </p>
              {/* 3D Icon */}
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full blur-2xl" />
                <div className="relative bg-gradient-to-br from-blue-400/20 to-cyan-400/10 rounded-3xl p-6 border border-blue-500/20">
                  <div className="flex items-center justify-center h-full">
                    <div className="relative">
                      {/* Chart icon */}
                      <div className="w-24 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-end justify-center gap-1 p-3 shadow-xl shadow-blue-500/30">
                        <div className="w-4 h-6 bg-blue-300/50 rounded-sm" />
                        <div className="w-4 h-10 bg-blue-300/50 rounded-sm" />
                        <div className="w-4 h-8 bg-blue-300/50 rounded-sm" />
                        <div className="w-4 h-12 bg-white/70 rounded-sm" />
                      </div>
                      {/* Check badge */}
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <Link
              href="/register?role=tipster"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-10 py-4 rounded-lg transition font-medium"
            >
              Comenzar ahora
            </Link>
          </div>
        </div>
      </section>

      {/* Dashboard Showcase Section */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Optimiza la gestión de
                <br />
                tus <span className="font-light">procesos digitales</span>
              </h2>
              <Link
                href="/register?role=tipster"
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg transition font-medium"
              >
                Comenzar ahora
              </Link>
            </div>

            {/* Right content - Dashboard mockup */}
            <div className="relative">
              <div className="bg-[#141414] rounded-2xl p-4 border border-gray-700 shadow-2xl">
                {/* Dashboard header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                
                {/* Dashboard content */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Sidebar */}
                  <div className="col-span-1 bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                    <div className="h-3 bg-gray-700 rounded w-3/4" />
                    <div className="h-2 bg-gray-800 rounded w-1/2" />
                    <div className="h-2 bg-gray-800 rounded w-2/3" />
                    <div className="h-2 bg-blue-500/30 rounded w-1/2" />
                    <div className="h-2 bg-gray-800 rounded w-3/4" />
                  </div>
                  
                  {/* Main content */}
                  <div className="col-span-2 space-y-3">
                    {/* Stats cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#1a1a1a] rounded-lg p-2">
                        <div className="text-xs text-gray-500">Ingresos</div>
                        <div className="text-sm font-bold text-green-400">€1,234</div>
                      </div>
                      <div className="bg-[#1a1a1a] rounded-lg p-2">
                        <div className="text-xs text-gray-500">Suscriptores</div>
                        <div className="text-sm font-bold">847</div>
                      </div>
                      <div className="bg-[#1a1a1a] rounded-lg p-2">
                        <div className="text-xs text-gray-500">Conversión</div>
                        <div className="text-sm font-bold text-blue-400">12.5%</div>
                      </div>
                    </div>
                    
                    {/* Chart placeholder */}
                    <div className="bg-[#1a1a1a] rounded-lg p-3 h-24">
                      <div className="flex items-end justify-around h-full gap-1">
                        {[40, 60, 30, 80, 50, 70, 45, 90, 55, 75, 85, 65].map((h, i) => (
                          <div key={i} className="bg-blue-500/50 rounded-sm w-full" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    
                    {/* Table placeholder */}
                    <div className="bg-[#1a1a1a] rounded-lg p-2 space-y-1">
                      {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-gray-800 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-700 rounded-full" />
                            <div className="h-2 bg-gray-700 rounded w-20" />
                          </div>
                          <div className="h-2 bg-green-500/30 rounded w-12" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
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
              <Link href="/register?role=tipster" className="block w-full text-center py-3 border border-gray-600 rounded-lg hover:bg-white/5 transition">
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
              <Link href="/register?role=tipster" className="block w-full text-center py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium">
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

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">¿Tienes preguntas?</h2>
            <p className="text-gray-400 mb-8">
              Contáctanos y te responderemos lo antes posible.
            </p>
            <a
              href="mailto:soporte@antia.com"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg transition font-medium"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080808] border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="text-xl font-medium">
              Antia<span className="font-light">Pay</span>
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
