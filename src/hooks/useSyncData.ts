
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppState, Transaction, Goal, Task, CalendarEvent, Investment } from '../../types';
import { Database } from '../db_types';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];
type InvestmentRow = Database['public']['Tables']['investments']['Row'];

export function useSyncData(coupleId: string | null) {
    const [data, setData] = useState<Partial<AppState>>({
        transactions: [],
        goals: [],
        tasks: [],
        events: [],
        investments: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial Fetch & Realtime Subscription
    useEffect(() => {
        if (!coupleId) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [transRes, goalsRes, tasksRes, eventsRes, investRes] = await Promise.all([
                    supabase.from('transactions').select('*').eq('couple_id', coupleId).order('date', { ascending: false }),
                    supabase.from('goals').select('*').eq('couple_id', coupleId),
                    supabase.from('tasks').select('*').eq('couple_id', coupleId),
                    supabase.from('events').select('*').eq('couple_id', coupleId),
                    supabase.from('investments').select('*').eq('couple_id', coupleId)
                ]);

                if (transRes.error) throw transRes.error;
                if (goalsRes.error) throw goalsRes.error;
                if (tasksRes.error) throw tasksRes.error;
                if (eventsRes.error) throw eventsRes.error;
                if (investRes.error) throw investRes.error;

                if (isMounted) {
                    setData({
                        transactions: (transRes.data || []).map(mapTransaction),
                        goals: (goalsRes.data || []).map(mapGoal),
                        tasks: (tasksRes.data || []).map(mapTask),
                        events: (eventsRes.data || []).map(mapEvent),
                        investments: (investRes.data || []).map(mapInvestment)
                    });
                }
            } catch (err: any) {
                console.error("Error fetching sync data:", err);
                if (isMounted) setError(err.message || 'Error syncing data');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        // Realtime Subscriptions
        const channel = supabase
            .channel(`sync:${coupleId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `couple_id=eq.${coupleId}` }, (payload) => {
                handleRealtimeChange('transactions', payload, mapTransaction, 'date', 'desc');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `couple_id=eq.${coupleId}` }, (payload) => {
                handleRealtimeChange('goals', payload, mapGoal);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `couple_id=eq.${coupleId}` }, (payload) => {
                handleRealtimeChange('tasks', payload, mapTask);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `couple_id=eq.${coupleId}` }, (payload) => {
                handleRealtimeChange('events', payload, mapEvent);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `couple_id=eq.${coupleId}` }, (payload) => {
                handleRealtimeChange('investments', payload, mapInvestment);
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [coupleId]);

    // Helper to update local state efficiently
    const handleRealtimeChange = (
        key: keyof AppState,
        payload: any,
        mapper: (row: any) => any,
        orderBy?: string,
        orderDir?: 'asc' | 'desc'
    ) => {
        setData((prev) => {
            let newList = [...(prev[key] as any[])];
            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (eventType === 'INSERT') {
                newList.push(mapper(newRecord));
            } else if (eventType === 'UPDATE') {
                newList = newList.map(item => item.id === newRecord.id || (item.symbol && item.symbol === newRecord.symbol) ? mapper(newRecord) : item);
            } else if (eventType === 'DELETE') {
                newList = newList.filter(item => (item.id && item.id !== oldRecord.id) || (item.symbol && item.symbol !== oldRecord.symbol));
            }

            if (orderBy && newList.length > 0) {
                newList.sort((a, b) => {
                    const dateA = new Date(a[orderBy]).getTime();
                    const dateB = new Date(b[orderBy]).getTime();
                    return orderDir === 'desc' ? dateB - dateA : dateA - dateB;
                });
            }

            return { ...prev, [key]: newList };
        });
    };

    return { data, loading, error };
}

// Mappers
function mapTransaction(row: TransactionRow): Transaction {
    return {
        id: row.id,
        amount: row.amount,
        category: row.category,
        description: row.description || '',
        date: row.date,
        type: (row.type as 'income' | 'expense') || 'expense',
        userId: row.user_id ? 'user1' : 'user2'
    };
}

function mapGoal(row: GoalRow): Goal {
    return {
        id: row.id,
        title: row.title,
        targetAmount: row.target_amount,
        currentAmount: row.current_amount || 0,
        deadline: row.deadline || '',
        status: (row.status as 'in-progress' | 'achieved') || 'in-progress',
        category: row.category || ''
    };
}

function mapTask(row: TaskRow): Task {
    return {
        id: row.id,
        title: row.title,
        assignee: 'both',
        deadline: row.deadline || '',
        completed: row.completed || false, // Should now map nicely if DB is boolean
        linkedGoalId: row.linked_goal_id || undefined,
        priority: (row.priority as 'high' | 'medium' | 'low') || 'medium'
    };
}

function mapEvent(row: EventRow): CalendarEvent {
    return {
        id: row.id,
        title: row.title,
        start: row.start_time,
        end: row.end_time,
        type: (row.type as any) || 'social',
        synced: !!row.google_event_id,
        assignee: 'both'
    };
}

function mapInvestment(row: InvestmentRow): Investment {
    return {
        symbol: row.symbol || '',
        name: row.name || '',
        price: row.current_price || 0,
        change: 0,
        changePercent: 0,
        shares: row.quantity || 0,
        type: 'stock',
        totalInvested: (row.quantity || 0) * (row.purchase_price || 0)
    };
}
