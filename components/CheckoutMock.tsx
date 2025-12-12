import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, CheckCircle, Loader2, ArrowRight, Hammer } from 'lucide-react';

interface CheckoutMockProps {
  onSuccess: () => void;
}

const CheckoutMock: React.FC<CheckoutMockProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<'processing' | 'success'>('processing');

  useEffect(() => {
    // Redirect to Real Stripe Checkout
    const stripeLink = import.meta.env.VITE_STRIPE_CHECKOUT_LINK;
    if (stripeLink) {
      window.location.href = stripeLink;
    } else {
      console.error("Missing VITE_STRIPE_CHECKOUT_LINK");
      alert("Erro de configuração de pagamento.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden">

        {status === 'processing' ? (
          <div className="space-y-6 py-10">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Loader2 size={40} className="text-primary-mid animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Processando Pagamento...</h2>
            <p className="text-gray-500">Estamos conectando com o Stripe de forma segura.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto">
              <Hammer size={32} className="text-yellow-500" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Página em Construção</h2>
              <p className="text-gray-500 mb-4">
                O checkout oficial da Stripe será implementado em breve.
              </p>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-green-700 font-bold mb-1">
                  <CheckCircle size={18} /> Pagamento Simulado
                </div>
                <p className="text-xs text-green-600">Acesso Premium liberado para testes.</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Produto</span>
                <span className="font-bold text-gray-800">Gossip Couple Premium</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor</span>
                <span className="font-bold text-gray-800">R$ 29,90</span>
              </div>
            </div>

            <button
              onClick={onSuccess}
              className="w-full py-4 bg-gradient-to-r from-primary-start to-primary-mid text-white font-bold rounded-xl shadow-lg hover:shadow-primary-start/30 transition-all flex items-center justify-center gap-2 mt-4"
            >
              Avançar para Onboarding <ArrowRight size={20} />
            </button>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Lock size={12} /> Pagamento seguro simulado
        </div>
      </div>
    </div>
  );
};

export default CheckoutMock;