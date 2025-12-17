import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Calendar as CalIcon, Target, MessageSquare, TrendingUp, UserCircle, PieChart, Settings, Bell, HelpCircle, LogOut, Loader2 } from 'lucide-react';
import { Tab, AppState, Transaction, Goal, Task, CalendarEvent, ChatMessage, UserRole, OnboardingData, UserDetail } from './types';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import GoalsView from './components/GoalsView';
import InvestmentsView from './components/InvestmentsView';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';
import Overview from './components/Overview';
import SettingsView from './components/SettingsView';
import NewsView from './components/NewsView';
import PrivacyView from './components/PrivacyView';
import Onboarding from './components/Onboarding';
import PaymentSuccess from './components/PaymentSuccess';
import { GeminiService } from './services/geminiService';
import { CalendarService } from './services/calendarService';
import { useSyncData } from './src/hooks/useSyncData';
import { supabase } from './src/lib/supabase';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const gemini = new GeminiService();

const MainApp: React.FC = () => {
  // 1. All Hooks (Must be top level)
  const {
    user,
    profile,
    couple,
    loading: authLoading,
    isP1,
    isP2,
    subscriptionActive,
    onboardingCompleted
  } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // App Data State
  const [subscribing, setSubscribing] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false); // New State
  const [state, setState] = useState<AppState>({
    transactions: [],
    goals: [],
    tasks: [],
    events: [],
    investments: [],
    userProfile: {
      user1: { name: '', email: '', monthlyIncome: '0', incomeReceiptDate: '1' },
      user2: { name: '', email: '', monthlyIncome: '0', incomeReceiptDate: '1' },
      coupleName: 'Carregando...',
      riskTolerance: 'medium',
    }
  });

  // Chat State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatThinking, setIsChatThinking] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Payment Auto-Trigger Ref
  const hasPaymentTriggeredRef = useRef(false);

  // Sync Data Hook
  const { data: syncData, loading: syncLoading } = useSyncData(couple?.id || null);

  // 2. All Effects

  // Effect: Sync Data Update
  useEffect(() => {
    if (syncData && Object.keys(syncData).length > 0) {
      setState(prev => ({ ...prev, ...syncData }));
    }
  }, [syncData]);

  // Effect: Profile/Couple/Integrations Update
  useEffect(() => {
    if (user) {
      // Check Google Calendar Connection
      const checkIntegration = async () => {
        try {
          const { data } = await supabase.from('user_integrations').select('id').eq('user_id', user.id).maybeSingle();
          if (data) setCalendarConnected(true);
        } catch (e) {
          // Suppress 400/404 errors for integrations if table doesn't exist or RLS blocks
          console.warn("Integration check skipped:", e);
        }
      };
      checkIntegration();
    }

    if (profile && couple) {
      setState(prev => ({
        ...prev,
        userProfile: {
          ...prev.userProfile,
          coupleName: couple.name || 'Seu Casal',
          riskTolerance: (profile.riskProfile as any) || 'medium',
          inviteLink: `${window.location.origin}?token=...`
        }
      }));
    }
  }, [profile, couple, user]);

  // Effect: URL Params (Invite Token, Stripe, Google Auth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const sessionId = params.get('session_id');
    const code = params.get('code');

    if (token) {
      setInviteToken(token);
      localStorage.setItem('gossip_invite_token', token);
    } else {
      // Try to recover from storage if not in URL
      const savedToken = localStorage.getItem('gossip_invite_token');
      if (savedToken) setInviteToken(savedToken);
    }

    if (code) {
      const handleGoogleAuth = async () => {
        try {
          const { error } = await supabase.functions.invoke('google-auth', {
            body: { code, redirect_uri: window.location.origin }
          });
          if (error) throw error;

          setCalendarConnected(true);
          window.history.replaceState({}, '', window.location.pathname);
          // alert('Google Calendar conectado com sucesso!'); // Feedback moved to Onboarding UI
        } catch (err) {
          console.error("Google Auth Error:", err);
          alert('Erro ao conectar Google Calendar.');
        }
      };
      handleGoogleAuth();
    }
  }, []);

  // Effect: Click Outside Profile Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Effect: Auto-Subscribe for P1
  useEffect(() => {
    // Only trigger if: User is loaded, Is P1, Subscription Inactive, Not currently subscribing, Not already triggered
    if (user && !authLoading && isP1 && !subscriptionActive && !subscribing && !hasPaymentTriggeredRef.current) {
      // Check if we are already in a success state (session_id present)
      const params = new URLSearchParams(window.location.search);
      if (params.get('session_id')) return; // Don't redirect if we just came back!

      hasPaymentTriggeredRef.current = true;

      const doSubscribe = async () => {
        setSubscribing(true);
        try {
          const { data, error } = await supabase.functions.invoke('create-checkout-session');
          if (error) throw error;
          if (data?.url) {
            window.location.href = data.url;
          } else {
            throw new Error('No checkout URL returned');
          }
        } catch (err) {
          console.error('Subscription Error:', err);
          alert('Erro ao iniciar pagamento. Tente recarregar.');
          setSubscribing(false);
          hasPaymentTriggeredRef.current = false; // Allow retry
        }
      };
      doSubscribe();
    }
  }, [user, authLoading, isP1, subscriptionActive, subscribing]);

  // 3. Handlers
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!couple?.id) return;
    const { error } = await (supabase.from('transactions') as any).insert({
      ...t,
      couple_id: couple.id,
      date: new Date(t.date).toISOString()
    });
    if (error) console.error("Error creating transaction:", error);
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    const { error } = await (supabase.from('transactions') as any).update(t).eq('id', t.id);
    if (error) console.error("Error updating transaction:", error);
  };

  const handleCreateGoal = async (g: Omit<Goal, 'id'>) => {
    if (!couple?.id) return;
    const { error } = await (supabase.from('goals') as any).insert({
      ...g,
      couple_id: couple.id,
      deadline: new Date(g.deadline).toISOString()
    });
    if (error) console.error("Error creating goal:", error);
  };

  const handleUpdateGoal = async (g: Goal) => {
    const { error } = await (supabase.from('goals') as any).update(g).eq('id', g.id);
    if (error) console.error("Error updating goal:", error);
  };

  const handleCreateTask = async (t: Omit<Task, 'id'>) => {
    if (!couple?.id) return;

    // 1. Create Task
    const { data: taskData, error: taskError } = await (supabase.from('tasks') as any).insert({
      title: t.title,
      couple_id: couple.id,
      assigned_to: t.assignee === 'user1' ? user?.id : null,
      status: t.completed ? 'completed' : 'pending',
      due_date: new Date(t.deadline).toISOString(),
      priority: t.priority || 'medium',
      financial_impact: t.financial_impact || 0
    }).select().single();

    if (taskError) {
      console.error("Error creating task:", taskError);
      return;
    }

    const taskId = taskData?.id;

    // 2. Create Shadow Transaction (if applicable)
    if (t.financial_impact && t.financial_impact > 0 && taskId) {
      const { error: transError } = await (supabase.from('transactions') as any).insert({
        couple_id: couple.id,
        amount: t.financial_impact,
        category: 'Pending Task', // Or infer from AI?
        description: `Shadow: ${t.title}`,
        date: new Date(t.deadline).toISOString(),
        type: 'expense',
        status: 'pending',
        linked_task_id: taskId
      });
      if (transError) console.error("Error creating shadow transaction:", transError);
    }

    // 3. Create Calendar Event
    if (taskId) {
      const eventTitle = t.financial_impact ? `${t.title} (R$${t.financial_impact})` : t.title;
      const startTime = new Date(t.deadline).toISOString();
      const endTime = new Date(new Date(t.deadline).getTime() + 60 * 60 * 1000).toISOString();

      const { error: eventError } = await (supabase.from('events') as any).insert({
        couple_id: couple.id,
        title: eventTitle,
        start_time: startTime,
        end_time: endTime, // 1 hour duration
        type: 'task',
        linked_task_id: taskId
      });
      if (eventError) console.error("Error creating calendar event:", eventError);

      // Sync to Google Calendar
      if (calendarConnected) {
        CalendarService.syncEvent({
          title: eventTitle,
          start: startTime,
          end: endTime,
          type: 'task',
          description: `Task assigned to ${t.assignee}`
        }).then(res => {
          if (res.success) console.log("Synced task to Google Calendar:", res.link);
        });
      }
    }
  };

  const handleCreateEvent = async (e: Omit<CalendarEvent, 'id'>) => {
    if (!couple?.id) return;
    const { error } = await (supabase.from('events') as any).insert({
      couple_id: couple.id,
      title: e.title,
      start_time: e.start,
      end_time: e.end,
      type: e.type
    });

    if (error) {
      console.error("Error creating event:", error);
      return;
    }

    if (calendarConnected) {
      await CalendarService.syncEvent(e);
    }
  };

  const handleUpdateTask = async (t: Task) => {
    // 1. Update Task
    const { error } = await (supabase.from('tasks') as any).update({
      title: t.title,
      status: t.completed ? 'completed' : 'pending',
      assigned_to: t.assignee === 'user1' ? user?.id : null,
      due_date: new Date(t.deadline).toISOString(),
      priority: t.priority
    }).eq('id', t.id);

    if (error) {
      console.error("Error updating task:", error);
      return;
    }

    // 2. Triad Completion Logic
    if (t.completed) {
      // Find linked transaction and mark as paid
      const { error: transError } = await (supabase.from('transactions') as any)
        .update({ status: 'paid' })
        .eq('linked_task_id', t.id);

      if (transError) console.error("Error updating shadow transaction:", transError);
    }
  };

  const handleUpdateUser = async (u: Partial<UserDetail>) => {
    if (!user) return;
    const { error } = await (supabase.from('profiles') as any).update({
      full_name: u.name,
      income: parseFloat(u.monthlyIncome || '0'),
      income_date: parseInt(u.incomeReceiptDate || '1')
    }).eq('id', user.id);
    if (error) console.error("Error updating user:", error);
  };

  const handleUpdateCouple = async (c: { name: string, riskTolerance: string }) => {
    if (!couple?.id) return;
    const { error } = await (supabase.from('couples') as any).update({
      name: c.name,
      financial_risk_profile: c.riskTolerance
    }).eq('id', couple.id);
    if (error) console.error("Error updating couple:", error);
  };

  // Effect: Load Chat History on Mount (12h context)
  useEffect(() => {
    if (couple?.id && isChatModalOpen) {
      const loadHistory = async () => {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('couple_id', couple.id)
          .gt('created_at', twelveHoursAgo)
          .order('created_at', { ascending: true });

        if (data) {
          const formatted: ChatMessage[] = data.map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'model',
            text: m.text,
            timestamp: new Date(m.created_at).getTime(),
            payload: m.payload
          }));
          setChatMessages(formatted);
        }
      };
      loadHistory();
    }
  }, [couple, isChatModalOpen]);

  // ... (handlers)

  const handleChatSend = async (text: string) => {
    if (!couple?.id) return;

    // 1. Optimistic Update
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatThinking(true);

    // 2. Persist User Message
    await (supabase.from('messages') as any).insert({
      couple_id: couple.id,
      role: 'user',
      text: text
    });

    try {
      const response = await gemini.chatWithAgent(text, couple.id, state, {
        onTransaction: handleCreateTransaction,
        onGoal: handleCreateGoal,
        onTask: handleCreateTask,
        onEvent: handleCreateEvent
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "...",
        timestamp: Date.now(),
        payload: response.payload
      };

      setChatMessages(prev => [...prev, aiMsg]);

      // 3. Persist AI Response
      await (supabase.from('messages') as any).insert({
        couple_id: couple.id,
        role: 'model',
        text: response.text || "...",
        payload: response.payload || null
      });

    } catch (e) {
      setChatMessages(prev => [...prev, { id: 'err', role: 'model', text: "Erro ao processar.", timestamp: Date.now() }]);
    } finally {
      setIsChatThinking(false);
    }
  };

  // 4. Returns (View Logic)

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-primary-mid animate-spin" />
      </div>
    );
  }

  // Guard: Not Authenticated
  if (!user) {
    return <LandingPage inviteToken={inviteToken} />;
  }

  // Guard: No Profile
  if (!profile) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p>Criando seu perfil...</p>
      </div>
    );
  }

  // Guard: P2 Invite Joining
  if (inviteToken && !profile.couple_id) {
    return <Onboarding userRole="P2" inviteToken={inviteToken} calendarConnected={calendarConnected} onFinish={() => window.location.href = '/'} />;
  }

  // Guard: Payment / Subscription Check (Strict for BOTH)
  if (!subscriptionActive) {
    // 1. Success Return Handling
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) {
      return <PaymentSuccess />;
    }

    // 2. P1 Flow (Payer) - Auto Redirect/Loader
    if (isP1) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <Loader2 className="animate-spin text-primary-mid mx-auto mb-4" size={40} />
            <h1 className="text-xl font-bold mb-2">Renovando Acesso</h1>
            <p className="text-gray-500 text-sm">Transferindo você para o pagamento...</p>
          </div>
        </div>
      );
    }

    // 3. P2 Flow (Invited) - Access Blocked Message
    if (isP2) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <LogOut size={32} />
            </div>
            <h1 className="text-xl font-bold mb-2 text-gray-900">Assinatura Pausada</h1>
            <p className="text-gray-500 mb-6">
              A assinatura do casal está inativa. Peça para seu parceiro(a) (P1) regularizar o pagamento para vocês voltarem a usar o Gossip Couple.
            </p>
            <button onClick={handleLogout} className="text-red-500 font-medium hover:underline text-sm">
              Sair desta conta
            </button>
          </div>
        </div>
      );
    }

    // Fallback (Should typically not reach here if role is defined, but safe to show generic loader or nothing)
    return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  // Guard: Onboarding Incomplete
  if (!onboardingCompleted) {
    return <Onboarding userRole={profile.role as UserRole} calendarConnected={calendarConnected} onFinish={() => window.location.reload()} />;
  }

  // Main Dashboard View
  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden animate-fade-in">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col justify-between shadow-lg z-20 relative">
        <div>
          <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-gray-100">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-start to-primary-mid rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight text-gray-800 whitespace-nowrap">Gossip Couple</span>
          </div>
          <nav className="p-4 space-y-2">
            <SidebarItem icon={<PieChart size={20} />} label="Visão Geral" active={activeTab === Tab.OVERVIEW} onClick={() => setActiveTab(Tab.OVERVIEW)} />
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === Tab.DASHBOARD} onClick={() => setActiveTab(Tab.DASHBOARD)} />
            <SidebarItem icon={<CalIcon size={20} />} label="Calendar" active={activeTab === Tab.CALENDAR} onClick={() => setActiveTab(Tab.CALENDAR)} />
            <SidebarItem icon={<Target size={20} />} label="Objetivos" active={activeTab === Tab.GOALS} onClick={() => setActiveTab(Tab.GOALS)} />
            <SidebarItem icon={<TrendingUp size={20} />} label="Investimentos" active={activeTab === Tab.INVESTMENTS} onClick={() => setActiveTab(Tab.INVESTMENTS)} />
            <SidebarItem icon={<MessageSquare size={20} />} label="Novidades" active={activeTab === Tab.NEWS} onClick={() => setActiveTab(Tab.NEWS)} />
            <SidebarItem icon={<Settings size={20} />} label="Configurações" active={activeTab === Tab.SETTINGS} onClick={() => setActiveTab(Tab.SETTINGS)} />
          </nav>
        </div>
        <div className="p-4 border-t border-gray-100 relative" ref={profileMenuRef}>
          <div onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
            <UserCircle size={20} className="text-gray-500" />
            <div className="hidden lg:block ml-3">
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="text-xs text-gray-400">{couple?.name}</p>
            </div>
          </div>
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-4 bg-white shadow-xl rounded-xl border border-gray-100 p-2 w-48 mb-2">
              <button onClick={handleLogout} className="flex items-center w-full p-2 hover:bg-red-50 text-red-500 rounded-lg text-sm"><LogOut size={14} className="mr-2" /> Sair</button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F9FAFB]">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-gray-800">
            {activeTab === Tab.DASHBOARD ? 'Dashboard' :
              activeTab === Tab.CALENDAR ? 'Calendário Inteligente' :
                activeTab === Tab.GOALS ? 'Sonhos do Casal' :
                  activeTab === Tab.INVESTMENTS ? 'Investimentos' :
                    activeTab === Tab.NEWS ? 'Gossip News' :
                      activeTab === Tab.SETTINGS ? 'Configurações' : 'Visão Geral'}
          </h1>
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsChatModalOpen(true)} className="p-2 text-gray-400 hover:text-primary-mid transition-colors">
              <MessageSquare size={24} />
            </button>
            <div className="relative">
              <Bell size={24} className="text-gray-400" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative scroll-smooth">
          <div className="max-w-6xl mx-auto h-full">
            {activeTab === Tab.OVERVIEW && (
              <Overview
                state={state}
                onNavigate={setActiveTab}
                onCreateGoal={handleCreateGoal}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onUpdateTransaction={handleUpdateTransaction}
                onUpdateGoal={handleUpdateGoal}
                onCreateTransaction={handleCreateTransaction}
              />
            )}
            {activeTab === Tab.DASHBOARD && <Dashboard state={state} onOpenChat={() => setIsChatModalOpen(true)} />}
            {activeTab === Tab.CALENDAR && <CalendarView events={state.events} />}
            {activeTab === Tab.GOALS && (
              <GoalsView
                goals={state.goals}
                onCreateGoal={handleCreateGoal}
                onUpdateGoal={handleUpdateGoal}
              />
            )}
            {activeTab === Tab.INVESTMENTS && (
              <InvestmentsView
                state={state}
                onUpdateGoal={handleUpdateGoal}
                onCreateTransaction={handleCreateTransaction}
              />
            )}
            {activeTab === Tab.NEWS && <NewsView />}
            {activeTab === Tab.SETTINGS && (
              <SettingsView
                state={state}
                currentUserRole={profile.role as UserRole}
                onUpdateUser={handleUpdateUser}
                onUpdateCouple={handleUpdateCouple}
                onNavigate={setActiveTab}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </main>

      <ChatInterface
        variant="modal"
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        messages={chatMessages}
        onSendMessage={handleChatSend}
        isThinking={isChatThinking}
        onConfirmAction={(action) => console.log("Action confirmed:", action)}
      />

    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${active ? 'bg-gradient-to-r from-primary-start to-primary-mid text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
    <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</span>
    <span className="hidden lg:block ml-3 font-medium text-sm">{label}</span>
  </button>
);

const App = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
