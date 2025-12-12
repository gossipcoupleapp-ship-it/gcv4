
export enum Tab {
  OVERVIEW = 'Visão Geral',
  DASHBOARD = 'Dashboard',
  CALENDAR = 'Calendar',
  GOALS = 'Goals',
  INVESTMENTS = 'Investments',
  AI_AGENT = 'AI Agent',
  SETTINGS = 'Configurações',
  NEWS = 'Informações e Novidades',
  PRIVACY = 'Política de Privacidade'
}

export type UserRole = 'P1' | 'P2';

export interface OnboardingData {
  userName: string;
  coupleName?: string;
  monthlyIncome: string;
  incomeReceiptDate: string; // Day of the month (1-31)
  riskProfile?: 'low' | 'medium' | 'high';
  calendarConnected: boolean;
  profileImage?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
  userId: string; // 'user1' or 'user2'
}

export interface Goal {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  deadline: string;
  status: 'in-progress' | 'achieved';
  description?: string;
  category?: string; // e.g. 'Travel', 'Asset', 'Emergency', 'Experience'
}

export interface Task {
  id: string;
  title: string;
  assignee: 'user1' | 'user2' | 'both';
  deadline: string;
  completed: boolean;
  linkedGoalId?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'finance' | 'social' | 'work' | 'task';
  description?: string;
  value?: number;
  assignee?: 'user1' | 'user2' | 'both';
  linkedGoalId?: string;
  // Sync Fields
  synced?: boolean;
  googleCalendarLink?: string;
}

export interface InvestmentRecommendation {
  symbol: string;
  name: string;
  price: string;
  rationale: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface Investment {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  shares: number;
  type: 'stock' | 'crypto' | 'etf';
  // New detailed fields
  description?: string;
  totalInvested?: number;
  linkedGoalId?: string;
  contributions?: { date: string; amount: number }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isThinking?: boolean;
  payload?: any;
}

export interface UserDetail {
  name: string;
  email: string;
  monthlyIncome: string;
  incomeReceiptDate: string;
}

export interface AppState {
  transactions: Transaction[];
  goals: Goal[];
  tasks: Task[];
  events: CalendarEvent[];
  investments: Investment[];
  userProfile: {
    user1: UserDetail;
    user2: UserDetail;
    coupleName: string;
    riskTolerance: 'low' | 'medium' | 'high';
    inviteLink?: string;
  };
}
