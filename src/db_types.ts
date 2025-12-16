
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            couples: {
                Row: {
                    id: string
                    name: string
                    subscription_status: string | null
                    stripe_customer_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    subscription_status?: string | null
                    stripe_customer_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    subscription_status?: string | null
                    stripe_customer_id?: string | null
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    couple_id: string | null
                    full_name: string | null
                    role: 'P1' | 'P2' | null
                    monthly_income: number | null
                    income_receipt_day: number | null
                    risk_profile: 'low' | 'medium' | 'high' | null
                    onboarding_completed: boolean
                    avatar_url: string | null
                }
                Insert: {
                    id: string
                    couple_id?: string | null
                    full_name?: string | null
                    role?: 'P1' | 'P2' | null
                    monthly_income?: number | null
                    income_receipt_day?: number | null
                    risk_profile?: 'low' | 'medium' | 'high' | null
                    onboarding_completed?: boolean
                    avatar_url?: string | null
                }
                Update: {
                    id?: string
                    couple_id?: string | null
                    full_name?: string | null
                    role?: 'P1' | 'P2' | null
                    monthly_income?: number | null
                    income_receipt_day?: number | null
                    risk_profile?: 'low' | 'medium' | 'high' | null
                    onboarding_completed?: boolean
                    avatar_url?: string | null
                }
            }
            goals: {
                Row: {
                    id: string
                    couple_id: string
                    title: string
                    target_amount: number
                    current_amount: number
                    deadline: string | null
                    status: string | null
                    category: string | null
                }
                Insert: {
                    id?: string
                    couple_id: string
                    title: string
                    target_amount: number
                    current_amount?: number
                    deadline?: string | null
                    status?: string | null
                    category?: string | null
                }
                Update: {
                    id?: string
                    couple_id?: string
                    title?: string
                    target_amount?: number
                    current_amount?: number
                    deadline?: string | null
                    status?: string | null
                    category?: string | null
                }
            }
            tasks: {
                Row: {
                    id: string
                    couple_id: string
                    title: string
                    assignee_id: string | null
                    deadline: string | null
                    completed: boolean
                    financial_impact: number
                    priority: string | null
                    linked_goal_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    couple_id: string
                    title: string
                    assignee_id?: string | null
                    deadline?: string | null
                    completed?: boolean
                    financial_impact?: number
                    priority?: string | null
                    linked_goal_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    couple_id?: string
                    title?: string
                    assignee_id?: string | null
                    deadline?: string | null
                    completed?: boolean
                    financial_impact?: number
                    priority?: string | null
                    linked_goal_id?: string | null
                    created_at?: string
                }
            }
            transactions: {
                Row: {
                    id: string
                    couple_id: string
                    user_id: string | null
                    amount: number
                    category: string
                    description: string | null
                    type: string | null
                    date: string
                    status: string | null
                    linked_task_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    couple_id: string
                    user_id?: string | null
                    amount: number
                    category: string
                    description?: string | null
                    type?: string | null
                    date?: string
                    status?: string | null
                    linked_task_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    couple_id?: string
                    user_id?: string | null
                    amount?: number
                    category?: string
                    description?: string | null
                    type?: string | null
                    date?: string
                    status?: string | null
                    linked_task_id?: string | null
                    created_at?: string
                }
            }
            events: {
                Row: {
                    id: string
                    couple_id: string
                    title: string
                    start_time: string
                    end_time: string
                    type: string | null
                    google_event_id: string | null
                    assignee_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    couple_id: string
                    title: string
                    start_time: string
                    end_time: string
                    type?: string | null
                    google_event_id?: string | null
                    assignee_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    couple_id?: string
                    title?: string
                    start_time?: string
                    end_time?: string
                    type?: string | null
                    google_event_id?: string | null
                    assignee_id?: string | null
                    created_at?: string
                }
            }
            investments: {
                Row: {
                    id: string
                    couple_id: string
                    symbol: string | null
                    name: string | null
                    quantity: number | null
                    purchase_price: number | null
                    current_price: number | null
                    change_percent: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    couple_id: string
                    symbol?: string | null
                    name?: string | null
                    quantity?: number | null
                    purchase_price?: number | null
                    current_price?: number | null
                    change_percent?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    couple_id?: string
                    symbol?: string | null
                    name?: string | null
                    quantity?: number | null
                    purchase_price?: number | null
                    current_price?: number | null
                    change_percent?: number | null
                    created_at?: string
                }
            }
        }
    }
}
