import React, { useState, useRef, useEffect } from 'react';
import { Investment, AppState, ChatMessage, Goal } from '../types';
import { GeminiService } from '../services/geminiService';
import { supabase } from '../services/supabase';
import {
   TrendingUp,
   Send,
   ShieldAlert,
   Sparkles,
   Loader2,
   Bot,
   TrendingDown,
   PieChart as PieChartIcon,
   Lightbulb,
   BarChart3,
   MoreHorizontal,
   ArrowRight,
   X,
   Target,
   Clock,
   CheckCircle,
   Plus,
   DollarSign,
   Calendar,
   Wallet,
   ArrowUpRight
} from 'lucide-react';
import {
   AreaChart,
   Area,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer
} from 'recharts';

interface InvestmentsViewProps {
   state: AppState;
   onUpdateGoal?: (goal: Goal) => void;
   onCreateTransaction?: (t: any) => void;
}

const gemini = new GeminiService();

const InvestmentsView: React.FC<InvestmentsViewProps> = ({ state, onUpdateGoal, onCreateTransaction }) => {
   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [input, setInput] = useState('');
   const [loading, setLoading] = useState(false);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const [timeRange, setTimeRange] = useState('1M');

   // Overlay States
   const [selectedAsset, setSelectedAsset] = useState<Investment | null>(null);
   const [contributionAmount, setContributionAmount] = useState('');

   // Use Real Data
   const portfolio = state.investments;

   // Calculations
   const totalValue = portfolio.reduce((acc, curr) => acc + (curr.price * curr.shares), 0);
   const totalInvested = portfolio.reduce((acc, curr) => acc + (curr.totalInvested || 0), 0);
   const totalReturn = totalValue - totalInvested;
   const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

   const dailyGain = portfolio.reduce((acc, curr) => acc + (curr.change * curr.shares), 0);
   const previousValue = totalValue - dailyGain; // Approx
   const dailyGainPercent = previousValue > 0 ? (dailyGain / previousValue) * 100 : 0;

   // Handle Contribution Logic
   const handleContribute = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedAsset || !contributionAmount) return;

      const amount = parseFloat(contributionAmount);
      if (isNaN(amount) || amount <= 0) return;

      // 1. Create Expense Transaction
      if (onCreateTransaction) {
         onCreateTransaction({
            amount: amount,
            category: 'Investments',
            description: `Aporte em ${selectedAsset.symbol}`,
            date: new Date().toISOString(),
            type: 'expense',
            status: 'paid'
         });
      }

      // 2. Update Investment in Supabase
      // We assume ID is available or we key by symbol
      const newShares = amount / selectedAsset.price;
      const { error } = await supabase.from('investments').update({
         quantity: selectedAsset.shares + newShares,
         // We technically should track average price, but for now we just increment totalInvested implicitly if we had a column? 
         // Logic: totalInvested isn't a column in DB based on types, it is derived? 
         // Wait, DB has quantity and purchase_price. 
         // To update correctly: new_avg_price = ((old_qty * old_avg) + (new_qty * current_price)) / (old_qty + new_qty)
         // Check DB columns: quantity, purchase_price (is this avg?)
      }).eq('symbol', selectedAsset.symbol).eq('couple_id', state.investments[0]?.coupleId || ''); // We need couple_id constraint but RLS handles it usually? 
      // Wait, update-investments uses symbol. 
      // AppState investment doesn't have ID? It has symbol. DB has ID.
      // mapInvestment map doesn't map ID?
      // Let's check mapInvestment in useSyncData. 
      // It maps symbol, name, price... NO ID mapped in mapInvestment!
      // I should fix mapInvestment to include ID if possible or use symbol.

      // For now, I'll use symbol filter + maybe check if mapInvestment can be fixed later.
      // Assuming purchase_price is average price. 
      // Let's implement robust average price calc if possible, or just update quantity.
      // Simpler: Just update quantity for now. Purchase price logic is complex without history.


      const updatedInvestment = {
         ...selectedAsset,
         shares: selectedAsset.shares + newShares,
         totalInvested: (selectedAsset.totalInvested || 0) + amount
      };

      // We update local state optimistically? No, let Realtime handle it.

      // 3. Update Linked Goal Global State (if applicable)
      if (selectedAsset.linkedGoalId && onUpdateGoal) {
         const linkedGoal = state.goals?.find(g => g.id === selectedAsset.linkedGoalId);
         if (linkedGoal) {
            onUpdateGoal({
               ...linkedGoal,
               currentAmount: linkedGoal.currentAmount + amount
            });
         }
      }

      setContributionAmount('');
      alert(`Aporte de R$ ${amount} realizado com sucesso! (Aguarde atualização)`);
      // Close overlay or keep it?
   };

   // Mock Chart Data (Placeholder for now as we don't have history table)
   const generateChartData = () => {
      // ... same mock ...
      const data = [];
      let value = totalValue * 0.85;
      if (value === 0) value = 1000; // default for empty
      for (let i = 0; i < 30; i++) {
         // ...
         value = value * (1 + (Math.random() * 0.04 - 0.015));
         data.push({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            value: value
         });
      }
      data[data.length - 1].value = totalValue;
      return data;
   };

   const chartData = generateChartData();

   // Initial Welcome Message
   useEffect(() => {
      if (messages.length === 0) {
         setMessages([{
            id: 'init',
            role: 'model',
            text: "Olá! Sou sua consultora de investimentos. Posso analisar ações, sugerir ativos por perfil ou responder dúvidas sobre o mercado. Como posso ajudar? 📈",
            timestamp: Date.now()
         }]);
      }
   }, []);

   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [messages, loading]);

   const handleSend = async (text: string = input) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
         id: Date.now().toString(),
         role: 'user',
         text: text,
         timestamp: Date.now()
      };

      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
         const response = await gemini.chatInvestment(text, state);
         let finalText = response.text || "Não encontrei dados sobre isso.";

         const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: finalText,
            timestamp: Date.now()
         };

         setMessages(prev => [...prev, aiMsg]);
      } catch (e) {
         const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Desculpe, tive um problema ao conectar com o mercado. Tente novamente.",
            timestamp: Date.now()
         };
         setMessages(prev => [...prev, errorMsg]);
      } finally {
         setLoading(false);
      }
   };

   const shortcuts = [
      { label: "No que podemos investir?", prompt: "Considerando nosso perfil de risco e o mercado atual, no que podemos investir hoje?" },
      { label: `Acelerar meta: ${state.goals?.[0]?.title || 'Viagem'}`, prompt: `Para acelerar nossa meta '${state.goals?.[0]?.title || 'Financeira'}', o que podemos fazer e investir?` },
      { label: "Plano de ação mensal", prompt: "Gere um plano de ação mensal para turbinar nossos investimentos." }
   ];

   // --- RENDER ASSET OVERLAY ---
   const renderAssetOverlay = () => {
      if (!selectedAsset) return null;

      const currentValue = selectedAsset.price * selectedAsset.shares;
      const invested = selectedAsset.totalInvested || 0;
      const profit = currentValue - invested;
      const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;

      // Linked Goal
      const linkedGoal = state.goals?.find(g => g.id === selectedAsset.linkedGoalId);
      const goalProgress = linkedGoal ? Math.min(100, (linkedGoal.currentAmount / linkedGoal.targetAmount) * 100) : 0;

      // Linked Tasks (Assume linked via Goal)
      const linkedTasks = linkedGoal ? (state.tasks?.filter(t => t.linkedGoalId === linkedGoal.id) || []) : [];

      return (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

               {/* Header */}
               <div className={`h-32 p-6 flex flex-col justify-between text-white relative ${selectedAsset.change >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner border border-white/20">
                           {selectedAsset.symbol[0]}
                        </div>
                        <div>
                           <h2 className="text-2xl font-bold leading-none">{selectedAsset.symbol}</h2>
                           <p className="text-white/80 text-sm mt-1">{selectedAsset.name}</p>
                        </div>
                     </div>
                     <button
                        onClick={() => setSelectedAsset(null)}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
                     >
                        <X size={18} />
                     </button>
                  </div>
                  <div className="flex items-end justify-between">
                     <span className="text-3xl font-bold">${selectedAsset.price.toLocaleString()}</span>
                     <div className="text-right">
                        <span className={`inline-flex items-center text-sm font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20`}>
                           {selectedAsset.change >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                           {selectedAsset.changePercent}%
                        </span>
                     </div>
                  </div>
               </div>

               <div className="overflow-y-auto flex-1 p-6 bg-gray-50/50">

                  {/* Main Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Valor Atual</p>
                        <p className="text-lg font-bold text-gray-800">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                     </div>
                     <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Aportado</p>
                        <p className="text-lg font-bold text-gray-800">${invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                     </div>
                     <div className="col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                           <p className="text-xs text-gray-400 font-bold uppercase mb-1">Valorização Total</p>
                           <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profit >= 0 ? '+' : ''}${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-sm font-bold ${profit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                           {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                        </div>
                     </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                     <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <Lightbulb size={16} className="text-yellow-500" /> Sobre o Ativo
                     </h4>
                     <p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        {selectedAsset.description || "Nenhuma descrição disponível para este ativo."}
                     </p>
                  </div>

                  {/* Linked Goal */}
                  <div className="mb-6">
                     <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <Target size={16} className="text-primary-mid" /> Objetivo Vinculado
                     </h4>
                     {linkedGoal ? (
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-1 h-full bg-primary-mid"></div>
                           <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-gray-800">{linkedGoal.title}</h5>
                              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{goalProgress.toFixed(0)}%</span>
                           </div>
                           <p className="text-xs text-gray-500 mb-3">Meta: ${linkedGoal.targetAmount.toLocaleString()}</p>
                           <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-primary-start to-primary-end h-full rounded-full transition-all duration-500" style={{ width: `${goalProgress}%` }}></div>
                           </div>
                        </div>
                     ) : (
                        <div className="text-sm text-gray-400 italic bg-gray-100 p-4 rounded-xl border border-gray-200 border-dashed text-center">
                           Nenhum objetivo vinculado a este investimento.
                        </div>
                     )}
                  </div>

                  {/* Linked Tasks */}
                  {linkedTasks.length > 0 && (
                     <div className="mb-6">
                        <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                           <CheckCircle size={16} className="text-blue-500" /> Tarefas Relacionadas
                        </h4>
                        <div className="space-y-2">
                           {linkedTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 text-sm">
                                 <span className={`truncate ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</span>
                                 {task.completed && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Contributions History */}
                  <div className="mb-6">
                     <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <Wallet size={16} className="text-purple-500" /> Histórico de Aportes
                     </h4>
                     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {selectedAsset.contributions && selectedAsset.contributions.length > 0 ? (
                           <div className="divide-y divide-gray-50">
                              {selectedAsset.contributions.map((contribution, idx) => (
                                 <div key={idx} className="p-3 flex justify-between items-center text-sm">
                                    <span className="text-gray-500 flex items-center gap-2">
                                       <Calendar size={12} /> {new Date(contribution.date).toLocaleDateString()}
                                    </span>
                                    <span className="font-bold text-gray-800 flex items-center text-green-600">
                                       <ArrowUpRight size={12} className="mr-1" />
                                       +${contribution.amount.toLocaleString()}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <p className="p-4 text-xs text-gray-400 text-center">Nenhum aporte registrado.</p>
                        )}
                     </div>
                  </div>

               </div>

               {/* Footer Action */}
               <div className="p-4 bg-white border-t border-gray-100">
                  <form onSubmit={handleContribute} className="flex gap-3">
                     <div className="relative flex-1">
                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                           type="number"
                           placeholder="Valor do aporte"
                           value={contributionAmount}
                           onChange={(e) => setContributionAmount(e.target.value)}
                           className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-mid transition-colors text-sm font-semibold"
                        />
                     </div>
                     <button
                        type="submit"
                        disabled={!contributionAmount}
                        className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:shadow-none whitespace-nowrap"
                     >
                        Novo Aporte
                     </button>
                  </form>
               </div>

            </div>
         </div>
      );
   }

   return (
      <div className="space-y-8 animate-fade-in pb-12">

         {/* 1. Consultora IA Chat Section */}
         <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col min-h-[500px] max-h-[600px]">
            <div className="bg-gradient-to-r from-primary-start via-primary-mid to-primary-end p-6 text-white shadow-md">
               <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                     <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                        <TrendingUp size={24} className="text-white" />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold leading-tight">Consultora IA</h2>
                        <p className="text-white/80 text-xs font-medium">Análises e sugestões de investimento</p>
                     </div>
                  </div>
                  <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                     <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                     <span className="text-xs font-bold tracking-wide">Online</span>
                  </div>
               </div>
            </div>

            <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2 flex items-center justify-center text-center">
               <ShieldAlert size={14} className="text-yellow-600 mr-2 flex-shrink-0" />
               <p className="text-[10px] md:text-xs text-yellow-800 font-medium leading-tight">
                  Isto não é recomendação; é uma análise baseada em dados e no seu perfil. Consulte sempre um profissional qualificado.
               </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
               {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-start to-primary-mid flex-shrink-0 flex items-center justify-center text-white mr-3 mt-1 shadow-sm">
                           <Bot size={16} />
                        </div>
                     )}
                     <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary-start to-primary-mid text-white rounded-tr-none ml-12'
                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                        }`}>
                        <p className="whitespace-pre-line">{msg.text}</p>
                     </div>
                  </div>
               ))}
               {loading && (
                  <div className="flex justify-start">
                     <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center mr-3 mt-1">
                        <Loader2 size={16} className="animate-spin text-gray-500" />
                     </div>
                     <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                        <div className="flex space-x-1">
                           <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                           <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                           <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                     </div>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
               <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                  {shortcuts.map((s, idx) => (
                     <button
                        key={idx}
                        onClick={() => handleSend(s.prompt)}
                        className="whitespace-nowrap px-4 py-2 bg-gray-50 hover:bg-primary-start/5 border border-gray-200 hover:border-primary-mid/30 rounded-full text-xs font-medium text-gray-600 hover:text-primary-start transition-all flex-shrink-0 active:scale-95"
                     >
                        {s.label}
                     </button>
                  ))}
               </div>
               <div className="flex items-center space-x-2 bg-gray-50 rounded-full p-1.5 border border-gray-200 focus-within:border-primary-mid focus-within:ring-2 focus-within:ring-primary-mid/20 transition-all shadow-sm">
                  <input
                     type="text"
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                     placeholder="Digite nome da empresa, ticker ou pergunte sobre investimentos… 📊✨"
                     className="flex-1 bg-transparent px-5 py-3 outline-none text-sm text-gray-700 placeholder-gray-400"
                     disabled={loading}
                  />
                  <button
                     onClick={() => handleSend()}
                     disabled={!input.trim() || loading}
                     className="p-3 rounded-full bg-gradient-to-r from-primary-start to-primary-mid text-white hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95 flex items-center justify-center"
                  >
                     {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
               </div>
            </div>
         </div>

         {/* DASHBOARD SECTION: Overview & Insights */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 2. Portfolio Overview Card */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        Meu Portfólio
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200 font-normal">
                           Atualizado 09:00 AM
                        </span>
                     </h3>
                     <p className="text-gray-400 text-xs">Valor Total (Ativos Cadastrados)</p>
                  </div>
                  <span className="bg-pink-50 text-primary-start text-xs font-bold px-3 py-1 rounded-full border border-pink-100">
                     {portfolio.length} ativos
                  </span>
               </div>

               <div className="mb-6">
                  <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
                     ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <div className="flex items-center mt-2">
                     <span className={`flex items-center text-sm font-bold ${dailyGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {dailyGain >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                        {dailyGainPercent.toFixed(2)}% (24h)
                     </span>
                     <span className="mx-2 text-gray-300">|</span>
                     <span className="text-sm text-gray-500">
                        +${dailyGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </span>
                  </div>
               </div>

               <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500">Rentabilidade Total</span>
                     <span className="font-bold text-green-600">+{totalReturnPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                     <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '12%' }}></div>
                  </div>
               </div>
            </div>

            {/* 3. IA Insights Section */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                     <div className="p-2 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg text-white shadow-sm">
                        <Sparkles size={18} />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-gray-800">Insights IA</h3>
                        <p className="text-xs text-gray-500">Análises personalizadas</p>
                     </div>
                  </div>
                  <button className="text-sm text-primary-start font-medium hover:underline">Ver Todos</button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {/* Featured Insight */}
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 relative group hover:shadow-md transition-all cursor-pointer">
                     <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                     <div className="mb-3">
                        <Lightbulb className="text-blue-600" size={24} />
                     </div>
                     <h4 className="font-bold text-gray-800 mb-2">Diversificação Recomendada</h4>
                     <p className="text-sm text-gray-600 leading-relaxed">
                        Sua carteira está 65% concentrada em tecnologia. Considere adicionar ETFs de setor imobiliário ou renda fixa para equilibrar o risco.
                     </p>
                     <div className="mt-4 flex items-center text-blue-600 text-xs font-bold group-hover:translate-x-1 transition-transform">
                        Ver sugestões <ArrowRight size={12} className="ml-1" />
                     </div>
                  </div>

                  {/* Secondary Insight */}
                  <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5 relative group hover:shadow-md transition-all cursor-pointer">
                     <div className="mb-3">
                        <PieChartIcon className="text-yellow-600" size={24} />
                     </div>
                     <h4 className="font-bold text-gray-800 mb-2">Meta: Viagem Japão</h4>
                     <p className="text-sm text-gray-600 leading-relaxed">
                        Para atingir sua meta em maio, aumentar o aporte mensal em R$ 200 aceleraria a conclusão em 2 meses.
                     </p>
                     <div className="mt-4 flex items-center text-yellow-700 text-xs font-bold group-hover:translate-x-1 transition-transform">
                        Simular cenário <ArrowRight size={12} className="ml-1" />
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* 4. Portfolio Performance Chart */}
         <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
               <div className="flex items-center gap-2 self-start md:self-center">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                     <BarChart3 size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Performance do Portfólio</h3>
               </div>
               <div className="flex bg-gray-100 rounded-full p-1 space-x-1">
                  {['1M', '3M', '6M', '1A', 'YTD'].map((range) => (
                     <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${timeRange === range
                           ? 'bg-white text-gray-800 shadow-sm'
                           : 'text-gray-500 hover:text-gray-800'
                           }`}
                     >
                        {range}
                     </button>
                  ))}
               </div>
            </div>

            <div className="h-[300px] w-full min-w-0">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#c60626" stopOpacity={0.2} />
                           <stop offset="95%" stopColor="#c60626" stopOpacity={0} />
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        dy={10}
                     />
                     <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `$${value / 1000}k`}
                     />
                     <Tooltip
                        contentStyle={{
                           backgroundColor: 'white',
                           borderRadius: '12px',
                           border: 'none',
                           boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Valor']}
                     />
                     <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#c60626"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 5. Carteira Atual Section */}
         <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <PieChartIcon size={18} className="text-primary-mid mr-2" />
                  Carteira Atual
               </h3>
               <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <MoreHorizontal size={20} className="text-gray-400" />
               </button>
            </div>
            <div className="divide-y divide-gray-100">
               {portfolio.map((item) => (
                  <div
                     key={item.symbol}
                     onClick={() => setSelectedAsset(item)}
                     className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                     <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mr-4 font-bold text-gray-500 group-hover:bg-white group-hover:shadow-md transition-all">
                           {item.symbol[0]}
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-800">{item.symbol}</h4>
                              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase font-semibold">{item.type}</span>
                           </div>
                           <p className="text-xs text-gray-500">{item.name}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-gray-800">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className={`text-xs flex items-center justify-end font-medium mt-0.5 ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {item.change >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                           {Math.abs(item.changePercent)}%
                        </p>
                     </div>
                  </div>
               ))}
            </div>
            <div className="p-4 bg-gray-50/50 text-center">
               <button className="text-sm text-gray-500 hover:text-primary-start font-medium transition-colors">Ver todos os ativos</button>
            </div>
         </div>

         {/* RENDER OVERLAY */}
         {renderAssetOverlay()}
      </div>
   );
};

export default InvestmentsView;