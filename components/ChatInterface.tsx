import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Bot, Sparkles, Loader2, X } from 'lucide-react';

interface ChatInterfaceProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'modal' | 'page';
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  onConfirmAction?: (type: string, data: any) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  isOpen = true, 
  onClose, 
  variant = 'modal',
  messages,
  onSendMessage,
  isThinking,
  onConfirmAction
}) => {
  const [input, setInput] = useState('');
  const [loadingStage, setLoadingStage] = useState(0); // 0: sent, 1: analyzing, 2: replying
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isThinking]);

  // Simulate loading stages for visual feedback
  useEffect(() => {
    if (isThinking) {
      setLoadingStage(0);
      const interval = setInterval(() => {
        setLoadingStage(prev => (prev + 1) % 3);
      }, 1500);
      processingRef.current = interval;
      return () => clearInterval(interval);
    } else {
      if (processingRef.current) clearInterval(processingRef.current);
      setLoadingStage(0);
    }
  }, [isThinking]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen && variant === 'modal') return null;

  // Base container classes
  const containerClasses = variant === 'modal'
    ? "fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    : "h-full flex flex-col animate-fade-in bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden";

  const innerContainerClasses = variant === 'modal'
    ? "relative w-full max-w-lg h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20"
    : "flex-1 flex flex-col overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Backdrop for Modal only */}
      {variant === 'modal' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      )}
      
      {/* Main Content */}
      <div className={innerContainerClasses}>
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary-start via-primary-mid to-primary-end text-white shadow-lg z-10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
             <div className="relative">
               <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                 <Sparkles size={20} className="text-white" />
               </div>
               <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary-mid rounded-full"></span>
             </div>
             <div>
               <h2 className="font-bold text-lg leading-tight">Assistente IA</h2>
               <p className="text-xs text-white/80 font-medium flex items-center">
                 <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>Online
               </p>
             </div>
          </div>
          {variant === 'modal' && onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 relative">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-start to-primary-mid flex-shrink-0 flex items-center justify-center text-white mr-3 mt-1 shadow-sm">
                  <Bot size={14} />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-white text-gray-800 border-t border-l border-gray-100 rounded-tr-none ml-12' 
                  : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
              }`}>
                {msg.role === 'user' && <p className="text-xs text-gray-400 mb-1 text-right">Você</p>}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Inline Typing Indicator (Page Variant Only) */}
          {isThinking && variant === 'page' && (
            <div className="flex justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-start to-primary-mid flex-shrink-0 flex items-center justify-center text-white mr-3 mt-1 shadow-sm">
                <Bot size={14} />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center">
                 <div className="flex space-x-1.5 h-4 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
                 <span className="text-xs text-gray-400 ml-3 font-medium">Processando...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />

          {/* Processing Overlay (Modal Variant Only) */}
          {isThinking && variant === 'modal' && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="w-20 h-20 relative mb-6">
                   <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-t-primary-mid border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="text-primary-mid animate-pulse" size={24} />
                   </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {loadingStage === 0 && "Enviando mensagem..."}
                  {loadingStage === 1 && "Analisando finanças..."}
                  {loadingStage === 2 && "Gerando resposta..."}
                </h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Estou conectando seus dados para trazer a melhor resposta. Por favor aguarde.
                </p>
             </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-2 bg-gray-50 rounded-full p-1.5 border border-gray-200 focus-within:border-primary-mid focus-within:ring-2 focus-within:ring-primary-mid/20 transition-all shadow-sm">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Converse comigo... pergunte ou me peça qualquer tarefa ✨"
              className="flex-1 bg-transparent px-4 py-3 outline-none text-sm text-gray-700 placeholder-gray-400"
              disabled={isThinking}
              autoFocus
            />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || isThinking}
              className="p-3 rounded-full bg-gradient-to-r from-primary-start to-primary-mid text-white hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
            >
              <Send size={18} className={input.trim() ? 'animate-pulse' : ''} />
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default ChatInterface;