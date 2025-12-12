
import React, { useState } from 'react';
import { Goal, Task, Transaction } from '../types';
import { Target, Calendar, Plus, X, Clock, Users, Tag, Link, CheckCircle, DollarSign } from 'lucide-react';

interface GoalsViewProps {
  goals: Goal[];
  tasks?: Task[];
  onCreateGoal?: (goal: Omit<Goal, 'id' | 'currentAmount' | 'status'>) => void;
  onUpdateGoal?: (goal: Goal) => void;
  onCreateTransaction?: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
}

const GoalsView: React.FC<GoalsViewProps> = ({ goals, tasks = [], onCreateGoal, onUpdateGoal, onCreateTransaction }) => {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  
  // Contribution State
  const [isContributing, setIsContributing] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');

  // New Goal Form State
  const [newGoalForm, setNewGoalForm] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    category: 'Finance',
    description: ''
  });

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
      setNewGoalForm({ title: '', targetAmount: '', deadline: '', category: 'Finance', description: '' });
    }
  };

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

  const renderGoalOverlay = () => {
    const isCreation = isCreateGoalOpen;
    const goal = selectedGoal;
    const progress = goal ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    const linkedTasks = goal ? tasks.filter(t => t.linkedGoalId === goal.id) : [];

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
                                    <span className="text-sm font-medium text-gray-700">Alex & Sam (Shared)</span>
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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setIsCreateGoalOpen(true)}
          className="bg-primary-start hover:bg-primary-mid text-white px-4 py-2.5 rounded-xl shadow-md flex items-center text-sm font-bold transition-colors"
        >
          <Plus size={18} className="mr-2" /> New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          
          return (
            <div 
              key={goal.id} 
              onClick={() => setSelectedGoal(goal)}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden cursor-pointer hover:shadow-md hover:border-primary-mid/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-pink-50 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Target className="text-primary-start" size={24} />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${progress >= 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {progress >= 100 ? 'Achieved' : 'In Progress'}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-primary-mid transition-colors">{goal.title}</h3>
              <div className="flex items-center text-gray-400 text-xs mb-4 font-medium">
                <Calendar size={12} className="mr-1" /> Target: {new Date(goal.deadline).toLocaleDateString()}
              </div>

              <div className="mb-2 flex justify-between items-end">
                <span className="text-2xl font-bold text-gray-800">${goal.currentAmount.toLocaleString()}</span>
                <span className="text-sm text-gray-500 mb-1">of ${goal.targetAmount.toLocaleString()}</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary-start to-primary-end h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <p className="mt-4 text-sm text-gray-500 font-medium">
                {progress >= 100 
                  ? "Congratulations! You've reached this goal." 
                  : `You need $${(goal.targetAmount - goal.currentAmount).toLocaleString()} more to reach your target.`}
              </p>
            </div>
          );
        })}
        
        {/* Add new goal placeholder card */}
        <div 
          onClick={() => setIsCreateGoalOpen(true)}
          className="border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-primary-mid hover:text-primary-mid hover:bg-primary-start/5 transition-all cursor-pointer h-full min-h-[250px] group"
        >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-primary-start/10 transition-colors">
              <Plus size={32} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-bold text-lg">Create a new shared goal</span>
            <span className="text-sm opacity-70 mt-1">Set targets and track progress</span>
        </div>
      </div>

      {/* Render Overlay */}
      {renderGoalOverlay()}

    </div>
  );
};

export default GoalsView;
