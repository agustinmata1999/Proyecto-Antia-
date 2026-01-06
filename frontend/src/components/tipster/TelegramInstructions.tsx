'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, UserPlus, Settings, Send } from 'lucide-react';

interface TelegramInstructionsProps {
  botUsername: string;
  onCopyBotUsername: () => void;
}

export default function TelegramInstructions({ botUsername, onCopyBotUsername }: TelegramInstructionsProps) {
  const [expanded, setExpanded] = useState(true);

  const steps = [
    {
      number: '01',
      title: 'Crea tu canal privado',
      description: 'Abre Telegram y crea un nuevo canal privado. Ve a "Nuevo Canal" y selecciona "Canal Privado".',
      icon: MessageCircle,
      details: [
        'Abre Telegram',
        'Toca el icono de lápiz (nuevo mensaje)',
        'Selecciona "Nuevo Canal"',
        'Ponle un nombre a tu canal',
        'Selecciona "Canal Privado"',
      ],
    },
    {
      number: '02',
      title: 'Añade el bot como administrador',
      description: `Busca @${botUsername} y añádelo como administrador del canal con todos los permisos.`,
      icon: UserPlus,
      details: [
        'Entra en la configuración del canal',
        'Ve a "Administradores"',
        'Toca "Añadir administrador"',
        `Busca @${botUsername}`,
        'Dale todos los permisos y guarda',
      ],
    },
    {
      number: '03',
      title: 'Copia el link de invitación',
      description: 'Ve a la info del canal y copia el enlace de invitación.',
      icon: Settings,
      details: [
        'Ve a "Info del canal"',
        'Toca "Link de invitación"',
        'Copia el enlace',
      ],
    },
    {
      number: '04',
      title: 'Pega el link aquí',
      description: 'Pega el link de invitación en el formulario de abajo y pulsa "Conectar canal".',
      icon: Send,
      details: [
        'Clic en "Añadir Canal"',
        'Pega el link de invitación',
        'Pulsa "Conectar"',
      ],
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Cómo conectar tu canal de Telegram</h3>
            <p className="text-sm text-gray-500">Sigue estos 4 pasos simples</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Steps */}
      {expanded && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  {/* Step Card */}
                  <div className="bg-gray-50 rounded-2xl p-5 h-full flex flex-col">
                    {/* Step Number Badge */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded-full">
                        Paso {step.number}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-blue-600" />
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 flex-grow">{step.description}</p>

                    {/* Details List */}
                    <ul className="space-y-2">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Arrow connector (hidden on last item and mobile) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bot Username Copy */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-800">Bot de Telegram</p>
                <p className="font-mono font-bold text-blue-900">@{botUsername}</p>
              </div>
            </div>
            <button
              onClick={onCopyBotUsername}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Copiar nombre del bot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
