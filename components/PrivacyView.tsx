
import React from 'react';
import { ShieldCheck, Lock, Eye, Server, Mail } from 'lucide-react';

const PrivacyView: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-3xl mx-auto">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
        
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Introdução</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Bem-vindo ao Gossip Couple. Sua privacidade é de extrema importância para nós. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nossa plataforma de gestão financeira e assistente de IA.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
             <Eye size={18} className="text-primary-mid" /> 2. Dados Coletados
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
            <li><strong>Informações de Cadastro:</strong> Nome, endereço de email e foto de perfil.</li>
            <li><strong>Dados Financeiros:</strong> Transações, saldos, metas e informações de investimentos inseridas manualmente na plataforma.</li>
            <li><strong>Dados de Uso:</strong> Interações com a IA, logs de acesso e preferências de configuração.</li>
            <li><strong>Integrações:</strong> Dados de calendário do Google (somente leitura e escrita de eventos específicos).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
             <Server size={18} className="text-primary-mid" /> 3. Consentimento para IA
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            Ao utilizar nosso Assistente IA, você concorda que dados anonimizados podem ser processados para gerar insights e sugestões personalizadas.
          </p>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800">
             Nota: Seus dados financeiros inseridos manualmente são criptografados e nunca são utilizados para treinamento de modelos públicos de IA.
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Como Usamos Seus Dados</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Utilizamos seus dados para:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Fornecer e manter o serviço Gossip Couple.</li>
            <li>Personalizar sua experiência e dashboard.</li>
            <li>Processar transações manuais e gerar relatórios.</li>
            <li>Enviar notificações importantes sobre sua conta ou segurança.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
             <Lock size={18} className="text-primary-mid" /> 5. Segurança de Dados
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Implementamos medidas de segurança técnicas e organizacionais, incluindo criptografia SSL/TLS em trânsito e em repouso, para proteger suas informações contra acesso não autorizado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. Seus Direitos</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações do aplicativo. Você também pode exportar seus dados em formato CSV.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. Política de Atualização</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Podemos atualizar esta política periodicamente. Notificaremos você sobre quaisquer alterações significativas através do aplicativo ou por email.
          </p>
        </section>

        <div className="pt-6 border-t border-gray-100">
           <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Mail size={18} className="text-gray-400" /> Contato
           </h2>
           <p className="text-sm text-gray-600">
             Se tiver dúvidas sobre esta política, entre em contato conosco:
           </p>
           <a href="mailto:gossipcoupleapp@gmail.com" className="text-primary-start font-bold hover:underline mt-1 block">
             gossipcoupleapp@gmail.com
           </a>
        </div>

      </div>
    </div>
  );
};

export default PrivacyView;
