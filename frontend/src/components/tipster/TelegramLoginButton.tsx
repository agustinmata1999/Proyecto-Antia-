'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write' | string;
  showAvatar?: boolean;
  lang?: string;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: TelegramUser) => void;
    };
  }
}

export default function TelegramLoginButton({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 10,
  requestAccess = 'write',
  showAvatar = true,
  lang = 'es',
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAuth = useCallback(
    (user: TelegramUser) => {
      onAuth(user);
    },
    [onAuth]
  );

  useEffect(() => {
    // Crear callback global
    window.TelegramLoginWidget = {
      dataOnauth: handleAuth,
    };

    // Crear el script de Telegram
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-userpic', showAvatar.toString());
    script.setAttribute('data-lang', lang);
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    script.async = true;

    // Limpiar y agregar al contenedor
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, showAvatar, lang, handleAuth]);

  return <div ref={containerRef} className="telegram-login-container" />;
}
