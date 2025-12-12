
import React, { useState } from 'react';
import { CalendarEvent, Goal } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  X, 
  Calendar as CalendarIcon, 
  Users,
  Plus,
  DollarSign,
  AlignLeft,
  Link,
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  goals?: Goal[];
  onAddEvent?: (event: Omit<CalendarEvent, 'id'>, shouldSync: boolean) => Promise<void>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, goals = [], onAddEvent }) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date>(new Date());
  
  // Day View Modal State (when day has multiple events)
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [dayViewEvents, setDayViewEvents] = useState<CalendarEvent[]>([]);
  const [dayViewDate, setDayViewDate] = useState<Date>(new Date());

  // Form State
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    type: 'social' as 'finance' | 'social' | 'work' | 'task',
    startTime: '12:00',
    endTime: '13:00',
    description: '',
    assignee: 'both' as 'user1' | 'user2' | 'both',
    value: '',
    linkedGoalId: '',
    syncToGoogle: true
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDate = new Date(); // Mock current date focus

  // Handle Date Click
  const handleDateClick = (day: number) => {
    // Determine the clicked date object
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    // Find events for this day
    const dayEvents = events.filter(e => {
        const eDate = new Date(e.start);
        return eDate.getDate() === day && eDate.getMonth() === currentDate.getMonth();
    });

    if (dayEvents.length > 0) {
       // Open Day View Overlay showing everything for that day
       setDayViewEvents(dayEvents);
       setDayViewDate(clickedDate);
       setIsDayViewOpen(true);
    } else {
       // Open Create Modal directly if empty
       openCreateModal(clickedDate);
    }
  };

  const openCreateModal = (date: Date) => {
     setNewEventDate(date);
     setNewEventForm({
        title: '',
        type: 'social',
        startTime: '09:00',
        endTime: '10:00',
        description: '',
        assignee: 'both',
        value: '',
        linkedGoalId: '',
        syncToGoogle: true
     });
     setIsCreateOpen(true);
     setIsDayViewOpen(false); // Close day view if opening create from there
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!onAddEvent) return;
     
     setIsCreating(true);

     // Construct start and end ISO strings
     const dateStr = newEventDate.toISOString().split('T')[0];
     const startISO = `${dateStr}T${newEventForm.startTime}:00`;
     const endISO = `${dateStr}T${newEventForm.endTime}:00`;

     try {
       await onAddEvent({
          title: newEventForm.title,
          type: newEventForm.type,
          start: startISO,
          end: endISO,
          description: newEventForm.description,
          assignee: newEventForm.assignee,
          value: newEventForm.value ? parseFloat(newEventForm.value) : undefined,
          linkedGoalId: newEventForm.linkedGoalId || undefined
       }, newEventForm.syncToGoogle);

       setIsCreateOpen(false);
     } catch (err) {
       console.error("Error creating event", err);
     } finally {
       setIsCreating(false);
     }
  };

  // Generate calendar grid
  const renderCalendarDays = () => {
    const grid = [];
    for (let i = 1; i <= 30; i++) {
      const dayEvents = events.filter(e => {
         const d = new Date(e.start);
         return d.getDate() === i && d.getMonth() === currentDate.getMonth();
      });
      const hasEvent = dayEvents.length > 0;
      
      grid.push(
        <div 
          key={i} 
          onClick={() => handleDateClick(i)}
          className={`min-h-[100px] border-r border-b border-gray-100 p-2 relative group transition-all duration-200
            ${i === 1 ? 'border-l border-t rounded-tl-2xl' : (i <= 7 ? 'border-t' : (i % 7 === 1 ? 'border-l' : ''))}
            ${i === 7 ? 'rounded-tr-2xl' : ''}
            ${i === 29 ? 'rounded-bl-2xl' : ''}
            ${hasEvent ? 'bg-gray-50/50 hover:bg-white cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'}
          `}
        >
          <span className={`text-xs font-medium inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors
            ${i === currentDate.getDate() ? 'bg-primary-start text-white shadow-md' : 'text-gray-400 group-hover:text-gray-600'}
          `}>
            {i}
          </span>
          
          <div className="mt-2 space-y-1">
            {dayEvents.slice(0, 3).map(evt => (
              <div key={evt.id} className="text-[10px] bg-white border border-gray-100 shadow-sm p-1.5 rounded-lg truncate text-gray-600 group-hover:border-primary-mid/30 group-hover:text-primary-mid transition-colors flex items-center justify-between">
                <div className="flex items-center truncate">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${
                      evt.type === 'social' ? 'bg-pink-400' : 
                      evt.type === 'finance' ? 'bg-green-400' : 
                      evt.type === 'work' ? 'bg-blue-400' : 'bg-gray-400'
                    }`}></span>
                    <span className="truncate">{evt.title}</span>
                </div>
                {evt.value && <span className="text-[9px] font-bold ml-1 text-gray-500">${evt.value}</span>}
              </div>
            ))}
            {dayEvents.length > 3 && (
               <div className="text-[9px] text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
            )}
          </div>

          {/* Add hint on hover for empty days */}
          {!hasEvent && (
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Plus className="text-gray-300" size={24} />
             </div>
          )}
        </div>
      );
    }
    return grid;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">October 2023</h2>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Synced with Google Calendar
            </p>
        </div>
        <div className="flex space-x-2">
            <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full border border-gray-100 transition-colors text-gray-600"><ChevronLeft size={20} /></button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full border border-gray-100 transition-colors text-gray-600"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
            {days.map(d => (
                <div key={d} className="py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
            ))}
        </div>
        <div className="grid grid-cols-7">
            {renderCalendarDays()}
        </div>
      </div>

      {/* Upcoming List */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          <CalendarIcon size={20} className="mr-2 text-primary-mid" />
          Upcoming Events
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.slice(0, 4).map(evt => (
                <div 
                  key={evt.id} 
                  onClick={() => setSelectedEvent(evt)}
                  className="flex items-center p-4 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="flex flex-col items-center bg-gray-50 group-hover:bg-white border border-gray-100 rounded-xl p-3 min-w-[70px] transition-colors shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(evt.start).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-2xl font-bold text-gray-800">{new Date(evt.start).getDate()}</span>
                    </div>
                    <div className="ml-4 flex-1">
                        <div className="flex justify-between items-start">
                           <h4 className="font-bold text-gray-800 text-lg group-hover:text-primary-mid transition-colors">{evt.title}</h4>
                           {evt.synced && <div className="text-blue-500" title="Synced to Google Calendar"><Check size={14} /></div>}
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 font-medium">
                            <span className="flex items-center bg-gray-100 px-2 py-0.5 rounded-full">
                              <Clock size={12} className="mr-1.5" /> 
                              {new Date(evt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                              evt.type === 'task' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                              evt.type === 'finance' ? 'bg-green-50 text-green-600 border-green-100' : 
                              evt.type === 'social' ? 'bg-pink-50 text-pink-600 border-pink-100' :
                              'bg-gray-50 text-gray-600 border-gray-100'
                            }`}>
                              {evt.type}
                            </span>
                        </div>
                    </div>
                    {/* Hover indicator */}
                    <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary-mid">
                        <ChevronRight size={20} />
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* --- DAY VIEW OVERLAY --- */}
      {isDayViewOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
               {/* Header */}
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-gray-50">
                  <div>
                     <h3 className="text-xl font-bold text-gray-900">{dayViewDate.toLocaleDateString(undefined, { weekday: 'long' })}</h3>
                     <p className="text-sm text-gray-500 font-medium">{dayViewDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <button 
                    onClick={() => setIsDayViewOpen(false)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors shadow-sm"
                  >
                    <X size={20} />
                  </button>
               </div>

               {/* Events List */}
               <div className="overflow-y-auto p-4 space-y-3 flex-1 bg-gray-50/50">
                  {dayViewEvents.map(evt => (
                     <div 
                        key={evt.id} 
                        onClick={() => { setIsDayViewOpen(false); setSelectedEvent(evt); }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-primary-mid/30 hover:shadow-md transition-all cursor-pointer group"
                     >
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                 evt.type === 'social' ? 'bg-pink-400' : 
                                 evt.type === 'finance' ? 'bg-green-400' : 
                                 evt.type === 'work' ? 'bg-blue-400' : 'bg-gray-400'
                              }`}></span>
                              <span className="text-[10px] font-bold uppercase text-gray-400">{evt.type}</span>
                              {evt.synced && (
                                <span className="bg-blue-50 text-blue-500 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-100">
                                   <Check size={8} /> Synced
                                </span>
                              )}
                           </div>
                           {evt.assignee && (
                              <div className="flex -space-x-1.5">
                                 {evt.assignee === 'both' ? (
                                    <>
                                       <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600">A</div>
                                       <div className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600">S</div>
                                    </>
                                 ) : (
                                    <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-bold text-gray-600">
                                       {evt.assignee === 'user1' ? 'A' : 'S'}
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                        <div className="flex justify-between items-start">
                           <h4 className="font-bold text-gray-800 text-sm group-hover:text-primary-mid transition-colors">{evt.title}</h4>
                           {evt.value && (
                              <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">${evt.value.toLocaleString()}</span>
                           )}
                        </div>
                        <div className="flex items-center mt-2 text-xs text-gray-500 font-medium">
                           <Clock size={12} className="mr-1" />
                           {new Date(evt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(evt.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                     </div>
                  ))}
               </div>

               {/* Footer Action */}
               <div className="p-4 bg-white border-t border-gray-100">
                  <button 
                     onClick={() => openCreateModal(dayViewDate)}
                     className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                     <Plus size={18} /> Adicionar Nova Ação
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- CREATE EVENT MODAL --- */}
      {isCreateOpen && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
               <div className="h-20 bg-gradient-to-r from-primary-start to-primary-mid flex items-center px-6 justify-between flex-shrink-0">
                  <h3 className="text-white font-bold text-lg flex items-center">
                     <CalendarIcon size={20} className="mr-2" /> Novo Evento
                  </h3>
                  <button onClick={() => setIsCreateOpen(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-colors">
                     <X size={18} />
                  </button>
               </div>
               
               <form onSubmit={handleSubmitCreate} className="overflow-y-auto p-6 space-y-5">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                     <input 
                        required
                        type="text"
                        placeholder="Ex: Jantar no Mario's"
                        value={newEventForm.title}
                        onChange={(e) => setNewEventForm({...newEventForm, title: e.target.value})}
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                        disabled={isCreating}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                        <select 
                           value={newEventForm.type}
                           onChange={(e) => setNewEventForm({...newEventForm, type: e.target.value as any})}
                           className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                           disabled={isCreating}
                        >
                           <option value="social">Social</option>
                           <option value="finance">Financeiro</option>
                           <option value="work">Trabalho</option>
                           <option value="task">Tarefa</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável</label>
                        <select 
                           value={newEventForm.assignee}
                           onChange={(e) => setNewEventForm({...newEventForm, assignee: e.target.value as any})}
                           className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                           disabled={isCreating}
                        >
                           <option value="both">Ambos</option>
                           <option value="user1">Alex</option>
                           <option value="user2">Sam</option>
                        </select>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Início</label>
                        <input 
                           type="time"
                           value={newEventForm.startTime}
                           onChange={(e) => setNewEventForm({...newEventForm, startTime: e.target.value})}
                           className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                           disabled={isCreating}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fim</label>
                        <input 
                           type="time"
                           value={newEventForm.endTime}
                           onChange={(e) => setNewEventForm({...newEventForm, endTime: e.target.value})}
                           className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                           disabled={isCreating}
                        />
                     </div>
                  </div>

                  {/* Optional Value */}
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (Opcional)</label>
                     <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                           type="number"
                           placeholder="0.00"
                           value={newEventForm.value}
                           onChange={(e) => setNewEventForm({...newEventForm, value: e.target.value})}
                           className="w-full pl-9 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none"
                           disabled={isCreating}
                        />
                     </div>
                  </div>

                  {/* Goal Linking */}
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vincular Objetivo</label>
                     <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select 
                           value={newEventForm.linkedGoalId}
                           onChange={(e) => setNewEventForm({...newEventForm, linkedGoalId: e.target.value})}
                           className="w-full pl-9 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none appearance-none"
                           disabled={isCreating}
                        >
                           <option value="">Sem vínculo</option>
                           {goals.filter(g => g.status === 'in-progress').map(g => (
                              <option key={g.id} value={g.id}>{g.title}</option>
                           ))}
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                     <textarea 
                        rows={3}
                        placeholder="Detalhes adicionais..."
                        value={newEventForm.description}
                        onChange={(e) => setNewEventForm({...newEventForm, description: e.target.value})}
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary-mid outline-none resize-none"
                        disabled={isCreating}
                     />
                  </div>
                  
                  {/* Google Calendar Sync Checkbox */}
                  <div 
                     className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${newEventForm.syncToGoogle ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                     onClick={() => !isCreating && setNewEventForm({...newEventForm, syncToGoogle: !newEventForm.syncToGoogle})}
                  >
                     <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${newEventForm.syncToGoogle ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'}`}>
                        {newEventForm.syncToGoogle && <Check size={12} strokeWidth={4} />}
                     </div>
                     <div>
                       <p className={`text-sm font-bold ${newEventForm.syncToGoogle ? 'text-blue-700' : 'text-gray-600'}`}>Sincronizar com Google Calendar</p>
                       {newEventForm.syncToGoogle && <p className="text-xs text-blue-600/80">O evento será adicionado automaticamente.</p>}
                     </div>
                  </div>

                  <button 
                     type="submit" 
                     disabled={isCreating}
                     className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                     {isCreating ? (
                        <>
                           <Loader2 size={20} className="animate-spin" /> Processando...
                        </>
                     ) : (
                        "Criar Evento"
                     )}
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* --- EVENT DETAILS MODAL (Updated with new fields) --- */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in">
              {/* Decorative Header */}
              <div className={`h-24 w-full bg-gradient-to-r ${
                 selectedEvent.type === 'social' ? 'from-pink-400 to-rose-400' :
                 selectedEvent.type === 'finance' ? 'from-emerald-400 to-teal-400' :
                 selectedEvent.type === 'work' ? 'from-blue-400 to-indigo-400' :
                 'from-gray-400 to-gray-500'
              }`}>
                 <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
                 >
                   <X size={18} />
                 </button>
              </div>

              <div className="px-8 pb-8 -mt-10">
                 {/* Icon Badge */}
                 <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg mb-4">
                    <div className={`w-full h-full rounded-xl flex items-center justify-center ${
                      selectedEvent.type === 'social' ? 'bg-pink-50 text-pink-500' :
                      selectedEvent.type === 'finance' ? 'bg-emerald-50 text-emerald-500' :
                      'bg-blue-50 text-blue-500'
                    }`}>
                       <CalendarIcon size={32} />
                    </div>
                 </div>

                 <div className="flex justify-between items-start">
                    <div>
                       <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedEvent.title}</h3>
                       <p className="text-gray-500 mb-6 flex items-center text-sm">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            selectedEvent.type === 'social' ? 'bg-pink-400' :
                            selectedEvent.type === 'finance' ? 'bg-emerald-400' :
                            'bg-blue-400'
                          }`}></span>
                          {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)} Event
                       </p>
                    </div>
                    {selectedEvent.synced && (
                       <div className="bg-blue-50 p-2 rounded-lg border border-blue-100" title="Synced with Google Calendar">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-5 h-5" />
                       </div>
                    )}
                 </div>

                 <div className="space-y-4">
                    {/* Date & Time */}
                    <div className="flex items-start p-3 bg-gray-50 rounded-xl">
                       <Clock className="text-gray-400 mt-0.5 mr-3" size={18} />
                       <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</p>
                          <p className="text-gray-800 font-medium text-sm">
                             {new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-gray-600 text-sm">
                             {new Date(selectedEvent.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedEvent.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                       </div>
                    </div>

                    {/* Participants / Owner */}
                    <div className="flex items-start p-3 bg-gray-50 rounded-xl">
                       <Users className="text-gray-400 mt-0.5 mr-3" size={18} />
                       <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Responsible</p>
                          <div className="flex items-center mt-1.5">
                             {(!selectedEvent.assignee || selectedEvent.assignee === 'both') ? (
                                <div className="flex -space-x-2">
                                   <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">A</div>
                                   <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-pink-600">S</div>
                                </div>
                             ) : (
                                <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                                   {selectedEvent.assignee === 'user1' ? 'A' : 'S'}
                                </div>
                             )}
                             <span className="ml-3 text-sm text-gray-600 font-medium capitalize">
                                {selectedEvent.assignee === 'both' ? 'Alex & Sam' : (selectedEvent.assignee === 'user1' ? 'Alex' : 'Sam')}
                             </span>
                          </div>
                       </div>
                    </div>

                    {/* Value - Explicitly Rendered */}
                    {selectedEvent.value ? (
                       <div className="flex items-start p-3 bg-gray-50 rounded-xl">
                          <DollarSign className="text-gray-400 mt-0.5 mr-3" size={18} />
                          <div>
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Value</p>
                             <p className="text-gray-800 font-bold text-sm">${selectedEvent.value.toLocaleString()}</p>
                          </div>
                       </div>
                    ) : null}

                    {/* Linked Goal - Explicitly Rendered */}
                    {selectedEvent.linkedGoalId ? (
                       <div className="flex items-start p-3 bg-gray-50 rounded-xl">
                          <Link className="text-gray-400 mt-0.5 mr-3" size={18} />
                          <div>
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Linked Goal</p>
                             <p className="text-gray-800 font-medium text-sm">
                                {goals.find(g => g.id === selectedEvent.linkedGoalId)?.title || 'Goal ID: ' + selectedEvent.linkedGoalId}
                             </p>
                          </div>
                       </div>
                    ) : null}

                    {/* Description */}
                    <div className="flex items-start p-3 bg-gray-50 rounded-xl">
                       <AlignLeft className="text-gray-400 mt-0.5 mr-3" size={18} />
                       <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</p>
                          <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                             {selectedEvent.description || `This is a shared ${selectedEvent.type} event.`}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 flex gap-3">
                   <button 
                      onClick={() => setSelectedEvent(null)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-bold transition-all active:scale-[0.98]"
                   >
                      Close
                   </button>
                   {selectedEvent.synced && selectedEvent.googleCalendarLink && (
                     <a 
                       href={selectedEvent.googleCalendarLink}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                     >
                       <ExternalLink size={16} /> Ver no Google
                     </a>
                   )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
