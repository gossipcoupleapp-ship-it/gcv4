
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Calendar as CalIcon, Target, MessageSquare, TrendingUp, UserCircle, PieChart, Settings, Bell, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
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
import CheckoutMock from './components/CheckoutMock';
import Onboarding from './components/Onboarding';
import { GeminiService } from './services/geminiService';
import { CalendarService } from './services/calendarService';

const gemini = new GeminiService();

// Initial Sample Data (replacing DB)
const INITIAL_STATE: AppState = {
  transactions: [
    { id: '1', amount: 250, category: 'Alimentação', description: 'Supermercado', date: new Date(Date.now() - 86400000).toISOString(), type: 'expense', userId: 'user1' },
    { id: '2', amount: 120, category: 'Lazer', description: 'Cinema & Jantar', date: new Date(Date.now() - 172800000).toISOString(), type: 'expense', userId: 'user2' },
    { id: '3', amount: 5000, category: 'Salário', description: 'Salário Mensal', date: new Date(Date.now() - 432000000).toISOString(), type: 'income', userId: 'user1' },
    { id: '4', amount: 1200, category: 'Serviços', description: 'Freelance Design', date: new Date().toISOString(), type: 'income', userId: 'user2' }
  ],
  goals: [
    { id: '1', title: 'Viagem Japão', currentAmount: 8500, targetAmount: 25000, deadline: '2024-05-15', status: 'in-progress', category: 'Travel', description: 'Aventura de 15 dias em Tóquio e Kyoto.' },
    { id: '2', title: 'Fundo de Emergência', currentAmount: 12000, targetAmount: 30000, deadline: '2024-12-31', status: 'in-progress', category: 'Finance', description: '6 meses de custo de vida.' }
  ],
  tasks: [
    { id: '1', title: 'Pagar conta de luz', assignee: 'user1', deadline: new Date(Date.now() + 86400000).toISOString(), completed: false, priority: 'high' },
    { id: '2', title: 'Revisar carteira de ações', assignee: 'both', deadline: new Date(Date.now() + 172800000).toISOString(), priority: 'medium', completed: false }
  ],
  events: [
    { id: '1', title: 'Jantar Aniversário', start: new Date(Date.now() + 86400000 * 3).toISOString(), end: new Date(Date.now() + 86400000 * 3 + 7200000).toISOString(), type: 'social', assignee: 'both', description: 'Restaurante Italiano', synced: true, googleCalendarLink: 'https://calendar.google.com' }
  ],
  investments: [],
  userProfile: {
    user1: { name: 'Alex', email: 'alex@example.com', monthlyIncome: '5000', incomeReceiptDate: '5' },
    user2: { name: 'Sam', email: 'sam@example.com', monthlyIncome: '4200', incomeReceiptDate: '10' },
    coupleName: 'Alex & Sam',
    riskTolerance: 'medium',
    inviteLink: `https://app.gossipcouple.com/invite/${Math.random().toString(36).substring(7)}`
  }
};

const tabDescriptions: Record<string, string> = {
  [Tab.OVERVIEW]: 'Resumo geral da vida financeira do casal',
  [Tab.DASHBOARD]: 'Seu planejador financeiro pessoal',
  [Tab.CALENDAR]: 'Agenda compartilhada e eventos financeiros',
  [Tab.GOALS]: 'Acompanhe e realize seus sonhos em conjunto',
  [Tab.INVESTMENTS]: 'Gestão de patrimônio e ativos',
  [Tab.AI_AGENT]: 'Seu assistente pessoal inteligente',
  [Tab.SETTINGS]: 'Gerencie seu perfil e as preferências do casal',
  [Tab.NEWS]: 'Fique por dentro das atualizações',
  [Tab.PRIVACY]: 'Sua segurança e dados'
};

type ViewState = 'LANDING' | 'CHECKOUT' | 'ONBOARDING' | 'APP';

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('LANDING');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  
  // User State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('P1');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  
  // Chat State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatThinking, setIsChatThinking] = useState(false);

  // Profile Menu State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Chat Greeting
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        id: 'init',
        role: 'model',
        text: "Olá! Sou seu assistente financeiro pessoal. Posso ajudar a gerenciar despesas, metas ou agendar compromissos no Google Calendar. Como posso ajudar hoje?",
        timestamp: Date.now()
      }]);
    }
  }, []);

  // --- Handlers ---

  const handleAuthSuccess = (role: UserRole) => {
    setCurrentUserRole(role);
    if (role === 'P1') {
      setCurrentView('CHECKOUT');
    } else {
      setCurrentView('ONBOARDING');
    }
  };

  const handleCheckoutSuccess = () => {
    setCurrentView('ONBOARDING');
  };

  const handleOnboardingFinish = (data: OnboardingData) => {
     setState(prev => ({
        ...prev,
        userProfile: {
           ...prev.userProfile,
           coupleName: data.coupleName || prev.userProfile.coupleName,
           riskTolerance: data.riskProfile || prev.userProfile.riskTolerance,
           user1: currentUserRole === 'P1' ? { ...prev.userProfile.user1, name: data.userName, monthlyIncome: data.monthlyIncome, incomeReceiptDate: data.incomeReceiptDate } : prev.userProfile.user1,
           user2: currentUserRole === 'P2' ? { ...prev.userProfile.user2, name: data.userName, monthlyIncome: data.monthlyIncome, incomeReceiptDate: data.incomeReceiptDate } : prev.userProfile.user2,
        }
     }));
     
     setCurrentView('APP');
     setActiveTab(Tab.DASHBOARD);
  };

  const handleLogout = () => {
    setCurrentView('LANDING');
    setIsProfileMenuOpen(false);
    setActiveTab(Tab.DASHBOARD);
    // Optional: Reset state to initial or keep as is for session
    setState(INITIAL_STATE); 
  };

  // --- App Logic Handlers (Local State) ---

  const handleUpdateUser = (role: 'user1' | 'user2', data: Partial<UserDetail>) => {
    setState(prev => ({
      ...prev,
      userProfile: {
        ...prev.userProfile,
        [role]: {
          ...prev.userProfile[role],
          ...data
        }
      }
    }));
  };

  const handleUpdateCouple = (data: { coupleName?: string; riskTolerance?: 'low' | 'medium' | 'high' }) => {
    setState(prev => ({
      ...prev,
      userProfile: {
        ...prev.userProfile,
        ...data
      }
    }));
  };

  const handleAddTransaction = (t: Omit<Transaction, 'id' | 'userId'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: Date.now().toString(),
      userId: 'user1'
    };
    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions]
    }));
  };

  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    }));
  };

  const handleConfirmTransaction = (t: any) => {
     handleAddTransaction({
       amount: t.amount,
       category: t.category,
       description: t.description || t.category,
       type: t.type,
       date: t.date || new Date().toISOString()
     });
  };

  const handleAddGoal = (g: Omit<Goal, 'id' | 'currentAmount' | 'status'>) => {
    const newGoal: Goal = {
      ...g,
      id: Date.now().toString(),
      currentAmount: 0,
      status: 'in-progress',
      category: g.category || 'Finance',
      description: g.description || 'Created via AI Assistant'
    };
    setState(prev => ({
      ...prev,
      goals: [newGoal, ...prev.goals]
    }));
  };

  const handleConfirmGoal = (g: any) => {
    handleAddGoal({
      title: g.title,
      targetAmount: g.targetAmount,
      deadline: g.deadline || new Date(Date.now() + 86400000 * 30).toISOString(),
      category: 'Finance'
    });
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g)
    }));
  };

  const handleAddTask = (t: Omit<Task, 'id' | 'completed'>) => {
    const newTask: Task = {
      ...t,
      id: Date.now().toString(),
      completed: false
    };
    setState(prev => ({
      ...prev,
      tasks: [newTask, ...prev.tasks]
    }));
  };

  const handleConfirmTask = (t: any) => {
     handleAddTask({
        title: t.title,
        assignee: t.assignee,
        deadline: t.deadline || new Date().toISOString(),
        priority: 'medium'
     });
     
     // Triad Logic: Add to calendar
     handleAddEvent({
        title: t.title,
        start: t.deadline ? `${t.deadline}T09:00:00` : new Date().toISOString(),
        end: t.deadline ? `${t.deadline}T10:00:00` : new Date().toISOString(),
        type: 'task',
        assignee: t.assignee,
        description: 'Linked Task'
     }, true); // Sync task event to calendar
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    }));
  };
  
  const handleAddEvent = async (e: Omit<CalendarEvent, 'id' | 'synced' | 'googleCalendarLink'>, shouldSync: boolean = false) => {
    let synced = false;
    let googleLink = undefined;

    // Perform Sync if requested
    if (shouldSync) {
       try {
          const result = await CalendarService.syncEvent(e);
          synced = result.success;
          googleLink = result.link;
       } catch (error) {
          console.error("Sync Failed", error);
       }
    }

    const newEvent: CalendarEvent = {
      ...e,
      id: Date.now().toString(),
      synced,
      googleCalendarLink: googleLink
    };
    
    setState(prev => ({
      ...prev,
      events: [...prev.events, newEvent]
    }));
  };

  // Centralized Chat Logic
  const handleChatSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsChatThinking(true);

    try {
      // Pass current state and callbacks to the service
      const response = await gemini.chatWithAgent(text, state, {
        onTransaction: handleAddTransaction,
        onGoal: handleAddGoal,
        onTask: handleAddTask,
        onEvent: (e) => handleAddEvent(e, true) // Default AI events to sync
      });

      if (Date.now() - userMsg.timestamp < 1000) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "Ação processada com sucesso.",
        timestamp: Date.now(),
        payload: response.payload // Rich UI cards
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Desculpe, tive um problema ao conectar. Tente novamente.",
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatThinking(false);
    }
  };

  const openChatModal = (initialMsg?: string) => {
    setIsChatModalOpen(true);
    if (initialMsg) {
      handleChatSend(initialMsg);
    }
  };

  // --- RENDER ---

  if (currentView === 'LANDING') {
     return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (currentView === 'CHECKOUT') {
     return <CheckoutMock onSuccess={handleCheckoutSuccess} />;
  }

  if (currentView === 'ONBOARDING') {
     return <Onboarding userRole={currentUserRole} onFinish={handleOnboardingFinish} />;
  }

  // APP VIEW
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
            <SidebarItem icon={<Target size={20} />} label="Goals" active={activeTab === Tab.GOALS} onClick={() => setActiveTab(Tab.GOALS)} />
            <SidebarItem icon={<TrendingUp size={20} />} label="Investments" active={activeTab === Tab.INVESTMENTS} onClick={() => setActiveTab(Tab.INVESTMENTS)} />
            <SidebarItem icon={<MessageSquare size={20} />} label="AI Agent" active={activeTab === Tab.AI_AGENT} onClick={() => setActiveTab(Tab.AI_AGENT)} />
          </nav>
        </div>
        
        {/* Profile Section Trigger */}
        <div className="p-4 border-t border-gray-100 relative" ref={profileMenuRef}>
          <div 
            className="flex items-center p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden relative group">
               <UserCircle size={20} className="relative z-10" />
            </div>
            <div className="hidden lg:block ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700 truncate">
                 {state.userProfile.coupleName}
              </p>
              <p className="text-xs text-gray-400">Premium Plan</p>
            </div>
          </div>

          {/* Profile Menu Overlay */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-4 lg:left-4 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up">
               {/* Header */}
               <div className="p-4 bg-gradient-to-r from-primary-start to-primary-mid text-white">
                  <div className="flex items-center space-x-2 mb-1">
                     <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/10 flex items-center justify-center text-xs font-bold">
                           {state.userProfile.user1.name[0]}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white/10 flex items-center justify-center text-xs font-bold">
                           {state.userProfile.user2.name[0]}
                        </div>
                     </div>
                     <div>
                        <h4 className="font-bold text-sm">{state.userProfile.coupleName}</h4>
                     </div>
                  </div>
               </div>
               
               {/* Links */}
               <div className="py-2">
                  <button onClick={() => { setActiveTab(Tab.SETTINGS); setIsProfileMenuOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-mid transition-colors">
                     <UserCircle size={16} className="mr-3 text-gray-400" /> Perfil do Casal
                  </button>
                  <button onClick={() => { setActiveTab(Tab.SETTINGS); setIsProfileMenuOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-mid transition-colors">
                     <Settings size={16} className="mr-3 text-gray-400" /> Configurações
                  </button>
                  <button onClick={() => { setActiveTab(Tab.NEWS); setIsProfileMenuOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-mid transition-colors">
                     <Bell size={16} className="mr-3 text-gray-400" /> Informações e Novidades
                  </button>
                  <button onClick={() => { setActiveTab(Tab.SETTINGS); setIsProfileMenuOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-mid transition-colors">
                     <HelpCircle size={16} className="mr-3 text-gray-400" /> Suporte
                  </button>
               </div>

               {/* Logout */}
               <div className="border-t border-gray-100 p-2">
                  <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                     <LogOut size={16} className="mr-2" /> Sair
                  </button>
               </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F9FAFB]">
        {/* Top Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-none">{activeTab}</h1>
            <p className="text-xs text-gray-500 mt-1">{tabDescriptions[activeTab]}</p>
          </div>
          <div className="flex items-center space-x-4">
             <button 
                className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary-start transition-colors relative group"
                onClick={() => setActiveTab(Tab.CALENDAR)}
             >
               <span className="absolute top-0 right-0 w-2 h-2 bg-primary-start rounded-full"></span>
               <CalIcon size={18} />
               <span className="absolute top-full mt-2 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                 View Calendar
               </span>
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative scroll-smooth">
            <div className="max-w-6xl mx-auto h-full">
                {activeTab === Tab.OVERVIEW && (
                  <Overview 
                    state={state} 
                    onNavigate={setActiveTab} 
                    onCreateGoal={handleAddGoal}
                    onCreateTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onUpdateTransaction={handleUpdateTransaction}
                    onUpdateGoal={handleUpdateGoal}
                    onCreateTransaction={handleAddTransaction}
                  />
                )}
                {activeTab === Tab.DASHBOARD && (
                  <Dashboard 
                    state={state} 
                    onOpenChat={openChatModal}
                  />
                )}
                {activeTab === Tab.CALENDAR && (
                  <CalendarView 
                    events={state.events} 
                    goals={state.goals} 
                    onAddEvent={handleAddEvent} 
                  />
                )}
                {activeTab === Tab.GOALS && (
                  <GoalsView 
                    goals={state.goals} 
                    tasks={state.tasks}
                    onCreateGoal={handleAddGoal}
                    onUpdateGoal={handleUpdateGoal}
                    onCreateTransaction={handleAddTransaction}
                  />
                )}
                {activeTab === Tab.INVESTMENTS && (
                  <InvestmentsView 
                    state={state} 
                    onUpdateGoal={handleUpdateGoal}
                  />
                )}
                {activeTab === Tab.AI_AGENT && (
                  <ChatInterface 
                    variant="page"
                    messages={chatMessages}
                    onSendMessage={handleChatSend}
                    isThinking={isChatThinking}
                    onConfirmAction={(type, data) => {
                       if (type === 'transaction') handleConfirmTransaction(data);
                       if (type === 'goal') handleConfirmGoal(data);
                       if (type === 'task') handleConfirmTask(data);
                    }}
                  />
                )}
                {activeTab === Tab.SETTINGS && (
                  <SettingsView 
                    state={state}
                    currentUserRole={currentUserRole}
                    onUpdateUser={handleUpdateUser}
                    onUpdateCouple={handleUpdateCouple}
                    onNavigate={setActiveTab} 
                    onLogout={handleLogout} 
                  />
                )}
                {activeTab === Tab.NEWS && (
                  <NewsView />
                )}
                {activeTab === Tab.PRIVACY && (
                  <PrivacyView />
                )}
            </div>
        </div>
      </main>

      {/* Global Chat Modal (For Quick Actions from Dashboard) */}
      <ChatInterface 
        variant="modal"
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        messages={chatMessages}
        onSendMessage={handleChatSend}
        isThinking={isChatThinking}
        onConfirmAction={(type, data) => {
           if (type === 'transaction') handleConfirmTransaction(data);
           if (type === 'goal') handleConfirmGoal(data);
           if (type === 'task') handleConfirmTask(data);
        }}
      />
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-gradient-to-r from-primary-start to-primary-mid text-white shadow-md' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</span>
    <span className="hidden lg:block ml-3 font-medium text-sm">{label}</span>
    {active && <div className="hidden lg:block ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
  </button>
);

export default App;
