

import React, { useState, useEffect } from 'react';
import { AppState, Transaction, Task, Tab, CalendarEvent, Goal } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  CheckCircle, 
  ChevronRight, 
  ChevronDown,
  Download, 
  Filter, 
  LayoutGrid, 
  Search, 
  Target, 
  TrendingUp, 
  User, 
  Users,
  X,
  Sparkles,
  BarChart3,
  Clock,
  Tag,
  Plus,
  Link,
  DollarSign,
  ArrowUpDown,
  ListFilter,
  Edit2,
  Save,
  RotateCcw,
  Flag
} from 'lucide-react';

interface OverviewProps {
  state: AppState;
  onNavigate: (tab: Tab) => void;
  onCreateGoal?: (goal: Omit<Goal, 'id' | 'currentAmount' | 'status'>) => void;
  onCreateTask?: (task: Omit<Task, 'id' | 'completed'>) => void;
  onUpdateTask?: (task: Task) => void;
  onUpdateTransaction?: (transaction: Transaction) => void;
  onUpdateGoal?: (goal: Goal) => void;
  onCreateTransaction?: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
}

const Overview: React.FC<OverviewProps> = ({ state, onNavigate, onCreateGoal, onCreateTask, onUpdateTask, onUpdateTransaction, onUpdateGoal, onCreateTransaction }) => {
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateTransOpen, setIsCreateTransOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting State
  const [taskSort, setTaskSort] = useState<{
    field: 'deadline' | 'priority' | 'assignee';
    direction: 'asc' | 'desc';
  }>({ field: 'deadline', direction: 'asc' });

  // New Goal Form State
  const [newGoalForm, setNewGoalForm] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    category: 'Finance',
    description: ''
  });

  // Goal Contribution State
  const [isContributing, setIsContributing] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');

  // New Task Form State
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    assignee: 'both' as 'user1' | 'user2' | 'both',
    deadline: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    linkedGoalId: ''
  });

  // New Transaction Form State
  const [newTransForm, setNewTransForm] = useState({
    description: '',
    amount: '',
    category: 'Geral',
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    userId: 'user1'
  });

  // Transaction Edit State
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [editTransactionForm, setEditTransactionForm] = useState<Transaction | null>(null);

  // Helper to safely open transaction details with form initialized
  const handleTransactionClick = (t: Transaction) => {
    setEditTransactionForm(t);
    setSelectedTransaction(t);
    setIsEditingTransaction(false);
  };

  // Helper to export CSV (Mock)
  const handleExport = () => {
    alert("Exportando dados para CSV...");
  };

  // Helper to submit new goal
  const handleSubmitNewGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreateGoal && newGoalForm.title && newGoalForm.targetAmount) {
      onCreateGoal({
        title: newGoalForm.title,
        targetAmount: parseFloat(newGoalForm.targetAmount),
        deadline: newGoalForm.deadline || new Date(Date.now() + 86400000 * 90).toISOString(),
        category: newGoalForm.category,
        description: newGoalForm.description
      });
      setIsCreateGoalOpen(false);
      // Reset form
      setNewGoalForm({ title: '', targetAmount: '', deadline: '', category: 'Finance', description: '' });
    }
  };

  // Helper to submit new transaction
  const handleSubmitNewTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreateTransaction && newTransForm.description && newTransForm.amount) {
      onCreateTransaction({
        description: newTransForm.description,
        amount: parseFloat(newTransForm.amount),
        category: newTransForm.category,
        type: newTransForm.type,
        date: new Date(newTransForm.date).toISOString(),
      });
      setIsCreateTransOpen(false);
      setNewTransForm({
        description: '',
        amount: '',
        category: 'Geral',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        userId: 'user1'
      });
    }
  };

  // Helper to handle goal contribution
  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contributionAmount) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) return;

    // 1. Create Expense Transaction
    if (onCreateTransaction) {
      onCreateTransaction({
        amount: amount,
        category: 'Economia/Meta',
        description: `Aporte: ${selectedGoal.title}`,
        type: 'expense',
        date: new Date().toISOString()
      });
    }

    // 2. Update Goal Progress
    if (onUpdateGoal) {
      onUpdateGoal({
        ...selectedGoal,
        currentAmount: selectedGoal.currentAmount + amount
      });
    }

    setIsContributing(false);
    setContributionAmount('');
    setSelectedGoal(null); // Close modal
  };

  // Helper to submit new task
  const handleSubmitNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreateTask && newTaskForm.title) {
       onCreateTask({
          title: newTaskForm.title,
          assignee: newTaskForm.assignee,
          deadline: newTaskForm.deadline || new Date(Date.now() + 86400000).toISOString(),
          priority: newTaskForm.priority,
          linkedGoalId: newTaskForm.linkedGoalId || undefined
       });
       setIsCreateTaskOpen(false);
       setNewTaskForm({ title: '', assignee: 'both', deadline: '', priority: 'medium', linkedGoalId: '' });
    }
  };
  
  // Handle Save Transaction
  const handleSaveTransaction = () => {
     if (onUpdateTransaction && editTransactionForm) {
        onUpdateTransaction(editTransactionForm);
        // Update view mode state to reflect changes immediately
        setSelectedTransaction(editTransactionForm); 
        setIsEditingTransaction(false);
     }
  };

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    // Revert form to original selected transaction data
    setEditTransactionForm(selectedTransaction);
    setIsEditingTransaction(false);
  };

  // Sorting Logic for Tasks
  const getSortedTasks = () => {
    let tasks = [...state.tasks];

    // Filter by search
    if (searchTerm) {
      tasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Sort
    return tasks.sort((a, b) => {
      let cmp = 0;
      
      if (taskSort.field === 'deadline') {
        cmp = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      } else if (taskSort.field === 'priority') {
        // High (3) > Medium (2) > Low (1)
        const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const valA = pMap[a.priority || 'medium'];
        const valB = pMap[b.priority || 'medium'];
        cmp = valA - valB;
      } else if (taskSort.field === 'assignee') {
        const getName = (u: string) => {
           if (u === 'user1') return state.userProfile.user1.name;
           if (u === 'user2') return state.userProfile.user2.name;
           return 'Ambos';
        }
        const assignA = getName(a.assignee);
        const assignB = getName(b.assignee);
        cmp = assignA.localeCompare(assignB);
      }

      return taskSort.direction === 'asc' ? cmp : -cmp;
    });
  };

  const sortedTasks = getSortedTasks();

  // Render Overlay Modal (For "View All" lists)
  const renderModal = (
    title: string, 
    isOpen: boolean, 
    onClose: () => void, 
    content: React.ReactNode,
    customFilters?: React.ReactNode
  ) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
          {/* Modal Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">Visualizando todos os registros</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full text-sm font-medium transition-colors">
                <Download size={16} /> Exportar CSV
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Modal Toolbar */}
          <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-mid focus:ring-2 focus:ring-primary-mid/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              {customFilters ? customFilters : (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                    <Filter size={16} /> Filtros
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                    <Calendar size={16} /> Data
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
            {content}
          </div>
        </div>
      </div>
    );
  };

  // --- SECTION DATA PREP ---
  const lastTransactions = state.transactions.slice(0, 4);
  const lastTasks = state.tasks.slice(0, 4);
  const activeGoals = state.goals.filter(g => g.status === 'in-progress').slice(0, 3);
  
  // Investments Data (Mock based on InvestmentsView)
  const totalInvested = 12500.00;
  const currentVal = 13165.00;
  const profitability = 5.32;

  // Goal Overlay Content
  const renderGoalOverlay = () => {
    const isCreation = isCreateGoalOpen;
    const goal = selectedGoal;
    const progress = goal ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    const linkedTasks = goal ? state.tasks.filter(t => t.linkedGoalId === goal.id) : [];

    if (!goal && !isCreation) return null;

    return (
       <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
             {/* Header */}
             <div className="h-24 bg-gradient-to-r from-primary-start to-primary-mid relative flex-shrink-0">
                <button 
                 onClick={() => { setSelectedGoal(null); setIsCreateGoalOpen(false); setIsContributing(false); }}
                 className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors backdrop-blur-md"
                >
                  <X size={18} />
                </button>
                <div className="absolute -bottom-8 left-8">
                   <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary-start">
                      <Target size={32} />
                   </div>
                </div>
             </div>

             <div className="pt-10 px-8 pb-8 overflow-y-auto">
                {isCreation ? (
                  <form onSubmit={handleSubmitNewGoal}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">New Goal</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title (Goal Name)</label>
                        <input 
                          required
                          value={newGoalForm.title}
                          onChange={e => setNewGoalForm({...newGoalForm, title: e.target.value})}
                          className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                          placeholder="e.g. Trip to Paris" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Amount</label>
                          <input 
                            required
                            type="number"
                            value={newGoalForm.targetAmount}
                            onChange={e => setNewGoalForm({...newGoalForm, targetAmount: e.target.value})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                            placeholder="$0.00" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deadline</label>
                          <input 
                            required
                            type="date"
                            value={newGoalForm.deadline}
                            onChange={e => setNewGoalForm({...newGoalForm, deadline: e.target.value})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                        <select 
                           value={newGoalForm.category}
                           onChange={e => setNewGoalForm({...newGoalForm, category: e.target.value})}
                           className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                        >
                           <option>Finance</option>
                           <option>Travel</option>
                           <option>Housing</option>
                           <option>Vehicle</option>
                           <option>Education</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                        <textarea 
                           value={newGoalForm.description}
                           onChange={e => setNewGoalForm({...newGoalForm, description: e.target.value})}
                           className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none h-24 resize-none"
                           placeholder="Describe your goal..."
                        />
                      </div>
                      <button type="submit" className="w-full py-3 mt-4 bg-primary-start hover:bg-primary-mid text-white font-bold rounded-xl shadow-lg transition-all">
                         Create Goal
                      </button>
                    </div>
                  </form>
                ) : (
                   goal && (
                     <>
                        {/* Header Info */}
                        <div className="mb-6">
                           <div className="flex items-center gap-2 mb-2">
                             <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wide">
                                {goal.category || 'Finance'}
                             </span>
                             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${progress >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                {progress >= 100 ? 'Achieved' : 'In Progress'}
                             </span>
                           </div>
                           <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{goal.title}</h3>
                           <p className="text-sm text-gray-500 font-medium">Target: ${goal.targetAmount.toLocaleString()}</p>
                        </div>

                        {/* Progress */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <div className="flex justify-between items-end mb-2">
                              <span className="text-3xl font-bold text-gray-800">${goal.currentAmount.toLocaleString()}</span>
                              <span className="text-xs font-bold text-gray-400 mb-1">{progress.toFixed(0)}% completed</span>
                           </div>
                           <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div className="bg-gradient-to-r from-primary-start to-primary-end h-full rounded-full" style={{ width: `${progress}%` }}></div>
                           </div>
                        </div>

                        {/* Details List */}
                        <div className="space-y-4 mb-6">
                           <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                                 <Clock size={16} />
                              </div>
                              <div>
                                 <p className="text-xs text-gray-400 font-bold uppercase">Date & Time (Deadline)</p>
                                 <p className="text-sm font-semibold text-gray-800">{new Date(goal.deadline).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                              </div>
                           </div>

                           <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500 flex-shrink-0">
                                 <Users size={16} />
                              </div>
                              <div>
                                 <p className="text-xs text-gray-400 font-bold uppercase">Owner / Responsible</p>
                                 <div className="flex items-center mt-1">
                                    <div className="flex -space-x-2 mr-2">
                                       <div className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px]">A</div>
                                       <div className="w-6 h-6 rounded-full bg-gray-300 border border-white flex items-center justify-center text-[10px]">S</div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{state.userProfile.coupleName} (Shared)</span>
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
                                 <Tag size={16} />
                              </div>
                              <div>
                                 <p className="text-xs text-gray-400 font-bold uppercase">Description</p>
                                 <p className="text-sm text-gray-600 leading-relaxed mt-1">
                                    {goal.description || "No description provided for this goal."}
                                 </p>
                              </div>
                           </div>
                        </div>

                        {/* Linked Items */}
                        <div className="border-t border-gray-100 pt-4 mb-6">
                           <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                              <Link size={14} className="text-gray-400" /> Linked Tasks
                           </h4>
                           {linkedTasks.length > 0 ? (
                              <div className="space-y-2">
                                 {linkedTasks.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                       <div className="flex items-center gap-2">
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${t.completed ? 'bg-green-100 border-green-200' : 'border-gray-300'}`}>
                                             {t.completed && <CheckCircle size={10} className="text-green-600" />}
                                          </div>
                                          <span className={t.completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{t.title}</span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-xs text-gray-400 italic">No tasks linked to this goal yet.</p>
                           )}
                        </div>

                        {/* Contribute Form */}
                        {isContributing ? (
                          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 animate-fade-in-up">
                             <h4 className="text-sm font-bold text-gray-800 mb-3">Fazer Aporte</h4>
                             <form onSubmit={handleContribute} className="space-y-3">
                                <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor do Aporte</label>
                                   <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                      <input 
                                         type="number"
                                         value={contributionAmount}
                                         onChange={(e) => setContributionAmount(e.target.value)}
                                         className="w-full pl-8 p-2 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                                         placeholder="0.00"
                                         autoFocus
                                      />
                                   </div>
                                </div>
                                <div className="flex gap-2">
                                   <button 
                                      type="button" 
                                      onClick={() => setIsContributing(false)}
                                      className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-50"
                                   >
                                      Cancelar
                                   </button>
                                   <button 
                                      type="submit"
                                      className="flex-1 py-2 bg-primary-start text-white font-bold rounded-xl text-xs hover:bg-primary-mid shadow-md"
                                   >
                                      Confirmar
                                   </button>
                                </div>
                             </form>
                          </div>
                        ) : (
                          <button 
                             onClick={() => setIsContributing(true)}
                             className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                          >
                             <DollarSign size={18} /> Contribute to Goal
                          </button>
                        )}
                     </>
                   )
                )}
             </div>
          </div>
       </div>
    );
  };

  // Task Overlay Content (Updated to be Editable)
  const renderTaskOverlay = () => {
    const isCreation = isCreateTaskOpen;
    const task = selectedTask;

    if (!task && !isCreation) return null;

    return (
       <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
             {/* Header */}
             <div className="h-24 bg-gradient-to-r from-primary-start to-primary-mid relative flex-shrink-0">
                <button 
                 onClick={() => { setSelectedTask(null); setIsCreateTaskOpen(false); }}
                 className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors backdrop-blur-md"
                >
                  <X size={18} />
                </button>
                <div className="absolute -bottom-8 left-8">
                   <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary-start">
                      <CheckCircle size={32} />
                   </div>
                </div>
             </div>

             <div className="pt-10 px-8 pb-8 overflow-y-auto">
                {isCreation ? (
                  <form onSubmit={handleSubmitNewTask}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Nova Tarefa</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                        <input 
                          required
                          value={newTaskForm.title}
                          onChange={e => setNewTaskForm({...newTaskForm, title: e.target.value})}
                          className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                          placeholder="e.g. Pay bills" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável</label>
                          <select 
                             value={newTaskForm.assignee}
                             onChange={e => setNewTaskForm({...newTaskForm, assignee: e.target.value as any})}
                             className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                          >
                             <option value="both">Ambos</option>
                             <option value="user1">{state.userProfile.user1.name}</option>
                             <option value="user2">{state.userProfile.user2.name}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridade</label>
                          <select 
                             value={newTaskForm.priority}
                             onChange={e => setNewTaskForm({...newTaskForm, priority: e.target.value as any})}
                             className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                          >
                             <option value="low">Baixa</option>
                             <option value="medium">Média</option>
                             <option value="high">Alta</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prazo</label>
                        <input 
                          type="date"
                          value={newTaskForm.deadline}
                          onChange={e => setNewTaskForm({...newTaskForm, deadline: e.target.value})}
                          className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                        />
                      </div>
                      
                      {/* LINK GOAL SELECTION */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vincular a um Objetivo (Opcional)</label>
                        <div className="relative">
                          <select 
                             value={newTaskForm.linkedGoalId}
                             onChange={e => setNewTaskForm({...newTaskForm, linkedGoalId: e.target.value})}
                             className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none appearance-none"
                          >
                             <option value="">Nenhum objetivo vinculado</option>
                             {state.goals.filter(g => g.status === 'in-progress').map(g => (
                               <option key={g.id} value={g.id}>{g.title}</option>
                             ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="w-full py-3 mt-4 bg-primary-start hover:bg-primary-mid text-white font-bold rounded-xl shadow-lg transition-all">
                         Criar Tarefa
                      </button>
                    </div>
                  </form>
                ) : (
                   task && (
                     <>
                        {/* EDITABLE Task Detail View */}
                        <div className="space-y-4">
                           {/* Editable Title */}
                           <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título</label>
                              <input 
                                value={task.title}
                                onChange={(e) => onUpdateTask && onUpdateTask({...task, title: e.target.value})}
                                className="w-full p-2 text-2xl font-bold text-gray-900 border-b border-gray-200 focus:border-primary-mid outline-none bg-transparent"
                              />
                           </div>

                           <div className="flex items-center gap-3 mb-4">
                               {/* Editable Priority */}
                               <div className="relative">
                                  <select
                                     value={task.priority || 'medium'}
                                     onChange={(e) => onUpdateTask && onUpdateTask({...task, priority: e.target.value as any})}
                                     className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:ring-2 ring-primary-mid/20 ${task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
                                  >
                                     <option value="low">Baixa</option>
                                     <option value="medium">Normal</option>
                                     <option value="high">Alta</option>
                                  </select>
                                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                               </div>
                               
                               {/* Completion Toggle */}
                               <button 
                                 onClick={() => onUpdateTask && onUpdateTask({ ...task, completed: !task.completed })}
                                 className={`flex items-center text-xs font-bold px-3 py-1 rounded-full transition-colors ${task.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                               >
                                  <CheckCircle size={14} className="mr-1" /> {task.completed ? 'Concluída' : 'Pendente'}
                               </button>
                           </div>

                           <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                              
                              {/* Editable Deadline */}
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                    <Calendar size={16} />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-xs text-gray-400 font-bold uppercase">Prazo</p>
                                    <input 
                                      type="date"
                                      value={new Date(task.deadline).toISOString().split('T')[0]}
                                      onChange={(e) => onUpdateTask && onUpdateTask({...task, deadline: e.target.value})}
                                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-mid outline-none text-sm font-semibold text-gray-800 py-1"
                                    />
                                 </div>
                              </div>

                              {/* Editable Assignee */}
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                    <User size={16} />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-xs text-gray-400 font-bold uppercase">Atribuído a</p>
                                    <div className="relative">
                                       <select
                                          value={task.assignee}
                                          onChange={(e) => onUpdateTask && onUpdateTask({...task, assignee: e.target.value as any})}
                                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-mid outline-none text-sm font-medium text-gray-700 py-1 appearance-none"
                                       >
                                          <option value="both">Alex & Sam (Ambos)</option>
                                          <option value="user1">{state.userProfile.user1.name}</option>
                                          <option value="user2">{state.userProfile.user2.name}</option>
                                       </select>
                                       <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                                    </div>
                                 </div>
                              </div>

                              {/* Editable Linked Goal */}
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                    <Link size={16} />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Objetivo Vinculado</p>
                                    <div className="relative">
                                       <select
                                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white outline-none focus:border-primary-mid appearance-none pr-8 text-gray-700 font-medium"
                                          onChange={(e) => {
                                             if (onUpdateTask) {
                                                onUpdateTask({ ...task, linkedGoalId: e.target.value || undefined });
                                             }
                                          }}
                                          value={task.linkedGoalId || ""}
                                       >
                                          <option value="">Sem vínculo</option>
                                          {state.goals.filter(g => g.status === 'in-progress').map(g => (
                                            <option key={g.id} value={g.id}>{g.title}</option>
                                          ))}
                                       </select>
                                       <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                         <ChevronDown size={14} />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <button 
                              onClick={() => { setSelectedTask(null); setIsCreateTaskOpen(false); }}
                              className="w-full mt-6 py-3 rounded-xl bg-gray-900 text-white font-bold shadow-lg hover:bg-gray-800 transition-colors"
                           >
                              Concluir Edição
                           </button>
                        </div>
                     </>
                   )
                )}
             </div>
          </div>
       </div>
    );
  };

  const renderCreateTransactionOverlay = () => {
    if (!isCreateTransOpen) return null;

    return (
       <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
             {/* Header */}
             <div className="h-24 bg-gradient-to-r from-green-500 to-green-600 relative flex-shrink-0">
                <button 
                 onClick={() => setIsCreateTransOpen(false)}
                 className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors backdrop-blur-md"
                >
                  <X size={18} />
                </button>
                <div className="absolute -bottom-8 left-8">
                   <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-green-600">
                      <LayoutGrid size={32} />
                   </div>
                </div>
             </div>

             <div className="pt-10 px-8 pb-8 overflow-y-auto">
                <form onSubmit={handleSubmitNewTransaction}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Nova Transação</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                      <input 
                        required
                        value={newTransForm.description}
                        onChange={e => setNewTransForm({...newTransForm, description: e.target.value})}
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                        placeholder="Ex: Supermercado" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={newTransForm.amount}
                        onChange={e => setNewTransForm({...newTransForm, amount: e.target.value})}
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                        placeholder="0.00" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                        <select 
                           value={newTransForm.type}
                           onChange={e => setNewTransForm({...newTransForm, type: e.target.value as any})}
                           className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                        >
                           <option value="expense">Despesa</option>
                           <option value="income">Receita</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                        <input 
                          type="date"
                          value={newTransForm.date}
                          onChange={e => setNewTransForm({...newTransForm, date: e.target.value})}
                          className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                      <input 
                        required
                        value={newTransForm.category}
                        onChange={e => setNewTransForm({...newTransForm, category: e.target.value})}
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none" 
                        placeholder="Ex: Alimentação, Lazer" 
                      />
                    </div>

                    <button type="submit" className="w-full py-3 mt-4 bg-primary-start hover:bg-primary-mid text-white font-bold rounded-xl shadow-lg transition-all">
                       Adicionar Transação
                    </button>
                  </div>
                </form>
             </div>
          </div>
       </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      
      {/* Page Header - Only keeping update badge */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
           <span className="text-xs font-medium px-3 py-1 bg-gray-100 text-gray-500 rounded-full">
             Última atualização: Hoje, 09:00
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (Main Content) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. TRANSACTIONS SECTION */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <LayoutGrid size={18} className="text-primary-mid" />
                Últimas Transações
              </h3>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsCreateTransOpen(true)}
                   className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-primary-start hover:text-white transition-colors"
                 >
                    <Plus size={16} />
                 </button>
                 <button 
                   onClick={() => setIsTransModalOpen(true)}
                   className="text-sm font-medium text-primary-start hover:text-primary-mid transition-colors"
                 >
                   Ver Todas
                 </button>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {lastTransactions.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleTransactionClick(t)}
                  className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                       {t.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm group-hover:text-primary-mid transition-colors">{t.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{t.category}</span>
                         <span className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-gray-800'}`}>
                        {t.type === 'expense' ? '-' : '+'}${t.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-400">{t.userId === 'user1' ? state.userProfile.user1.name : state.userProfile.user2.name}</span>
                        <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[8px] text-gray-500">
                          {t.userId === 'user1' ? state.userProfile.user1.name[0] : state.userProfile.user2.name[0]}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-mid" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. TASKS SECTION */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary-mid" />
                Últimas Tarefas
              </h3>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsCreateTaskOpen(true)}
                   className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-primary-start hover:text-white transition-colors"
                 >
                    <Plus size={16} />
                 </button>
                 <button 
                   onClick={() => setIsTaskModalOpen(true)}
                   className="text-sm font-medium text-primary-start hover:text-primary-mid transition-colors"
                 >
                   Ver Todas
                 </button>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {lastTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTask(task)}
                  className="border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-primary-mid/30 transition-all cursor-pointer bg-white group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-start to-primary-end opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {task.priority || 'Normal'}
                    </span>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onUpdateTask) onUpdateTask({...task, completed: !task.completed});
                      }}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${task.completed ? 'bg-green-100 border-green-200 text-green-600' : 'border-gray-300 text-transparent group-hover:border-primary-mid'}`}
                    >
                      <CheckCircle size={12} fill="currentColor" className={task.completed ? "opacity-100" : "opacity-0"} />
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-primary-mid transition-colors">{task.title}</h4>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center -space-x-2">
                       <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] text-gray-500">
                         {task.assignee === 'user1' ? state.userProfile.user1.name[0] : (task.assignee === 'user2' ? state.userProfile.user2.name[0] : 'B')}
                       </div>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center">
                       <Calendar size={12} className="mr-1" />
                       {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. GOALS SECTION */}
          <section>
             <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <Target size={18} className="text-primary-mid" />
                   Objetivos Ativos
                </h3>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => setIsCreateGoalOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-primary-start hover:text-white hover:border-primary-start transition-all text-gray-500 shadow-sm"
                   >
                      <Plus size={16} />
                   </button>
                   <button onClick={() => onNavigate(Tab.GOALS)} className="text-sm text-gray-500 hover:text-primary-start transition-colors">Ver Todos</button>
                </div>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
                {activeGoals.map(goal => {
                  const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                  return (
                    <div key={goal.id} onClick={() => setSelectedGoal(goal)} className="min-w-[280px] flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 snap-center cursor-pointer hover:shadow-md transition-all group">
                       <div className="flex justify-between items-start mb-3">
                          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-primary-start group-hover:scale-110 transition-transform">
                             <Target size={20} />
                          </div>
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-lg">
                            {progress.toFixed(0)}%
                          </span>
                       </div>
                       <h4 className="font-bold text-gray-800 mb-1">{goal.title}</h4>
                       <p className="text-xs text-gray-400 mb-3">Meta: ${goal.targetAmount.toLocaleString()}</p>
                       
                       <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                         <div className="bg-gradient-to-r from-primary-start to-primary-end h-full rounded-full" style={{ width: `${progress}%` }}></div>
                       </div>
                       <div className="flex justify-between text-[10px] text-gray-400">
                          <span>${goal.currentAmount.toLocaleString()}</span>
                          <span>{new Date(goal.deadline).toLocaleDateString()}</span>
                       </div>
                    </div>
                  );
                })}
             </div>
          </section>

        </div>

        {/* RIGHT COLUMN (Side Content) */}
        <div className="space-y-8">
          
          {/* 4. INVESTMENTS SUMMARY */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-start/5 to-transparent rounded-bl-full -z-0"></div>
             <div className="flex justify-between items-start mb-6 relative z-10">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <TrendingUp size={18} className="text-primary-mid" />
                   Meu Portfólio
                </h3>
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full border border-green-100">
                  +{profitability}%
                </span>
             </div>
             <div className="mb-6 relative z-10">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Valor Total</p>
                <h2 className="text-3xl font-bold text-gray-900">${currentVal.toLocaleString()}</h2>
                <p className="text-xs text-gray-500 mt-1">
                   Investido: <span className="font-medium text-gray-700">${totalInvested.toLocaleString()}</span>
                </p>
             </div>
             <div className="flex items-center justify-between pt-4 border-t border-gray-50 relative z-10">
                <div className="flex -space-x-2">
                   <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">4</div>
                   <div className="w-8 h-8 rounded-full bg-white border-2 border-white flex items-center justify-center text-[10px] text-gray-400 shadow-sm">+2</div>
                </div>
                <button onClick={() => onNavigate(Tab.INVESTMENTS)} className="text-xs font-bold text-primary-start hover:underline">Ver Detalhes</button>
             </div>
          </div>

          {/* INSIGHTS IA (Small) */}
          <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl shadow-sm border border-blue-100 p-6">
             <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-blue-500" />
                <h3 className="font-bold text-gray-800 text-sm">Insights IA</h3>
             </div>
             <h4 className="font-bold text-gray-800 text-sm mb-2">Oportunidade em Renda Fixa</h4>
             <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Taxas de juros atuais favorecem títulos pré-fixados. Considere realocar 5% da carteira.
             </p>
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-medium bg-white px-2 py-1 rounded border border-gray-100 text-gray-400">+2 insights</span>
                <button 
                  onClick={() => onNavigate(Tab.INVESTMENTS)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
                >
                   Ver Consultora
                </button>
             </div>
          </div>

          {/* PERFORMANCE PLACEHOLDER */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center min-h-[200px] text-center relative border-dashed border-2 border-gray-200">
             <BarChart3 className="text-gray-300 mb-3" size={32} />
             <p className="text-sm font-bold text-gray-400">Gráfico de performance</p>
             <p className="text-xs text-gray-300 mt-1">Será implementado em breve</p>
          </div>

          {/* 5. CALENDAR QUICK VIEW */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-5 bg-gray-50/50 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                   <Calendar size={16} className="text-primary-mid" />
                   Agenda do Casal
                </h3>
             </div>
             <div className="p-2">
                {state.events.slice(0, 3).map(evt => (
                   <div 
                     key={evt.id} 
                     onClick={() => setSelectedEvent(evt)}
                     className="flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors gap-3 cursor-pointer active:scale-[0.98] transform duration-100"
                   >
                      <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 text-gray-500 text-[10px] font-bold leading-tight">
                         <span>{new Date(evt.start).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                         <span className="text-sm text-gray-800">{new Date(evt.start).getDate()}</span>
                      </div>
                      <div className="overflow-hidden">
                         <h4 className="text-sm font-bold text-gray-800 truncate">{evt.title}</h4>
                         <p className="text-xs text-gray-400 flex items-center mt-0.5">
                            <Clock size={10} className="mr-1" /> 
                            {new Date(evt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </p>
                      </div>
                   </div>
                ))}
             </div>
             <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={() => onNavigate(Tab.CALENDAR)}
                  className="w-full py-2 text-sm font-bold text-gray-500 hover:text-primary-start bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                   Abrir Calendário
                </button>
             </div>
          </div>

        </div>
      </div>

      {/* MODALS */}
      {renderModal(
        "Todas as Transações", 
        isTransModalOpen, 
        () => setIsTransModalOpen(false),
        <div className="space-y-2">
          {state.transactions.map(t => (
            <div key={t.id} onClick={() => handleTransactionClick(t)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50">
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                     {t.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                     <p className="font-bold text-gray-800">{t.description}</p>
                     <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()} • {t.category}</p>
                  </div>
               </div>
               <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-gray-800'}`}>
                  {t.type === 'expense' ? '-' : '+'}${t.amount.toLocaleString()}
               </span>
            </div>
          ))}
        </div>
      )}

      {renderModal(
        "Todas as Tarefas", 
        isTaskModalOpen, 
        () => setIsTaskModalOpen(false),
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedTasks.map(task => (
            <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group cursor-pointer">
               <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                     {task.priority || 'Normal'}
                  </span>
                  {task.completed && <CheckCircle size={16} className="text-green-500" />}
               </div>
               <h4 className="font-bold text-gray-800 mb-1">{task.title}</h4>
               <p className="text-xs text-gray-500 flex items-center mt-2">
                  <Calendar size={12} className="mr-1" /> {new Date(task.deadline).toLocaleDateString()}
               </p>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-gray-100 to-gray-200 group-hover:from-primary-start group-hover:to-primary-mid transition-all"></div>
            </div>
          ))}
        </div>,
        // Custom Filter Actions for Tasks
        <div className="flex items-center gap-2">
           <div className="relative">
             <select 
               value={taskSort.field}
               onChange={(e) => setTaskSort(prev => ({ ...prev, field: e.target.value as any }))}
               className="appearance-none pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:border-primary-mid cursor-pointer"
             >
               <option value="deadline">Prazo</option>
               <option value="priority">Prioridade</option>
               <option value="assignee">Responsável</option>
             </select>
             <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
           </div>
           
           <button 
             onClick={() => setTaskSort(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
             className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
             title={`Ordenar: ${taskSort.direction === 'asc' ? 'Crescente' : 'Decrescente'}`}
           >
             <ArrowUpDown size={16} className={taskSort.direction === 'desc' ? 'transform rotate-180 transition-transform' : 'transition-transform'} />
           </button>
        </div>
      )}

      {/* Goal Overlay */}
      {renderGoalOverlay()}

      {/* Task Overlay (Creation & Details) */}
      {renderTaskOverlay()}

      {/* Create Transaction Overlay */}
      {renderCreateTransactionOverlay()}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-scale-in">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                 <X size={18} />
              </button>

              <div className="mb-6">
                 <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3
                    ${selectedEvent.type === 'finance' ? 'bg-green-50 text-green-600' : 
                      selectedEvent.type === 'social' ? 'bg-pink-50 text-pink-600' : 
                      selectedEvent.type === 'work' ? 'bg-blue-50 text-blue-600' : 
                      'bg-gray-100 text-gray-600'}`
                 }>
                    <Tag size={12} className="mr-1.5" />
                    {selectedEvent.type}
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 leading-tight">{selectedEvent.title}</h3>
              </div>

              <div className="space-y-4 bg-gray-50 rounded-2xl p-4">
                 <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary-start shadow-sm">
                       <Calendar size={20} />
                    </div>
                    <div>
                       <p className="text-xs text-gray-400 font-bold uppercase">Data</p>
                       <p className="text-sm font-semibold text-gray-800">
                          {new Date(selectedEvent.start).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary-mid shadow-sm">
                       <Clock size={20} />
                    </div>
                    <div>
                       <p className="text-xs text-gray-400 font-bold uppercase">Horário</p>
                       <p className="text-sm font-semibold text-gray-800">
                          {new Date(selectedEvent.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedEvent.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </p>
                    </div>
                 </div>
              </div>

              <div className="mt-6">
                 <button 
                   onClick={() => { setSelectedEvent(null); onNavigate(Tab.CALENDAR); }}
                   className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
                 >
                    Ver no Calendário
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Transaction Detail & Edit Modal */}
      {(selectedTransaction || isEditingTransaction) && editTransactionForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
              {/* Close Button */}
              <button 
                onClick={() => {
                   setSelectedTransaction(null);
                   setIsEditingTransaction(false);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors z-20"
              >
                 <X size={18} />
              </button>
              
              <div className="p-8 pb-4 flex-1 overflow-y-auto">
                 {/* Icon */}
                 <div className="flex justify-center mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${editTransactionForm.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                       {editTransactionForm.type === 'income' ? <ArrowDownLeft size={40} /> : <ArrowUpRight size={40} />}
                    </div>
                 </div>
                 
                 {isEditingTransaction ? (
                    /* EDIT MODE */
                    <div className="space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                          <input 
                            type="text" 
                            value={editTransactionForm.description}
                            onChange={(e) => setEditTransactionForm({...editTransactionForm, description: e.target.value})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none font-bold text-gray-800"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
                          <input 
                            type="number" 
                            value={editTransactionForm.amount}
                            onChange={(e) => setEditTransactionForm({...editTransactionForm, amount: parseFloat(e.target.value) || 0})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none font-bold text-gray-800"
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                             <select 
                                value={editTransactionForm.type}
                                onChange={(e) => setEditTransactionForm({...editTransactionForm, type: e.target.value as any})}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-sm"
                             >
                                <option value="expense">Despesa</option>
                                <option value="income">Receita</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                             <input 
                               type="text" 
                               value={editTransactionForm.category}
                               onChange={(e) => setEditTransactionForm({...editTransactionForm, category: e.target.value})}
                               className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-sm"
                             />
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                          <input 
                            type="date" 
                            value={new Date(editTransactionForm.date).toISOString().split('T')[0]}
                            onChange={(e) => setEditTransactionForm({...editTransactionForm, date: new Date(e.target.value).toISOString()})}
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-sm"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável</label>
                          <div className="relative">
                            <select 
                               value={editTransactionForm.userId}
                               onChange={(e) => setEditTransactionForm({...editTransactionForm, userId: e.target.value})}
                               className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none text-sm appearance-none"
                            >
                               <option value="user1">{state.userProfile.user1.name}</option>
                               <option value="user2">{state.userProfile.user2.name}</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                       </div>
                    </div>
                 ) : (
                    /* VIEW MODE */
                    <>
                       <div className="text-center mb-6">
                          <h3 className={`text-3xl font-bold ${editTransactionForm.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                             {editTransactionForm.type === 'expense' ? '-' : '+'}${editTransactionForm.amount.toLocaleString()}
                          </h3>
                          <p className="text-gray-800 font-bold text-xl mt-2">{editTransactionForm.description}</p>
                          <p className="text-gray-500 text-sm">{editTransactionForm.category}</p>
                       </div>

                       <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                             <span className="text-gray-500">Data</span>
                             <span className="font-medium text-gray-800">{new Date(editTransactionForm.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                             <span className="text-gray-500">Tipo</span>
                             <span className="font-medium text-gray-800 capitalize">{editTransactionForm.type === 'income' ? 'Receita' : 'Despesa'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                             <span className="text-gray-500">Responsável</span>
                             <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                   {editTransactionForm.userId === 'user1' ? state.userProfile.user1.name[0] : state.userProfile.user2.name[0]}
                                </div>
                                <span className="font-medium text-gray-800">{editTransactionForm.userId === 'user1' ? state.userProfile.user1.name : state.userProfile.user2.name}</span>
                             </div>
                          </div>
                       </div>
                    </>
                 )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 pt-0">
                 {isEditingTransaction ? (
                    <div className="flex gap-3">
                       <button 
                         onClick={handleCancelEdit}
                         className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                       >
                         <RotateCcw size={18} /> Cancelar
                       </button>
                       <button 
                         onClick={handleSaveTransaction}
                         className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                       >
                         <Save size={18} /> Salvar
                       </button>
                    </div>
                 ) : (
                    <button 
                       onClick={() => setIsEditingTransaction(true)}
                       className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                       <Edit2 size={16} /> Editar Transação
                    </button>
                 )}
              </div>

           </div>
        </div>
      )}

    </div>
  );
};

export default Overview;
