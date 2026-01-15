'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Copy, Check, ExternalLink, Package } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
  currency: string;
  billingType: 'ONE_TIME' | 'SUBSCRIPTION';
  billingPeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  telegramChannelId?: string;
  active: boolean;
}

interface TelegramChannel {
  id: string;
  channelId: string;
  channelTitle: string;
  inviteLink?: string;
  isActive: boolean;
}

interface TipsterProductsViewProps {
  products: Product[];
  channels: TelegramChannel[];
  appUrl: string;
  formatPrice: (cents: number) => string;
  onCreateProduct: (data: ProductFormData) => Promise<void>;
  onUpdateProduct: (id: string, data: ProductFormData) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
}

export interface ProductFormData {
  title: string;
  description: string;
  priceCents: number;
  billingType: 'ONE_TIME' | 'SUBSCRIPTION';
  billingPeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  telegramChannelId: string; // '' = sin canal
  active: boolean;
}

export default function TipsterProductsView({
  products,
  channels,
  appUrl,
  formatPrice,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onToggleActive,
}: TipsterProductsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    priceCents: 0,
    billingType: 'ONE_TIME',
    billingPeriod: 'MONTHLY',
    telegramChannelId: '',
    active: true,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priceCents: 0,
      billingType: 'ONE_TIME',
      billingPeriod: 'MONTHLY',
      telegramChannelId: '',
      active: true,
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      title: product.title,
      description: product.description || '',
      priceCents: product.priceCents,
      billingType: product.billingType,
      billingPeriod: product.billingPeriod || 'MONTHLY',
      telegramChannelId: product.telegramChannelId || '',
      active: product.active,
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, formData);
      } else {
        await onCreateProduct(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyCheckoutLink = (productId: string) => {
    const link = `${appUrl}/checkout/${productId}`;
    const text = `\u00a1Accede a mi contenido premium!\n${link}`;
    navigator.clipboard.writeText(text);
    setCopiedId(productId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBillingLabel = (type: string, period?: string) => {
    if (type === 'ONE_TIME') return 'Pago \u00fanico';
    switch (period) {
      case 'MONTHLY': return 'Mensual';
      case 'QUARTERLY': return 'Trimestral';
      case 'YEARLY': return 'Anual';
      default: return 'Suscripci\u00f3n';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Productos</h1>
          <p className="text-gray-500 mt-1">Crea y gestiona tus productos de pago</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Pron\u00f3sticos Premium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripci\u00f3n</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe qu\u00e9 incluye este producto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (EUR) *</label>
                  <input
                    type="number"
                    value={formData.priceCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, priceCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="29.99"
                    min="0.50"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pago *</label>
                  <select
                    value={formData.billingType}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value as 'ONE_TIME' | 'SUBSCRIPTION' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ONE_TIME">Pago \u00fanico</option>
                    <option value="SUBSCRIPTION">Suscripci\u00f3n</option>
                  </select>
                </div>
              </div>

              {formData.billingType === 'SUBSCRIPTION' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de cobro</label>
                  <select
                    value={formData.billingPeriod}
                    onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MONTHLY">Mensual</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canal de Telegram</label>
                <select
                  value={formData.telegramChannelId}
                  onChange={(e) => setFormData({ ...formData, telegramChannelId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin canal (solo pago)</option>
                  {channels.filter(c => c.isActive).map((channel) => (
                    <option key={channel.id} value={channel.channelId}>
                      {channel.channelTitle}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.telegramChannelId 
                    ? 'El cliente recibir\u00e1 acceso al canal despu\u00e9s del pago'
                    : 'El cliente solo recibir\u00e1 confirmaci\u00f3n por email'
                  }
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="active" className="text-sm text-gray-700">Producto activo</label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes productos</h3>
          <p className="text-gray-500 mb-4">Crea tu primer producto para empezar a vender</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crear producto
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <div key={product.id} className={`bg-white rounded-xl p-6 border shadow-sm relative overflow-hidden ${
              product.telegramChannelId ? 'border-gray-200' : 'border-orange-300'
            }`}>
              {/* Cinta SIN CANAL */}
              {!product.telegramChannelId && (
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 transform translate-x-2 -translate-y-0 rotate-0 rounded-bl-lg">
                  SIN CANAL
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{product.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold text-blue-600">
                      {formatPrice(product.priceCents)}
                    </span>
                    <span className="text-gray-500">
                      {getBillingLabel(product.billingType, product.billingPeriod)}
                    </span>
                    {product.telegramChannelId && (
                      <span className="text-green-600">
                        📢 {channels.find(c => c.channelId === product.telegramChannelId)?.channelTitle || 'Canal vinculado'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyCheckoutLink(product.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                      copiedId === product.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Copiar link de checkout"
                  >
                    {copiedId === product.id ? <Check size={16} /> : <Copy size={16} />}
                    <span className="text-sm">{copiedId === product.id ? 'Copiado!' : 'Copiar link'}</span>
                  </button>
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
