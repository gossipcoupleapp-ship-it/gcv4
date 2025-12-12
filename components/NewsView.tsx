
import React from 'react';
import { Bell, Calendar, Star, Zap, Info } from 'lucide-react';

const NewsView: React.FC = () => {
  const news = [
    {
      id: 1,
      type: 'UPDATE',
      title: 'Novos Gráficos de Despesas',
      description: 'Agora você pode visualizar seus gastos por categoria com nosso novo gráfico interativo na aba Visão Geral.',
      date: '2 horas atrás',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    },
    {
      id: 2,
      type: 'TIP',
      title: 'Como Criar um Orçamento a Dois',
      description: 'Confira nossas dicas exclusivas para alinhar expectativas financeiras e evitar conflitos sobre dinheiro.',
      date: '1 dia atrás',
      image: 'https://images.unsplash.com/photo-1565514020176-dbf2277f2412?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    },
    {
      id: 3,
      type: 'FEATURE',
      title: 'Metas de Economia Compartilhadas',
      description: 'Defina objetivos conjuntos e acompanhe o progresso de ambos em tempo real. A IA ajuda a calcular quanto falta.',
      date: '3 dias atrás',
      image: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    }
  ];

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'TIP': return 'bg-green-100 text-green-700';
      case 'FEATURE': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'UPDATE': return 'ATUALIZAÇÃO DO APP';
      case 'TIP': return 'DICA FINANCEIRA';
      case 'FEATURE': return 'NOVA FUNCIONALIDADE';
      default: return 'NOVIDADE';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map(item => (
          <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="h-48 overflow-hidden relative">
               <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
               <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getBadgeColor(item.type)} shadow-sm`}>
                    {getBadgeLabel(item.type)}
                  </span>
               </div>
            </div>
            <div className="p-6">
              <div className="flex items-center text-xs text-gray-400 mb-3 font-medium">
                <Calendar size={12} className="mr-1" /> {item.date}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-mid transition-colors">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.description}
              </p>
              <button className="mt-4 text-sm font-bold text-primary-start hover:underline">Ler mais</button>
            </div>
          </div>
        ))}
      </div>

      {/* Newsletter Box */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary-mid opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
               <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                 <Zap className="text-yellow-400" fill="currentColor" /> Dicas Semanais
               </h3>
               <p className="text-gray-300 max-w-md">
                 Receba as melhores dicas de finanças para casais diretamente no seu email.
               </p>
            </div>
            <div className="flex w-full md:w-auto bg-white/10 rounded-full p-1 border border-white/20 backdrop-blur-sm">
               <input type="email" placeholder="Seu melhor email..." className="bg-transparent border-none outline-none text-white px-4 py-2 placeholder-gray-400 w-full" />
               <button className="bg-white text-gray-900 px-6 py-2 rounded-full font-bold hover:bg-primary-start hover:text-white transition-colors">
                  Inscrever
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default NewsView;
