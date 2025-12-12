

import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { AppState, Transaction, Goal, Task, CalendarEvent } from "../types";
import { supabase } from "../src/lib/supabase";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Tool Definitions

const createTransactionTool: FunctionDeclaration = {
  name: 'createTransaction',
  description: 'Log a new financial transaction (expense or income) for the couple.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: 'The amount of money.' },
      category: { type: Type.STRING, description: 'Category like Food, Rent, Travel, Salary.' },
      description: { type: Type.STRING, description: 'Short description of the transaction.' },
      type: { type: Type.STRING, enum: ['income', 'expense'], description: 'Is it income or expense?' },
      date: { type: Type.STRING, description: 'ISO date string (YYYY-MM-DD).' }
    },
    required: ['amount', 'category', 'type']
  }
};

const createGoalTool: FunctionDeclaration = {
  name: 'createGoal',
  description: 'Create a new financial goal for the couple.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Name of the goal, e.g., Trip to Japan.' },
      targetAmount: { type: Type.NUMBER, description: 'Target amount to save.' },
      deadline: { type: Type.STRING, description: 'Target date ISO string (YYYY-MM-DD).' }
    },
    required: ['title', 'targetAmount']
  }
};

const createTaskTool: FunctionDeclaration = {
  name: 'createTask',
  description: 'Assign a task to a partner. Use this when the user asks to do something or pay something.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Task description.' },
      assignee: { type: Type.STRING, enum: ['user1', 'user2', 'both'], description: 'Who is responsible.' },
      deadline: { type: Type.STRING, description: 'Due date ISO string.' },
      linkedGoalId: { type: Type.STRING, description: 'The ID of the goal this task is linked to, if any.' },
      priority: { type: Type.STRING, enum: ['high', 'medium', 'low'], description: 'Priority of the task.' },
      financial_impact: { type: Type.NUMBER, description: 'If the task involves paying money (e.g. paying rent), put the amount here. Otherwise 0.' }
    },
    required: ['title', 'assignee']
  }
};

const createEventTool: FunctionDeclaration = {
  name: 'createEvent',
  description: 'Schedule an event in Google Calendar.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Event title.' },
      start: { type: Type.STRING, description: 'Start ISO string.' },
      end: { type: Type.STRING, description: 'End ISO string.' },
      type: { type: Type.STRING, enum: ['finance', 'social', 'work', 'task'], description: 'Type of event.' }
    },
    required: ['title', 'start', 'end']
  }
};

const getInvestmentAdviceTool: FunctionDeclaration = {
  name: 'getInvestmentAdvice',
  description: 'Get general investment advice based on risk profile.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Specific question or topic.' }
    }
  }
};

// Main Service Class

export class GeminiService {
  private model: string = 'gemini-2.5-flash';

  // RAG Lite: Build Context from Supabase
  private async buildContext(coupleId: string) {
    // 1. Fetch Balances (Sum of transactions)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, category, date, description')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false })
      .limit(10); // Last 10 for context

    const { data: allTrans } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('couple_id', coupleId);

    const balance = allTrans?.reduce((acc, t) => {
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0) || 0;

    // 2. Fetch Active Goals
    const { data: goals } = await supabase
      .from('goals')
      .select('title, current_amount, target_amount')
      .eq('couple_id', coupleId)
      .eq('status', 'in-progress');

    return {
      balance,
      recentTransactions: transactions || [],
      activeGoals: goals || []
    };
  }

  // Use search grounding for market data
  async searchMarketData(query: string) {
    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: `Provide real-time market data and analysis for: ${query}. distinctively list current price, change percentage, and a brief sentiment analysis.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const text = response.text;
      return { text, grounding };
    } catch (error) {
      console.error("Search Error:", error);
      return { text: "Sorry, I couldn't fetch market data right now.", grounding: [] };
    }
  }

  async chatWithAgent(
    message: string,
    coupleId: string, // Changed from AppState to coupleId
    currentState: AppState, // Kept for assignee names/profile access if needed, but we rely on DB for financial data
    actionCallbacks: {
      onTransaction: (t: Omit<Transaction, 'id' | 'userId'>) => void,
      onGoal: (g: Omit<Goal, 'id' | 'currentAmount' | 'status'>) => void,
      onTask: (t: Omit<Task, 'id' | 'completed'> & { financial_impact?: number }) => void,
      onEvent: (e: Omit<CalendarEvent, 'id'>) => void
    }
  ) {
    // Build RAG Context
    const context = await this.buildContext(coupleId);

    const systemInstruction = `
      You are a sophisticated AI financial planner for a couple (${currentState.userProfile.user1.name} and ${currentState.userProfile.user2.name}).
      Your goal is to manage their finances, calendar, and tasks.
      Current Date: ${new Date().toLocaleDateString()}
      
      REAL-TIME FINANCIAL CONTEXT (FROM DATABASE):
      - Total Balance (Net Worth): R$ ${context.balance.toFixed(2)}
      - Active Goals: ${context.activeGoals.map(g => `${g.title} (${g.current_amount}/${g.target_amount})`).join(', ')}
      - Recent Transactions: \n${context.recentTransactions.map(t => `- ${t.date}: ${t.category} (R$ ${t.amount}) [${t.type}]`).join('\n')}
      
      Tone: Professional, minimalist, tech-forward, helpful.
      
      When the user asks to perform an action, call the appropriate tool.
      If creating a task that involves paying something (like "Pay rent" or "Buy groceries"), ALWAYS use the 'financial_impact' parameter in 'createTask' to specify the cost.
    `;

    const tools: Tool[] = [{
      functionDeclarations: [createTransactionTool, createGoalTool, createTaskTool, createEventTool, getInvestmentAdviceTool]
    }];

    try {
      const result = await ai.models.generateContent({
        model: this.model,
        contents: message,
        config: {
          systemInstruction,
          tools,
          temperature: 0.7
        }
      });

      const response = result;
      const functionCalls = response.functionCalls;
      let replyText = response.text || "Action processed.";

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const args = call.args as any;

          if (call.name === 'createTransaction') {
            actionCallbacks.onTransaction({
              amount: args.amount,
              category: args.category,
              description: args.description || args.category,
              type: args.type as 'income' | 'expense',
              date: args.date || new Date().toISOString()
            });
            replyText = `I've registered a ${args.type} of R$${args.amount} for ${args.category}.`;
          } else if (call.name === 'createGoal') {
            actionCallbacks.onGoal({
              title: args.title,
              targetAmount: args.targetAmount,
              deadline: args.deadline || new Date(Date.now() + 86400000 * 30).toISOString()
            });
            replyText = `New goal created: ${args.title} with a target of R$${args.targetAmount}.`;
          } else if (call.name === 'createTask') {
            actionCallbacks.onTask({
              title: args.title,
              assignee: args.assignee as any,
              deadline: args.deadline || new Date().toISOString(),
              priority: args.priority as any,
              linkedGoalId: args.linkedGoalId,
              financial_impact: args.financial_impact || 0
            });
            replyText = `Task assigned to ${args.assignee}: ${args.title}.`;
          } else if (call.name === 'createEvent') {
            actionCallbacks.onEvent({
              title: args.title,
              start: args.start,
              end: args.end,
              type: args.type || 'social'
            });
            replyText = `Added "${args.title}" to your calendar.`;
          }
        }
      }

      return { text: replyText, functionCalls, payload: undefined };

    } catch (error) {
      console.error("Chat Error:", error);
      return { text: "I encountered an error processing your request.", functionCalls: undefined, payload: undefined };
    }
  }

  // New dedicated specialized investment consultation method
  async chatInvestment(message: string, appState: AppState) {
    const systemInstruction = `
      You are "Consultora IA", an expert Investment Consultant for a couple (${appState.userProfile.user1.name} & ${appState.userProfile.user2.name}).
      User Risk Tolerance: ${appState.userProfile.riskTolerance}.
      Active Goals: ${appState.goals.map(g => `${g.title} (Target: ${g.targetAmount}, Current: ${g.currentAmount})`).join('; ')}.
      
      Your capabilities:
      - Analyze assets (stocks, crypto, ETFs, funds).
      - Suggest investments that align with the couple's risk profile and goals.
      - Provide market commentary.
      
      CRITICAL COMPLIANCE:
      - Always include a brief, subtle reminder that this is not professional financial advice.
      - Be data-driven but accessible.
      - Use the 'googleSearch' tool to find the absolute latest real-time prices and news when specific assets or market trends are mentioned.
    `;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: message,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: 0.5
        }
      });

      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const text = response.text;

      return { text, grounding };
    } catch (error) {
      console.error("Investment Chat Error:", error);
      return { text: "Desculpe, não consegui acessar os dados de mercado no momento.", grounding: [] };
    }
  }
}