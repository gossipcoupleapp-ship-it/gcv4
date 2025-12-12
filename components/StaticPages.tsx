import React from 'react';
import { 
  Shield, 
  Lock, 
  Server, 
  Users, 
  Zap, 
  Heart, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  Check, 
  Globe, 
  Briefcase, 
  BookOpen, 
  FileText,
  Target,
  PieChart,
  Smartphone,
  Award,
  Star,
  Play
} from 'lucide-react';

// --- FUNCIONALIDADES (Features) ---
export const FeaturesView: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Funcionalidades</h1>
      <p className="text-xl text-gray-500">Ferramentas poderosas para a vida financeira a dois.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <FeatureCard 
        icon={<MessageSquare className="text-white" size={24} />}
        color="bg-purple-500"
        title="Assistente IA Financeiro"
        description="Converse com nossa IA para registrar gastos, tirar dúvidas sobre investimentos ou pedir conselhos financeiros personalizados para o casal."
      />
      <FeatureCard 
        icon={<TrendingUp className="text-white" size={24} />}
        color="bg-green-500"
        title="Gestão de Investimentos"
        description="Acompanhe a carteira do casal em tempo real. Veja rentabilidade, alocação de ativos e receba insights automáticos."
      />
      <FeatureCard 
        icon={<Calendar className="text-white" size={24} />}
        color="bg-blue-500"
        title="Sincronização de Agenda"
        description="Integração nativa com Google Calendar. Visualize datas de pagamentos e eventos financeiros junto com seus compromissos sociais."
      />
      <FeatureCard 
        icon={<Target className="text-white" size={24} />}
        color="bg-red-500"
        title="Metas Compartilhadas"
        description="Definam objetivos (viagens, casa nova, reserva) e acompanhem o progresso com barras visuais e projeções de conclusão."
      />
      <FeatureCard 
        icon={<PieChart className="text-white" size={24} />}
        color="bg-orange-500"
        title="Dashboard Unificado"
        description="Tenha uma visão clara das finanças do casal em um único lugar, com gráficos intuitivos de despesas vs. receitas."
      />
      <FeatureCard 
        icon={<Smartphone className="text-white" size={24} />}
        color="bg-pink-500"
        title="Acesso Mobile & Web"
        description="Acesse de qualquer lugar. Seja no computador ou no celular, seus dados estão sempre sincronizados e seguros."
      />
    </div>

    {/* YouTube Video Section */}
    <div className="mt-16 pt-8 border-t border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Veja a Plataforma em Ação</h2>
        <p className="text-gray-500 mt-2">Descubra como simplificar a gestão financeira do casal em poucos minutos.</p>
      </div>
      <div className="w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 bg-gray-900 relative group">
        <iframe 
          width="100%" 
          height="100%" 
          src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
          title="Gossip Couple Demo Video" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        ></iframe>
      </div>
      <p className="text-center text-xs text-gray-400 mt-4">Vídeo demonstrativo das funcionalidades.</p>
    </div>
  </div>
);

const FeatureCard = ({ icon, color, title, description }: { icon: React.ReactNode, color: string, title: string, description: string }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${color}`}>
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

// --- SEGURANÇA (Security) ---
export const SecurityView: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
        <Shield size={32} />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Segurança em Primeiro Lugar</h1>
      <p className="text-lg text-gray-500">Entenda como protegemos os dados mais importantes da sua vida.</p>
    </div>

    <div className="space-y-6">
      <SecuritySection 
        icon={<Lock size={20} />}
        title="Criptografia de Ponta a Ponta"
        text="Todos os dados sensíveis são criptografados em trânsito (usando TLS 1.3) e em repouso (AES-256). Ninguém, nem mesmo nossa equipe, tem acesso às suas senhas ou dados bancários brutos."
      />
      <SecuritySection 
        icon={<Server size={20} />}
        title="Infraestrutura Isolada"
        text="Utilizamos servidores de última geração com isolamento lógico de dados. As informações de cada casal são segregadas para garantir privacidade total."
      />
      <SecuritySection 
        icon={<Users size={20} />}
        title="Privacidade da IA"
        text="Nossa Inteligência Artificial é treinada para não reter informações pessoais identificáveis. Os dados enviados para análise são anonimizados e usados estritamente para fornecer o serviço contratado."
      />
    </div>
  </div>
);

const SecuritySection = ({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) => (
  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
    </div>
    <p className="text-gray-600 leading-relaxed">{text}</p>
  </div>
);

// --- PREÇOS (Pricing) ---
export const PricingView: React.FC = () => (
  <div className="max-w-5xl mx-auto space-y-12 animate-fade-in text-center">
    <div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Plano Único e Transparente</h1>
      <p className="text-xl text-gray-500">Todas as funcionalidades para o casal por um preço acessível.</p>
    </div>

    <div className="flex justify-center items-center">
      {/* Premium Plan Only */}
      <div className="bg-gray-900 p-8 md:p-12 rounded-[2.5rem] border border-gray-800 shadow-2xl relative max-w-lg w-full text-center md:text-left overflow-hidden group">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-mid opacity-10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:opacity-20 transition-opacity duration-700"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-3xl -ml-10 -mb-10 group-hover:opacity-20 transition-opacity duration-700"></div>

        <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-primary-mid uppercase tracking-wide">Casal Premium</h3>
                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20">
                    Tudo Incluído
                </span>
            </div>
            
            <div className="flex items-baseline gap-2 mb-6 justify-center md:justify-start">
                <span className="text-5xl md:text-6xl font-extrabold text-white">R$ 29,90</span>
                <span className="text-xl font-medium text-gray-400">/mês</span>
            </div>
            
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Tenha acesso completo ao assistente IA, gestão de investimentos, agenda compartilhada e muito mais. Sem taxas ocultas.
            </p>

            <ul className="space-y-4 mb-10 text-gray-300">
                {[
                    "Acesso ilimitado para 2 pessoas",
                    "Assistente IA Financeiro Inteligente",
                    "Integração Google Calendar",
                    "Metas Compartilhadas Ilimitadas",
                    "Análise de Investimentos em Tempo Real",
                    "Gestão de Despesas e Receitas",
                    "Suporte Prioritário"
                ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 bg-green-500/20 p-1 rounded-full flex-shrink-0">
                            <Check size={12} className="text-green-400" />
                        </div> 
                        <span className="font-medium text-sm md:text-base">{item}</span>
                    </li>
                ))}
            </ul>

            <button className="w-full py-4 bg-gradient-to-r from-primary-start to-primary-mid text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-primary-start/30 hover:scale-[1.02] transition-all active:scale-[0.98]">
                Assinar Agora
            </button>
            <p className="mt-4 text-center text-xs text-gray-500">Experimente 7 dias grátis. Cancele quando quiser.</p>
        </div>
      </div>
    </div>
  </div>
);

// --- SOBRE NÓS (About) ---
export const AboutView: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Nossa História</h1>
      <p className="text-xl text-gray-500 leading-relaxed">
        Acreditamos que o dinheiro não deve ser motivo de brigas, mas sim uma ferramenta para realizar sonhos a dois.
      </p>
    </div>

    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
      <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Heart className="text-primary-start" fill="currentColor" size={24} /> Como tudo começou
      </h3>
      <p className="text-gray-600 leading-relaxed mb-6">
        O Gossip Couple nasceu de uma necessidade real. Alex e Sam (nossos fundadores fictícios e personas do app) perceberam que gerenciar finanças em planilhas separadas e apps individuais criava ruído na comunicação. Faltava uma visão unificada.
      </p>
      <p className="text-gray-600 leading-relaxed">
        Em 2023, decidimos criar uma solução que unisse tecnologia de ponta (IA) com a simplicidade que a vida de casal exige. Nosso objetivo é eliminar o estresse financeiro dos relacionamentos.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
        <Globe className="text-blue-600 mb-4" size={32} />
        <h4 className="font-bold text-gray-900 mb-2">Missão</h4>
        <p className="text-sm text-gray-600">Empoderar casais a alcançarem liberdade financeira através da transparência e colaboração.</p>
      </div>
      <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
        <Zap className="text-purple-600 mb-4" size={32} />
        <h4 className="font-bold text-gray-900 mb-2">Visão</h4>
        <p className="text-sm text-gray-600">Ser a plataforma global número 1 para gestão de vida e finanças de casais.</p>
      </div>
    </div>
  </div>
);

// --- CARREIRAS (Careers) ---
export const CareersView: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Trabalhe Conosco</h1>
      <p className="text-xl text-gray-500">Ajude a construir o futuro das finanças para casais.</p>
    </div>

    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-10 text-white text-center">
      <h3 className="text-2xl font-bold mb-4">Estamos sempre procurando talentos</h3>
      <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
        Se você é apaixonado por fintech, IA e design centrado no usuário, queremos te conhecer. Valorizamos autonomia, diversidade e impacto real.
      </p>
      <button className="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors">
        Ver Vagas no LinkedIn
      </button>
    </div>

    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Briefcase size={24} className="text-gray-400" /> Vagas em destaque
      </h3>
      <div className="space-y-4">
        {['Senior Frontend Engineer (React)', 'Product Designer (UX/UI)', 'Growth Marketing Manager'].map((job, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-primary-mid/30 transition-colors cursor-pointer group">
            <div>
              <h4 className="font-bold text-gray-800 group-hover:text-primary-mid transition-colors">{job}</h4>
              <p className="text-sm text-gray-500">Remoto • Tempo Integral</p>
            </div>
            <span className="text-primary-start font-bold text-sm">Aplicar &rarr;</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- BLOG (Blog) ---
export const BlogView: React.FC = () => (
  <div className="max-w-5xl mx-auto space-y-12 animate-fade-in">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog do Casal</h1>
      <p className="text-xl text-gray-500">Dicas, histórias e guias sobre finanças e relacionamento.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
          <div className="h-48 bg-gray-200 relative overflow-hidden">
             <img src={`https://picsum.photos/seed/${i + 10}/800/600`} alt="Blog Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
             <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800">
                Finanças
             </div>
          </div>
          <div className="p-6">
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
               <Calendar size={12} /> 24 Out 2023
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary-mid transition-colors">
              5 Dicas para conversar sobre dinheiro sem brigar
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
              Falar sobre finanças pode ser tabu para muitos casais. Descubra técnicas de comunicação não-violenta para alinhar seus objetivos financeiros.
            </p>
            <button className="mt-4 text-sm font-bold text-primary-start hover:underline">Ler artigo completo</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- TERMOS (Terms) ---
export const TermsView: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
    <div className="text-center mb-8">
       <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
         <FileText size={32} />
       </div>
       <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Termos de Serviço</h1>
       <p className="text-gray-500 mt-2">Última atualização: 24 de Outubro de 2023</p>
    </div>

    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8 text-sm text-gray-600 leading-relaxed">
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
        <p>
          Ao acessar e usar o Gossip Couple ("Serviço"), você aceita e concorda em estar vinculado aos termos e disposições deste acordo.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">2. Descrição do Serviço</h2>
        <p>
          O Gossip Couple é uma plataforma de gestão financeira e organização pessoal para casais, oferecendo ferramentas de rastreamento de despesas, metas, calendário e assistência via Inteligência Artificial.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">3. Contas de Usuário</h2>
        <p>
          Você é responsável por manter a confidencialidade de sua conta e senha. Você concorda em aceitar a responsabilidade por todas as atividades que ocorram sob sua conta.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">4. Assinaturas e Pagamentos</h2>
        <p>
          Alguns aspectos do Serviço podem ser cobrados ("Assinatura Premium"). Você concorda em pagar todas as taxas associadas à sua assinatura. O cancelamento pode ser feito a qualquer momento, mantendo-se o acesso até o fim do período faturado.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">5. Propriedade Intelectual</h2>
        <p>
          O Serviço e seu conteúdo original, recursos e funcionalidades são e permanecerão de propriedade exclusiva do Gossip Couple e seus licenciadores.
        </p>
      </section>

      <div className="pt-6 border-t border-gray-100">
         <p>
           Para questões legais ou dúvidas sobre estes termos, entre em contato através do email <a href="mailto:legal@gossipcouple.com" className="text-primary-start font-bold">legal@gossipcouple.com</a>.
         </p>
      </div>
    </div>
  </div>
);