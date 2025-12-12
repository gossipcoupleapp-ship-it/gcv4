
import React, { useState, useEffect } from 'react';
import {
   User,
   Shield,
   Globe,
   HelpCircle,
   FileText,
   LogOut,
   ChevronRight,
   Lock,
   CreditCard,
   X,
   Camera,
   Upload,
   Check,
   Plus,
   ChevronDown,
   ChevronUp,
   Calendar,
   Copy,
   MessageCircle,
   Loader2,
   DollarSign,
   Mail
} from 'lucide-react';
import { Tab, AppState, UserRole, UserDetail } from '../types';
import { supabase } from '../src/lib/supabase';

interface SettingsViewProps {
   onNavigate: (tab: Tab) => void;
   onLogout: () => void;
   state: AppState;
   currentUserRole: UserRole;
   onUpdateUser: (role: 'user1' | 'user2', data: Partial<UserDetail>) => void;
   onUpdateCouple: (data: { coupleName?: string; riskTolerance?: 'low' | 'medium' | 'high' }) => void;
}

type ModalType =
   | 'EDIT_USER_1'
   | 'EDIT_USER_2'
   | 'COUPLE_PROFILE'
   | 'SUBSCRIPTION'
   | 'SECURITY'
   | 'GOOGLE_CALENDAR'
   | 'LANGUAGE'
   | 'FAQ'
   | null;

const SettingsView: React.FC<SettingsViewProps> = ({
   onNavigate,
   onLogout,
   state,
   currentUserRole,
   onUpdateUser,
   onUpdateCouple
}) => {
   const [activeModal, setActiveModal] = useState<ModalType>(null);

   // Local state for editing forms
   const [editUserForm, setEditUserForm] = useState<Partial<UserDetail>>({});
   const [editCoupleForm, setEditCoupleForm] = useState<{ coupleName: string, riskTolerance: 'low' | 'medium' | 'high' }>({
      coupleName: '',
      riskTolerance: 'medium'
   });

   const [language, setLanguage] = useState('pt-BR');

   // Subscription Edit State
   const [isEditingPayment, setIsEditingPayment] = useState(false);
   const [isSavingPayment, setIsSavingPayment] = useState(false);
   const [paymentForm, setPaymentForm] = useState({
      cardName: 'Alex Silva',
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/25',
      cvc: '123'
   });

   // Mock Calendar Connection State (Local UI state for demo)
   const [calendarStatus, setCalendarStatus] = useState({
      user1: true,
      user2: false
   });

   const closeModal = () => {
      setActiveModal(null);
      setIsEditingPayment(false);
      setEditUserForm({});
   };

   const handleOpenEditUser = (role: 'user1' | 'user2') => {
      // Strict Permission Check
      if ((role === 'user1' && currentUserRole !== 'P1') || (role === 'user2' && currentUserRole !== 'P2')) {
         return; // Do nothing if trying to edit other user
      }

      const user = state.userProfile[role];
      setEditUserForm({ ...user });
      setActiveModal(role === 'user1' ? 'EDIT_USER_1' : 'EDIT_USER_2');
   };

   const handleOpenCoupleProfile = () => {
      setEditCoupleForm({
         coupleName: state.userProfile.coupleName,
         riskTolerance: state.userProfile.riskTolerance
      });
      setActiveModal('COUPLE_PROFILE');
   };

   const handleSaveUser = async (role: 'user1' | 'user2') => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         await supabase
            .from('profiles')
            .update({
               full_name: editUserForm.name,
               income: parseFloat(String(editUserForm.monthlyIncome || '0')),
               income_date: parseInt(String(editUserForm.incomeReceiptDate || '1'))
               // Note: Avatar separate flow usually, but could be added here if we had the file
            })
            .eq('id', user.id);

         // Optimistic / Local Update via Parent
         onUpdateUser(role, editUserForm);
         closeModal();
      } catch (err) {
         console.error("Error saving user profile:", err);
         alert("Erro ao salvar perfil.");
      }
   };

   const handleSaveCouple = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         // Resolve couple_id from user's profile
         const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user?.id).single();

         if (profile?.couple_id) {
            await supabase
               .from('couples')
               .update({
                  name: editCoupleForm.coupleName,
                  financial_risk_profile: editCoupleForm.riskTolerance
               })
               .eq('id', profile.couple_id);

            onUpdateCouple(editCoupleForm);
            closeModal();
         }
      } catch (err) {
         console.error("Error saving couple profile:", err);
         alert("Erro ao salvar perfil do casal.");
      }
   };

   const handleSavePayment = () => {
      setIsSavingPayment(true);
      setTimeout(() => {
         setIsSavingPayment(false);
         setIsEditingPayment(false);
      }, 1500);
   };

   const handleConnectGoogle = async () => {
      await supabase.auth.signInWithOAuth({
         provider: 'google',
         options: {
            redirectTo: window.location.href, // Return to settings page
            scopes: 'https://www.googleapis.com/auth/calendar',
            queryParams: {
               access_type: 'offline',
               prompt: 'consent',
            },
         }
      });
   };

   const toggleCalendar = (role: 'user1' | 'user2') => {
      if ((role === 'user1' && currentUserRole !== 'P1') || (role === 'user2' && currentUserRole !== 'P2')) {
         alert("Você só pode gerenciar a conexão do seu próprio calendário.");
         return;
      }

      // If getting disconnected (simulated for now, as real disconnect requires backend logic/token revocation)
      if ((role === 'user1' && calendarStatus.user1) || (role === 'user2' && calendarStatus.user2)) {
         if (confirm("Deseja desconectar sua conta do Google? Esta ação não revoga o acesso no Google, apenas limpa a sessão local.")) {
            setCalendarStatus(prev => ({ ...prev, [role]: false }));
         }
      } else {
         // Connect flow
         handleConnectGoogle();
      }
   };

   // --- RENDER MODAL CONTENT HELPERS ---

   const renderEditProfile = (role: 'user1' | 'user2') => (
      <div className="space-y-6">
         <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative group cursor-pointer">
               <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-gray-400 overflow-hidden">
                  {editUserForm.name ? editUserForm.name[0] : (role === 'user1' ? 'A' : 'S')}
               </div>
               <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
               </div>
               <button className="absolute bottom-0 right-0 bg-primary-mid text-white p-2 rounded-full shadow-md hover:bg-primary-start transition-colors">
                  <Upload size={14} />
               </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Toque para alterar a foto</p>
         </div>

         <div className="space-y-4">
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Exibição</label>
               <input
                  type="text"
                  value={editUserForm.name || ''}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none transition-colors"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Renda Mensal (R$)</label>
                  <input
                     type="number"
                     value={editUserForm.monthlyIncome || ''}
                     onChange={(e) => setEditUserForm({ ...editUserForm, monthlyIncome: e.target.value })}
                     className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none transition-colors"
                     placeholder="0.00"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia Recebimento</label>
                  <input
                     type="number"
                     min="1" max="31"
                     value={editUserForm.incomeReceiptDate || ''}
                     onChange={(e) => setEditUserForm({ ...editUserForm, incomeReceiptDate: e.target.value })}
                     className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none transition-colors"
                     placeholder="Dia"
                  />
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
               <input
                  type="email"
                  value={editUserForm.email || ''}
                  disabled
                  className="w-full p-3 bg-gray-100 rounded-xl border border-transparent text-gray-500 cursor-not-allowed"
               />
               <p className="text-[10px] text-gray-400 mt-1">O email não pode ser alterado.</p>
            </div>
         </div>

         <button onClick={() => handleSaveUser(role)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-colors">
            Salvar Alterações
         </button>
      </div>
   );

   const renderCoupleProfile = () => {
      const inviteLink = state.userProfile.inviteLink || "https://app.gossipcouple.com/invite/error";

      return (
         <div className="space-y-6">
            <div className="p-4 bg-pink-50 rounded-xl border border-pink-100 flex items-center gap-4">
               <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center font-bold text-gray-500">{state.userProfile.user1.name[0]}</div>
                  <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center font-bold text-gray-500">{state.userProfile.user2.name[0]}</div>
               </div>
               <div>
                  <h4 className="font-bold text-gray-800">Perfil Conjunto</h4>
                  <p className="text-xs text-gray-500">Configurações globais do casal</p>
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Casal</label>
               <input
                  type="text"
                  value={editCoupleForm.coupleName}
                  onChange={(e) => setEditCoupleForm({ ...editCoupleForm, coupleName: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
               />
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Perfil de Risco Financeiro</label>
               <div className="space-y-2">
                  {['low', 'medium', 'high'].map((level) => (
                     <div
                        key={level}
                        onClick={() => setEditCoupleForm({ ...editCoupleForm, riskTolerance: level as any })}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${editCoupleForm.riskTolerance === level ? 'bg-primary-start/5 border-primary-mid' : 'bg-white border-gray-200'}`}
                     >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${editCoupleForm.riskTolerance === level ? 'border-primary-mid' : 'border-gray-300'}`}>
                           {editCoupleForm.riskTolerance === level && <div className="w-2 h-2 rounded-full bg-primary-mid" />}
                        </div>
                        <div>
                           <span className="text-sm font-bold text-gray-800 capitalize">
                              {level === 'low' ? 'Conservador' : level === 'medium' ? 'Moderado' : 'Arrojado'}
                           </span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Link de Convite (P2)</label>
               <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-3 break-all text-xs font-mono text-gray-500">
                  {inviteLink}
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <button
                     onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        alert("Link copiado!");
                     }}
                     className="py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm transition-colors"
                  >
                     <Copy size={16} /> Copiar
                  </button>
                  <button
                     onClick={() => {
                        const msg = `Oi! Entra na nossa conta do Gossip Couple pra gente organizar tudo: ${inviteLink}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                     }}
                     className="py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2 text-sm transition-colors"
                  >
                     <MessageCircle size={16} /> WhatsApp
                  </button>
               </div>
            </div>

            <button onClick={handleSaveCouple} className="w-full py-3 mt-4 bg-primary-start text-white rounded-xl font-bold shadow-lg hover:bg-primary-mid transition-colors">
               Salvar Configurações
            </button>
         </div>
      );
   };

   const renderSubscription = () => {
      if (isEditingPayment) {
         return (
            <div className="space-y-6">
               <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                     <CreditCard size={32} />
                  </div>
                  <h3 className="font-bold text-gray-900">Atualizar Pagamento</h3>
                  <p className="text-xs text-gray-500">Insira os dados do novo cartão</p>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome no Cartão</label>
                     <input
                        type="text"
                        value={paymentForm.cardName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cardName: e.target.value })}
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                        placeholder="Nome como está no cartão"
                        disabled={isSavingPayment}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número do Cartão</label>
                     <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                           type="text"
                           value={paymentForm.cardNumber}
                           onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value })}
                           className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                           placeholder="0000 0000 0000 0000"
                           disabled={isSavingPayment}
                        />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Validade</label>
                        <div className="relative">
                           <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                           <input
                              type="text"
                              value={paymentForm.expiry}
                              onChange={(e) => setPaymentForm({ ...paymentForm, expiry: e.target.value })}
                              className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                              placeholder="MM/AA"
                              disabled={isSavingPayment}
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVC</label>
                        <div className="relative">
                           <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                           <input
                              type="text"
                              value={paymentForm.cvc}
                              onChange={(e) => setPaymentForm({ ...paymentForm, cvc: e.target.value })}
                              className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                              placeholder="123"
                              disabled={isSavingPayment}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-3 pt-4">
                  <button
                     onClick={() => setIsEditingPayment(false)}
                     disabled={isSavingPayment}
                     className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                     Cancelar
                  </button>
                  <button
                     onClick={handleSavePayment}
                     disabled={isSavingPayment}
                     className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                     {isSavingPayment ? <Loader2 size={18} className="animate-spin" /> : "Salvar"}
                  </button>
               </div>
            </div>
         );
      }

      return (
         <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary-start to-primary-end p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="text-xl font-bold">Gossip Couple Premium</h3>
                        <p className="text-white/80 text-sm">Plano Anual</p>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold border ${state.userProfile.subscriptionStatus === 'active' ? 'bg-white/20 border-white/30' : 'bg-red-500/50 border-red-400'}`}>
                        {state.userProfile.subscriptionStatus === 'active' ? 'Ativo' : 'Inativo/Trial'}
                     </span>
                  </div>
                  <div className="flex items-end gap-1 mb-6">
                     <span className="text-3xl font-bold">R$ 29,90</span>
                     <span className="text-sm text-white/80 mb-1">/mês</span>
                  </div>
                  <p className="text-xs text-white/70">Próxima renovação: 24 Out 2024</p>
               </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-600">
                        <CreditCard size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-gray-800">Mastercard •••• {paymentForm.cardNumber.slice(-4)}</p>
                        <p className="text-xs text-gray-500">Expira em {paymentForm.expiry}</p>
                     </div>
                  </div>
                  <button
                     onClick={() => setIsEditingPayment(true)}
                     className="text-xs font-bold text-primary-start hover:underline"
                  >
                     Alterar
                  </button>
               </div>
            </div>

            <div className="space-y-3 pt-4">
               <button className="w-full py-3 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-gray-600 transition-colors">
                  Ver Histórico de Faturas
               </button>
               <button className="w-full py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors">
                  Cancelar Assinatura
               </button>
            </div>
         </div>
      );
   };

   const renderSecurity = () => {
      // SECURITY: Only allow editing the logged-in user's password
      const userName = currentUserRole === 'P1' ? state.userProfile.user1.name : state.userProfile.user2.name;

      return (
         <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-600">
                  {currentUserRole === 'P1' ? state.userProfile.user1.name[0] : state.userProfile.user2.name[0]}
               </div>
               <div>
                  <h3 className="text-sm font-bold text-gray-900">Sua Segurança</h3>
                  <p className="text-xs text-gray-500">Você está alterando a senha de <strong>{userName}</strong>.</p>
               </div>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha Atual</label>
                  <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                  <input type="password" placeholder="Digite a nova senha" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Nova Senha</label>
                  <input type="password" placeholder="Repita a nova senha" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" />
               </div>
               <button onClick={closeModal} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-colors">
                  Atualizar Minha Senha
               </button>
            </div>
         </div>
      );
   };

   const renderGoogleCalendarSettings = () => (
      <div className="space-y-6">
         <div className="mb-4">
            <h3 className="font-bold text-gray-900">Integração com Google Calendar</h3>
            <p className="text-sm text-gray-500 mt-1">Cada usuário gerencia sua própria conexão.</p>
         </div>

         {/* My Connection Section */}
         <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sua Conexão</p>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shadow-sm">
                        {currentUserRole === 'P1' ? state.userProfile.user1.name[0] : state.userProfile.user2.name[0]}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-gray-800">
                           {currentUserRole === 'P1' ? state.userProfile.user1.name : state.userProfile.user2.name} (Você)
                        </p>
                        <p className="text-xs text-gray-500">
                           {currentUserRole === 'P1'
                              ? (calendarStatus.user1 ? 'Conta Conectada' : 'Não Conectado')
                              : (calendarStatus.user2 ? 'Conta Conectada' : 'Não Conectado')}
                        </p>
                     </div>
                  </div>
                  <button
                     onClick={() => toggleCalendar(currentUserRole === 'P1' ? 'user1' : 'user2')}
                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${(currentUserRole === 'P1' ? calendarStatus.user1 : calendarStatus.user2)
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                  >
                     {(currentUserRole === 'P1' ? calendarStatus.user1 : calendarStatus.user2) ? 'Desconectar' : 'Conectar Google'}
                  </button>
               </div>
            </div>
         </div>

         {/* Partner Connection Section (Read-Only) */}
         <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Conexão do Parceiro</p>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 opacity-80">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-400">
                        {currentUserRole === 'P1' ? state.userProfile.user2.name[0] : state.userProfile.user1.name[0]}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-gray-600">
                           {currentUserRole === 'P1' ? state.userProfile.user2.name : state.userProfile.user1.name}
                        </p>
                        <p className="text-xs text-gray-400">
                           {currentUserRole === 'P1'
                              ? (calendarStatus.user2 ? 'Conta Conectada' : 'Não Conectado')
                              : (calendarStatus.user1 ? 'Conta Conectada' : 'Não Conectado')}
                        </p>
                     </div>
                  </div>
                  {/* Status Icon Only */}
                  {(currentUserRole === 'P1' ? calendarStatus.user2 : calendarStatus.user1) ? (
                     <div className="flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md">
                        <Check size={12} /> Conectado
                     </div>
                  ) : (
                     <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Offline</div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );

   const handleLanguageSelect = (lang: string) => {
      setLanguage(lang);
      setTimeout(() => closeModal(), 300);
   };

   const renderLanguage = () => (
      <div className="space-y-3">
         <div
            onClick={() => handleLanguageSelect('pt-BR')}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${language === 'pt-BR' ? 'border-primary-mid bg-primary-start/5' : 'border-gray-200 hover:border-gray-300'}`}
         >
            <div className="flex items-center gap-3">
               <span className="text-2xl">🇧🇷</span>
               <span className="font-bold text-gray-800">Português (Brasil)</span>
            </div>
            {language === 'pt-BR' && <Check size={20} className="text-primary-start" />}
         </div>

         <div
            onClick={() => handleLanguageSelect('en-US')}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${language === 'en-US' ? 'border-primary-mid bg-primary-start/5' : 'border-gray-200 hover:border-gray-300'}`}
         >
            <div className="flex items-center gap-3">
               <span className="text-2xl">🇺🇸</span>
               <span className="font-bold text-gray-800">English (US)</span>
            </div>
            {language === 'en-US' && <Check size={20} className="text-primary-start" />}
         </div>

         <div
            onClick={() => handleLanguageSelect('es')}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${language === 'es' ? 'border-primary-mid bg-primary-start/5' : 'border-gray-200 hover:border-gray-300'}`}
         >
            <div className="flex items-center gap-3">
               <span className="text-2xl">🇪🇸</span>
               <span className="font-bold text-gray-800">Español</span>
            </div>
            {language === 'es' && <Check size={20} className="text-primary-start" />}
         </div>
      </div>
   );

   const FAQItem = ({ q, a }: { q: string, a: string }) => {
      const [isOpen, setIsOpen] = useState(false);
      return (
         <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 transition-all">
            <button
               onClick={() => setIsOpen(!isOpen)}
               className="w-full flex justify-between items-center p-4 text-left bg-white hover:bg-gray-50 transition-colors"
            >
               <span className="font-bold text-gray-800 text-sm">{q}</span>
               {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {isOpen && (
               <div className="p-4 pt-0 bg-gray-50 text-xs text-gray-600 leading-relaxed border-t border-gray-100">
                  {a}
               </div>
            )}
         </div>
      );
   };

   const renderFAQ = () => (
      <div>
         <div className="mb-6 text-center">
            <HelpCircle size={32} className="mx-auto text-primary-mid mb-2" />
            <h3 className="font-bold text-gray-900">Como podemos ajudar?</h3>
            <p className="text-xs text-gray-500">Dúvidas frequentes sobre o Gossip Couple</p>
         </div>
         <FAQItem q="Como registro minhas transações?" a="Você pode registrar gastos e ganhos manualmente através do Dashboard ou pedindo para a IA. Em breve, disponibilizaremos importação via CSV." />
         <FAQItem q="O aplicativo é compartilhado em tempo real?" a="Sim! Qualquer alteração feita por um parceiro é refletida instantaneamente no dispositivo do outro." />
         <FAQItem q="Como cancelo minha assinatura?" a="Você pode cancelar a qualquer momento na seção 'Assinatura & Pagamento' dentro de Configurações." />
         <FAQItem q="Meus dados estão seguros?" a="Utilizamos criptografia de ponta a ponta. Seus registros financeiros são privados e criptografados." />
         <FAQItem q="A IA tem acesso aos meus dados?" a="A IA recebe apenas dados anonimizados das suas transações manuais para gerar insights. Ela não acessa contas externas." />

         <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-800 mb-2 text-sm text-center">Ainda precisa de ajuda?</h4>
            <a
               href="mailto:gossipcoupleapp@gmail.com"
               className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
               <Mail size={18} /> Entrar em Contato via Email
            </a>
         </div>
      </div>
   );

   // ModalWrapper definition
   const ModalWrapper = ({ title, children }: { title: string, children?: React.ReactNode }) => {
      if (!activeModal) return null;
      return (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] animate-scale-in relative overflow-hidden">
               <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                  <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                     <X size={20} className="text-gray-500" />
                  </button>
               </div>
               <div className="p-6 overflow-y-auto">
                  {children}
               </div>
            </div>
         </div>
      );
   };

   return (
      <div className="space-y-8 animate-fade-in pb-12 max-w-2xl mx-auto">
         {/* Profile Section */}
         <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100">
               <h3 className="font-bold text-gray-900">Perfil</h3>
            </div>
            <div className="divide-y divide-gray-50">
               <div onClick={() => handleOpenEditUser(currentUserRole === 'P1' ? 'user1' : 'user2')} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                        {currentUserRole === 'P1' ? state.userProfile.user1.name[0] : state.userProfile.user2.name[0]}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-gray-800">Meus Dados</p>
                        <p className="text-xs text-gray-500">Foto, nome, renda</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </div>

               <div onClick={handleOpenCoupleProfile} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                     <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center font-bold text-gray-500 text-xs">{state.userProfile.user1.name[0]}</div>
                        <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center font-bold text-gray-500 text-xs">{state.userProfile.user2.name[0]}</div>
                     </div>
                     <div>
                        <p className="text-sm font-bold text-gray-800">Perfil do Casal</p>
                        <p className="text-xs text-gray-500">Nome, risco, convite</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </div>
            </div>
         </section>

         {/* Settings Section */}
         <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100">
               <h3 className="font-bold text-gray-900">Configurações</h3>
            </div>
            <div className="divide-y divide-gray-50">
               <div onClick={() => setActiveModal('SUBSCRIPTION')} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                     <CreditCard size={20} className="text-gray-400" />
                     <span className="text-sm font-medium text-gray-700">Assinatura & Pagamento</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </div>
               <div onClick={() => setActiveModal('SECURITY')} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                     <Shield size={20} className="text-gray-400" />
                     <span className="text-sm font-medium text-gray-700">Segurança</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </div>
               <div onClick={() => setActiveModal('GOOGLE_CALENDAR')} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                     <Calendar size={20} className="text-gray-400" />
                     <span className="text-sm font-medium text-gray-700">Google Calendar</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </div>
               <div onClick={() => setActiveModal('LANGUAGE')} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                     <Globe size={20} className="text-gray-400" />
                     <span className="text-sm font-medium text-gray-700">Idioma</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-xs text-gray-400">{language === 'pt-BR' ? 'Português' : language === 'en-US' ? 'English' : 'Español'}</span>
                     <ChevronRight size={18} className="text-gray-300" />
                  </div>
               </div>
            </div>
         </section>

         {/* Help Section */}
         <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100">
               <h3 className="font-bold text-gray-900">Suporte</h3>
            </div>
            <div className="divide-y divide-gray-50">
               <div onClick={() => setActiveModal('FAQ')} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                     <HelpCircle size={20} className="text-gray-400" />
                     <span className="text-sm font-medium text-gray-700">Perguntas Frequentes</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </div>
               <div onClick={() => onNavigate(Tab.PRIVACY)} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                     <FileText size={20} className="text-gray-400" />
                     <span className="text-sm font-medium text-gray-700">Termos e Privacidade</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </div>
            </div>
         </section>

         {/* Logout */}
         <button onClick={onLogout} className="w-full bg-white border border-gray-200 p-4 rounded-2xl flex items-center justify-center text-red-500 font-bold hover:bg-red-50 transition-colors shadow-sm">
            <LogOut size={20} className="mr-2" /> Sair
         </button>

         <div className="text-center">
            <p className="text-xs text-gray-400">Gossip Couple v1.0.0</p>
         </div>

         {/* Modals */}
         {activeModal === 'EDIT_USER_1' && (
            <ModalWrapper title={`Editar ${state.userProfile.user1.name}`}>
               {renderEditProfile('user1')}
            </ModalWrapper>
         )}
         {activeModal === 'EDIT_USER_2' && (
            <ModalWrapper title={`Editar ${state.userProfile.user2.name}`}>
               {renderEditProfile('user2')}
            </ModalWrapper>
         )}
         {activeModal === 'COUPLE_PROFILE' && (
            <ModalWrapper title="Perfil do Casal">
               {renderCoupleProfile()}
            </ModalWrapper>
         )}
         {activeModal === 'SUBSCRIPTION' && (
            <ModalWrapper title="Assinatura">
               {renderSubscription()}
            </ModalWrapper>
         )}
         {activeModal === 'SECURITY' && (
            <ModalWrapper title="Segurança">
               {renderSecurity()}
            </ModalWrapper>
         )}
         {activeModal === 'GOOGLE_CALENDAR' && (
            <ModalWrapper title="Calendário">
               {renderGoogleCalendarSettings()}
            </ModalWrapper>
         )}
         {activeModal === 'LANGUAGE' && (
            <ModalWrapper title="Idioma">
               {renderLanguage()}
            </ModalWrapper>
         )}
         {activeModal === 'FAQ' && (
            <ModalWrapper title="FAQ">
               {renderFAQ()}
            </ModalWrapper>
         )}
      </div>
   );
};

export default SettingsView;
