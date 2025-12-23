'use client';

import { useState } from 'react';
import { tipsterApi } from '@/lib/api';
import { Building2, User, FileText, MapPin, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface KycFormProps {
  onComplete: () => void;
  onCancel: () => void;
  initialData?: any;
}

const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI (España)' },
  { value: 'NIE', label: 'NIE (Extranjero en España)' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'CIF', label: 'CIF (Empresa)' },
];

const BANK_ACCOUNT_TYPES = [
  { value: 'IBAN', label: 'Transferencia Bancaria (IBAN)' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'CRYPTO', label: 'Criptomonedas (USDT)' },
  { value: 'OTHER', label: 'Otro' },
];

const COUNTRIES = [
  'España', 'México', 'Argentina', 'Colombia', 'Chile', 
  'Perú', 'Ecuador', 'Venezuela', 'Uruguay', 'Paraguay',
  'Bolivia', 'Costa Rica', 'Panamá', 'Guatemala', 'Honduras',
  'El Salvador', 'Nicaragua', 'República Dominicana', 'Puerto Rico', 'Cuba',
  'Otro'
];

export default function KycForm({ onComplete, onCancel, initialData }: KycFormProps) {
  const [formData, setFormData] = useState({
    legalName: initialData?.legalName || '',
    documentType: initialData?.documentType || 'DNI',
    documentNumber: '',
    country: initialData?.country || 'España',
    bankAccountType: initialData?.bankAccountType || 'IBAN',
    bankAccountDetails: {
      iban: '',
      bankName: '',
      paypalEmail: '',
      cryptoAddress: '',
      cryptoNetwork: 'TRC20',
      otherDetails: '',
    },
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validaciones
    if (!formData.legalName.trim()) {
      setError('El nombre o razón social es obligatorio');
      setSaving(false);
      return;
    }

    if (!formData.documentNumber.trim()) {
      setError('El número de documento es obligatorio');
      setSaving(false);
      return;
    }

    // Validar detalles de cuenta según tipo
    if (formData.bankAccountType === 'IBAN' && !formData.bankAccountDetails.iban.trim()) {
      setError('El IBAN es obligatorio');
      setSaving(false);
      return;
    }

    if (formData.bankAccountType === 'PAYPAL' && !formData.bankAccountDetails.paypalEmail.trim()) {
      setError('El email de PayPal es obligatorio');
      setSaving(false);
      return;
    }

    if (formData.bankAccountType === 'CRYPTO' && !formData.bankAccountDetails.cryptoAddress.trim()) {
      setError('La dirección de wallet es obligatoria');
      setSaving(false);
      return;
    }

    try {
      // Preparar los detalles de la cuenta según el tipo
      let bankDetails = {};
      switch (formData.bankAccountType) {
        case 'IBAN':
          bankDetails = {
            iban: formData.bankAccountDetails.iban.replace(/\s/g, '').toUpperCase(),
            bankName: formData.bankAccountDetails.bankName,
          };
          break;
        case 'PAYPAL':
          bankDetails = {
            email: formData.bankAccountDetails.paypalEmail,
          };
          break;
        case 'CRYPTO':
          bankDetails = {
            address: formData.bankAccountDetails.cryptoAddress,
            network: formData.bankAccountDetails.cryptoNetwork,
          };
          break;
        case 'OTHER':
          bankDetails = {
            details: formData.bankAccountDetails.otherDetails,
          };
          break;
      }

      await tipsterApi.updateKyc({
        legalName: formData.legalName.trim(),
        documentType: formData.documentType,
        documentNumber: formData.documentNumber.trim(),
        country: formData.country,
        bankAccountType: formData.bankAccountType,
        bankAccountDetails: bankDetails,
      });

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Datos guardados!</h2>
          <p className="text-gray-600">Tus datos de cobro han sido registrados correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Datos de Cobro (KYC)</h1>
        <p className="text-gray-600 mt-1">
          Completa tus datos para poder recibir tus ganancias
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Información Personal */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Información Personal / Fiscal</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo / Razón Social *
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan Pérez García o Mi Empresa S.L."
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Nombre tal como aparece en tu documento de identidad</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345678A"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                País de Residencia Fiscal *
              </label>
              <select
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              >
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Método de Cobro */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Método de Cobro</h2>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cómo quieres recibir tus pagos? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {BANK_ACCOUNT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, bankAccountType: type.value })}
                  className={`p-3 rounded-lg border-2 transition text-left ${
                    formData.bankAccountType === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Campos dinámicos según tipo de cuenta */}
          {formData.bankAccountType === 'IBAN' && (
            <div className="grid grid-cols-1 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="ES12 3456 7890 1234 5678 9012"
                  value={formData.bankAccountDetails.iban}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccountDetails: { ...formData.bankAccountDetails, iban: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Banco (opcional)
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Banco Santander, BBVA, etc."
                  value={formData.bankAccountDetails.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccountDetails: { ...formData.bankAccountDetails, bankName: e.target.value }
                  })}
                />
              </div>
            </div>
          )}

          {formData.bankAccountType === 'PAYPAL' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de PayPal *
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="tu@email.com"
                value={formData.bankAccountDetails.paypalEmail}
                onChange={(e) => setFormData({
                  ...formData,
                  bankAccountDetails: { ...formData.bankAccountDetails, paypalEmail: e.target.value }
                })}
              />
            </div>
          )}

          {formData.bankAccountType === 'CRYPTO' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Red / Network *
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.bankAccountDetails.cryptoNetwork}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccountDetails: { ...formData.bankAccountDetails, cryptoNetwork: e.target.value }
                  })}
                >
                  <option value="TRC20">USDT (TRC20 - Tron)</option>
                  <option value="ERC20">USDT (ERC20 - Ethereum)</option>
                  <option value="BEP20">USDT (BEP20 - BSC)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección de Wallet *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.bankAccountDetails.cryptoAddress}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccountDetails: { ...formData.bankAccountDetails, cryptoAddress: e.target.value }
                  })}
                />
              </div>
            </div>
          )}

          {formData.bankAccountType === 'OTHER' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detalles del método de pago *
              </label>
              <textarea
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe cómo quieres recibir tus pagos..."
                rows={3}
                value={formData.bankAccountDetails.otherDetails}
                onChange={(e) => setFormData({
                  ...formData,
                  bankAccountDetails: { ...formData.bankAccountDetails, otherDetails: e.target.value }
                })}
              />
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Información importante</p>
              <ul className="mt-1 list-disc list-inside space-y-1 text-blue-700">
                <li>Tus datos están protegidos y solo se usarán para procesar tus pagos</li>
                <li>Las liquidaciones se procesan los domingos</li>
                <li>Podrás modificar estos datos desde tu perfil</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Datos'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
