'use client';

import { useState, useRef } from 'react';
import { Camera, Save, User } from 'lucide-react';

interface ProfileData {
  publicName: string;
  avatarUrl?: string;
  telegramUsername?: string;
  email: string;
  // KYC Data
  legalName?: string;
  documentType?: string;
  documentNumber?: string;
  country?: string;
  bankAccountType?: string;
  bankAccountDetails?: {
    iban?: string;
    paypalEmail?: string;
    cryptoAddress?: string;
  };
}

interface TipsterProfileViewProps {
  profile: ProfileData;
  kycCompleted: boolean;
  onSave: (data: Partial<ProfileData>) => Promise<void>;
  onAvatarUpload: (file: File) => Promise<string>;
}

export default function TipsterProfileView({
  profile,
  kycCompleted,
  onSave,
  onAvatarUpload,
}: TipsterProfileViewProps) {
  const [formData, setFormData] = useState<ProfileData>(profile);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const url = await onAvatarUpload(file);
      setFormData({ ...formData, avatarUrl: url });
      setMessage({ type: 'success', text: 'Foto actualizada' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al subir la foto' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await onSave(formData);
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar el perfil' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="text-blue-100 mt-1">Administra tu información personal y datos de cobro</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              >
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={40} />
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Foto de perfil</h3>
              <p className="text-sm text-gray-500">JPG o PNG. Máximo 2MB</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información básica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre visible</label>
                <input
                  type="text"
                  value={formData.publicName}
                  onChange={(e) => setFormData({ ...formData, publicName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tu nombre público"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario de Telegram</label>
                <input
                  type="text"
                  value={formData.telegramUsername || ''}
                  onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="@tuusuario"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* KYC / Payment Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Datos de cobro</h3>
              {kycCompleted ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Completado</span>
              ) : (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Pendiente</span>
              )}
            </div>

            {!kycCompleted && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Completá estos datos para poder recibir tus pagos.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo / Razón social</label>
                <input
                  type="text"
                  value={formData.legalName || ''}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre legal completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <select
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar país</option>
                  <option value="ES">España</option>
                  <option value="AR">Argentina</option>
                  <option value="MX">México</option>
                  <option value="CO">Colombia</option>
                  <option value="CL">Chile</option>
                  <option value="PE">Perú</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                <select
                  value={formData.documentType || ''}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar</option>
                  <option value="DNI">DNI</option>
                  <option value="NIE">NIE</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="CIF">CIF (Empresa)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
                <input
                  type="text"
                  value={formData.documentNumber || ''}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345678A"
                />
              </div>
            </div>

            {/* Bank Account */}
            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de cobro</label>
              <div className="flex gap-4 mb-4">
                {['IBAN', 'PAYPAL', 'CRYPTO'].map((method) => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bankAccountType"
                      value={method}
                      checked={formData.bankAccountType === method}
                      onChange={(e) => setFormData({ ...formData, bankAccountType: e.target.value })}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{method}</span>
                  </label>
                ))}
              </div>

              {formData.bankAccountType === 'IBAN' && (
                <input
                  type="text"
                  value={formData.bankAccountDetails?.iban || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccountDetails: { ...formData.bankAccountDetails, iban: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              )}
              {formData.bankAccountType === 'PAYPAL' && (
                <input
                  type="email"
                  value={formData.bankAccountDetails?.paypalEmail || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccountDetails: { ...formData.bankAccountDetails, paypalEmail: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@paypal.com"
                />
              )}
              {formData.bankAccountType === 'CRYPTO' && (
                <input
                  type="text"
                  value={formData.bankAccountDetails?.cryptoAddress || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccountDetails: { ...formData.bankAccountDetails, cryptoAddress: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dirección USDT (TRC20)"
                />
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={20} />
              )}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
