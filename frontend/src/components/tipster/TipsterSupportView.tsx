'use client';

import { useState } from 'react';
import { HelpCircle, Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    id: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

interface TipsterSupportViewProps {
  tickets: Ticket[];
  loading: boolean;
  onCreateTicket: (subject: string, message: string) => Promise<void>;
  onReplyTicket: (ticketId: string, message: string) => Promise<void>;
  onRefresh: () => void;
}

export default function TipsterSupportView({
  tickets,
  loading,
  onCreateTicket,
  onReplyTicket,
  onRefresh,
}: TipsterSupportViewProps) {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) return;

    setSubmitting(true);
    try {
      await onCreateTicket(newTicket.subject, newTicket.message);
      setNewTicket({ subject: '', message: '' });
      setShowNewTicketForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSubmitting(true);
    try {
      await onReplyTicket(selectedTicket.id, replyMessage);
      setReplyMessage('');
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="text-yellow-500" size={16} />;
      case 'IN_PROGRESS': return <Clock className="text-blue-500" size={16} />;
      case 'RESOLVED': return <CheckCircle className="text-green-500" size={16} />;
      case 'CLOSED': return <CheckCircle className="text-gray-400" size={16} />;
    }
  };

  const getStatusLabel = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN': return 'Abierto';
      case 'IN_PROGRESS': return 'En proceso';
      case 'RESOLVED': return 'Resuelto';
      case 'CLOSED': return 'Cerrado';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
          <p className="text-gray-500 mt-1">Crea tickets para resolver tus dudas</p>
        </div>
        <button
          onClick={() => setShowNewTicketForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nuevo Ticket
        </button>
      </div>

      {/* New Ticket Form */}
      {showNewTicketForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Nuevo Ticket de Soporte</h2>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Resumen del problema"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
                <textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={5}
                  placeholder="Describe tu problema o consulta con detalle..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Crear Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusLabel(selectedTicket.status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    #{selectedTicket.id.slice(-6)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                \u2715
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Original Message */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">{selectedTicket.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(selectedTicket.createdAt).toLocaleString('es-ES')}
                </p>
              </div>

              {/* Responses */}
              {selectedTicket.responses.map((response) => (
                <div
                  key={response.id}
                  className={`rounded-lg p-4 ${
                    response.isAdmin ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium ${
                      response.isAdmin ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {response.isAdmin ? 'Soporte' : 'T\u00fa'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{response.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(response.createdAt).toLocaleString('es-ES')}
                  </p>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            {selectedTicket.status !== 'CLOSED' && (
              <form onSubmit={handleReply} className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Escribe tu respuesta..."
                  />
                  <button
                    type="submit"
                    disabled={submitting || !replyMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-2">Cargando tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes tickets</h3>
          <p className="text-gray-500 mb-4">Crea un ticket si necesitas ayuda</p>
          <button
            onClick={() => setShowNewTicketForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crear ticket
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getStatusIcon(ticket.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                    <p className="text-sm text-gray-500 line-clamp-1">{ticket.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ticket.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ticket.responses.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MessageSquare size={12} />
                      {ticket.responses.length}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
