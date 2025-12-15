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
import { useSyncData } from './src/hooks/useSyncData'; // NOTE: Path might need cleanup if we move hooks
import { supabase } from './src/lib/supabase';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const gemini = new GeminiService();

// --- Main App Logic (Wrapped in AuthProvider) ---

const MainApp: React.FC = () => {
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

  // App Data State (Synced)
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

  // Check for Invite Token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const sessionId = params.get('session_id'); // Stripe Return
    const code = params.get('code'); // Google OAuth Return

    if (token) setInviteToken(token);

    if (code) {
      // Exchange Code for Token via Edge Function
      const handleGoogleAuth = async () => {
        try {
          const { error } = await supabase.functions.invoke('google-auth', {
            body: { code, redirect_uri: window.location.origin }
          });
          if (error) throw error;

          // Clear URL params to avoid re-triggering
          window.history.replaceState({}, '', window.location.pathname);
          alert('Google Calendar conectado com sucesso!');
          // Ideally update local state or user profile to reflect connection
        } catch (err) {
          console.error("Google Auth Error:", err);
          alert('Erro ao conectar Google Calendar.');
        }
      };
      handleGoogleAuth();
    }
    // Stripe session_id handling is mostly for UX feedback, the webhook handles the data.
  }, []);

  // Sync Data Hook
  const { data: syncData, loading: syncLoading } = useSyncData(couple?.id || null);

  useEffect(() => {
    if (syncData && Object.keys(syncData).length > 0) {
      setState(prev => ({ ...prev, ...syncData }));
    }
  }, [syncData]);

  // Update State with Profile/Couple Info
  useEffect(() => {
    if (profile && couple) {
      setState(prev => ({
        ...prev,
        userProfile: {
          ...prev.userProfile,
          coupleName: couple.name || 'Seu Casal',
          riskTolerance: (profile.risk_profile as any) || 'medium',
          inviteLink: `${window.location.origin}?token=...` // Generated dynamically usually
        }
      }));
    }
  }, [profile, couple]);

  // Chat State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatThinking, setIsChatThinking] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- State Machine & Routing ---

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-primary-mid animate-spin" />
      </div>
    );
  }

  // 1. Not Authenticated -> Landing Page
  if (!user) {
    // If specific invite token exists, we pass it to LandingPage to handle "Join" flow
    return <LandingPage inviteToken={inviteToken} />;
  }

  // 2. Authenticated but no Profile? (Should not happen usually if triggers work, but safe guard)
  if (!profile) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p>Criando seu perfil...</p>
        {/* Can trigger a manual fetch or wait for webhook/trigger */}
      </div>
    );
  }

  // 3. P2 Invite Processing (Mid-Auth)
  // If user has token but is not yet linked to a couple (or is linking to new one)
  if (inviteToken && !profile.couple_id) {
    // We need to execute the Join RPC.
    // This is better handled inside a dedicated component or Onboarding, but let's do a quick effect or intermediary view.
    // Ideally, pass token to Onboarding or a "Joining..." screen.
    return <Onboarding userRole="P2" inviteToken={inviteToken} onFinish={() => window.location.href = '/'} />;
  }

  // 4. P1 Payment Guard
  if (isP1 && !subscriptionActive) {
    // Check for success param just to show success UI while webhook processes
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) {
      return <PaymentSuccess />; // Will poll or wait for profile update via AuthContext
    }

    // Redirect logic to Stripe would go here.
    // For now, render a "Payment Needed" screen that buttons to call backend.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
        <h1 className="text-2xl font-bold mb-4">Assinatura Necessária</h1>
        <p className="mb-6">Para continuar como fundador do casal, é necessária uma assinatura ativa.</p>
        <button
          onClick={async () => {
            // Call create-checkout-session function
            const { data, error } = await supabase.functions.invoke('create-checkout-session');
            if (data?.url) window.location.href = data.url;
            else alert('Erro ao iniciar pagamento');
          }}
          className="px-6 py-3 bg-primary-mid text-white rounded-xl font-bold"
        >
          Assinar Agora
        </button>
        <button onClick={() => supabase.auth.signOut()} className="mt-4 text-gray-400 text-sm">Sair</button>
      </div>
    );
  }

  // 5. Onboarding Guard
  if (!onboardingCompleted) {
    // If P1 has paid (or P2 joined), but hasn't finished wizard
    return <Onboarding userRole={profile.role as UserRole} onFinish={() => window.location.reload()} />;
  }

  // --- Main App ---

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleChatSend = async (text: string) => {
    // ... logic adapted to use 'couple' object ...
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatThinking(true);
    try {
      if (!couple?.id) throw new Error("Couple ID missing");
      // call gemini ...
      const response = await gemini.chatWithAgent(text, couple.id, state, {
        onTransaction: (t) => { }, // Implement real handlers
        onGoal: (g) => { },
        onTask: (t) => { },
        onEvent: (e) => { }
      });
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response.text, timestamp: Date.now(), payload: response.payload };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setChatMessages(prev => [...prev, { id: 'err', role: 'model', text: "Erro ao processar.", timestamp: Date.now() }]);
    } finally {
      setIsChatThinking(false);
    }
  };

  // --- CRUD Handlers ---

  const handleCreateTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!couple?.id) return;
    const { error } = await (supabase.from('transactions') as any).insert({
      ...t,
      couple_id: couple.id,
      date: new Date(t.date).toISOString() // Ensure standard format
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
    const { error } = await (supabase.from('tasks') as any).insert({
      title: t.title,
      couple_id: couple.id,
      assigned_to: t.assignee === 'user1' ? user?.id : null, // Fallback mapping
      status: t.completed ? 'completed' : 'pending',
      due_date: new Date(t.deadline).toISOString(),
      priority: t.priority || 'medium'
    });
    if (error) console.error("Error creating task:", error);
  };

  const handleUpdateTask = async (t: Task) => {
    const { error } = await (supabase.from('tasks') as any).update({
      title: t.title,
      status: t.completed ? 'completed' : 'pending',
      assigned_to: t.assignee === 'user1' ? user?.id : null,
      due_date: new Date(t.deadline).toISOString(),
      priority: t.priority
    }).eq('id', t.id);
    if (error) console.error("Error updating task:", error);
  };

  const handleUpdateUser = async (u: Partial<UserDetail>) => {
    // Updates current user profile
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

  // Chat Handlers (Bridge to CRUD)
  const handleChatTransaction = (t: any) => handleCreateTransaction(t);
  const handleChatGoal = (g: any) => handleCreateGoal(g);
  const handleChatTask = (t: any) => handleCreateTask(t);


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
            {/* ... others */}
            <SidebarItem icon={<Settings size={20} />} label="Settings" active={activeTab === Tab.SETTINGS} onClick={() => setActiveTab(Tab.SETTINGS)} />
          </nav>
        </div>
        <div className="p-4 border-t border-gray-100 relative" ref={profileMenuRef}>
          <div onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
            <UserCircle size={20} className="text-gray-500" />
            <div className="hidden lg:block ml-3">
              <p className="text-sm font-medium">{profile.full_name}</p>
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
          <h1 className="text-2xl font-bold text-gray-800">{activeTab}</h1>
          {/* ... */}
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
            {/* ... Implement other tabs ... */}
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
        onConfirmAction={(action) => {
          // Dispatch generic actions if ChatInterface supports it later
          console.log("Action confirmed:", action);
        }}
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
