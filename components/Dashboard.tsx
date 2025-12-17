import React, { useState, useEffect } from 'react';
import { AppState } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, CheckCircle, Clock, Send, Sparkles, Calendar as CalendarIcon, Target, DollarSign } from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onOpenChat: (initialMsg?: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onOpenChat }) => {
  const [input, setInput] = useState('');
  const [activeActionIndex, setActiveActionIndex] = useState(0);

  const quickActions = [
    { label: "Adicionar no Google Calendar", icon: <CalendarIcon size={14} />, prompt: "Agende um evento no Google Calendar para amanhã" },
    { label: "Adicionar despesa", icon: <DollarSign size={14} />, prompt: "Adicionar uma despesa de jantar de R$150" },
    { label: "Criar objetivo", icon: <Target size={14} />, prompt: "Quero criar um objetivo de viagem" },
    { label: "Ver resumo da semana", icon: <TrendingUp size={14} />, prompt: "Como foram meus gastos essa semana?" },
    { label: "Analisar um novo investimento", icon: <TrendingUp size={14} />, prompt: "Analise as ações da Apple para mim" },
    { label: "Revisar investimentos", icon: <DollarSign size={14} />, prompt: "Como está minha carteira de investimentos?" }
  ];

  // Cycle visible actions every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveActionIndex((prev) => (prev + 1) % Math.ceil(quickActions.length / 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const visibleActions = quickActions.slice(activeActionIndex * 3, activeActionIndex * 3 + 3);

  const handleQuickAction = (prompt: string) => {
    onOpenChat(prompt);
  };

  const handleSend = () => {
    if (input.trim()) {
      onOpenChat(input);
      setInput('');
    }
  };

  const totalIncome = state.transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = state.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpenses;

  const data = [
    { name: 'Expenses', value: totalExpenses },
    { name: 'Savings', value: Math.max(0, balance) },
  ];

  const COLORS = ['#c60626', '#ea7580'];

  // Mock data for chart projection
  const projectionData = [
    { month: 'Jan', amount: 12000 },
    { month: 'Feb', amount: 13500 },
    { month: 'Mar', amount: 11000 },
    { month: 'Apr', amount: 15000 },
    { month: 'May', amount: 18000 },
    { month: 'Jun', amount: 21000 },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* Central AI Agent Widget */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative p-4 md:p-8 flex flex-col items-center text-center">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-start via-primary-mid to-primary-end"></div>

        {/* Header */}
        <div className="flex flex-col items-center mb-4 md:mb-6">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary-start to-primary-end p-0.5 shadow-lg mb-3">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <Sparkles className="text-primary-start fill-primary-start/20 w-6 h-6 md:w-7 md:h-7" />
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            Assistente IA
            <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full border border-green-200 font-medium">Online</span>
          </h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Seu planejador financeiro pessoal</p>
        </div>

        {/* Input Field */}
        <div className="w-full max-w-2xl relative z-10 mb-5 md:mb-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-start to-primary-end rounded-full opacity-30 group-hover:opacity-50 blur transition duration-200"></div>
            <div className="relative flex items-center bg-white rounded-full p-1 shadow-sm border border-gray-100">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Converse comigo... pergunte ou me peça qualquer tarefa ✨"
                className="flex-1 bg-transparent px-4 py-2.5 md:px-6 md:py-3 outline-none text-gray-700 placeholder-gray-400 text-sm md:text-base"
              />
              <button
                onClick={handleSend}
                className="p-2.5 md:p-3 rounded-full bg-gradient-to-r from-primary-start to-primary-mid text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <Send size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Carousel */}
        <div className="w-full max-w-4xl">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Sugestões Rápidas</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 transition-all duration-500 ease-in-out">
            {visibleActions.map((action, idx) => (
              <button
                key={`${activeActionIndex}-${idx}`}
                onClick={() => handleQuickAction(action.prompt)}
                className="flex items-center justify-center space-x-2 bg-gray-50 hover:bg-white border border-gray-100 hover:border-primary-mid/30 py-2.5 px-3 md:py-3 md:px-4 rounded-xl transition-all duration-300 hover:shadow-md group animate-fade-in-up"
              >
                <span className="p-1 md:p-1.5 bg-white rounded-full text-primary-mid shadow-sm group-hover:text-primary-start group-hover:scale-110 transition-transform">
                  {action.icon}
                </span>
                <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 truncate max-w-full">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {state.transactions.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center animate-fade-in">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-mid">
            <TrendingUp size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Vamos começar sua jornada financeira!</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Adicione suas primeiras despesas ou receitas para ver seus indicadores ganharem vida.</p>
          <button
            onClick={() => onOpenChat("Adicionar uma despesa de ")}
            className="px-6 py-3 bg-primary-mid text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            Adicionar Primeira Despesa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-start to-primary-mid opacity-5 rounded-bl-full transition-transform group-hover:scale-110"></div>
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Total Balance</h3>
            <p className="text-3xl font-bold text-gray-800">${balance.toLocaleString()}</p>
            <div className="flex items-center mt-2 text-green-500 text-xs font-medium">
              <TrendingUp size={14} className="mr-1" />
              <span>+12.5% vs last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Monthly Expenses</h3>
            <p className="text-3xl font-bold text-gray-800">${totalExpenses.toLocaleString()}</p>
            <div className="flex items-center mt-2 text-red-500 text-xs font-medium">
              <TrendingDown size={14} className="mr-1" />
              <span>-2.1% vs last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Active Goals</h3>
            <p className="text-3xl font-bold text-gray-800">{(state.goals || []).filter(g => g.status === 'in-progress').length}</p>
            <div className="flex items-center mt-2 text-primary-mid text-xs font-medium">
              <CheckCircle size={14} className="mr-1" />
              <span>On track</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Wealth Projection</h3>
          {state.transactions.length > 0 ? (
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#c60626" strokeWidth={3} dot={{ r: 4, fill: '#c60626', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-10">
              <TrendingUp size={48} className="mb-4 text-gray-200" />
              <p className="text-sm">Gráfico de projeção disponível após primeiras movimentações.</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-800 mb-2 self-center">Cash Flow</h3>
          {state.transactions.length > 0 ? (
            <>
              <div className="h-48 w-full relative min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ratio</span>
                </div>
              </div>
              <div className="flex justify-between w-full mt-4 text-xs text-gray-500 font-medium">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-[#c60626] mr-2"></div> Expenses
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-[#ea7580] mr-2"></div> Savings
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-10">
              <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center mb-4">
                <span className="text-xs">Sem dados</span>
              </div>
              <p className="text-sm">Fluxo de caixa vazio.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;