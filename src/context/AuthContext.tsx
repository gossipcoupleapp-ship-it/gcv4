import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Types derived from DB
// Transformed Profile Type (CamelCase for Frontend)
export interface Profile {
    id: string;
    coupleId: string | null;
    name: string | null;
    email: string | null;
    role: 'P1' | 'P2' | null;
    monthlyIncome: number;
    incomeReceiptDate: number | null;
    riskProfile: 'low' | 'medium' | 'high' | null;
    onboardingCompleted: boolean;
    avatarUrl?: string | null;
}

export interface Couple {
    id: string;
    name: string | null;
    subscriptionStatus: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled';
    stripeCustomerId: string | null;
    stripeSubscriptionId?: string | null;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    couple: Couple | null;
    loading: boolean;
    isP1: boolean;
    isP2: boolean;
    subscriptionActive: boolean;
    onboardingCompleted: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [couple, setCouple] = useState<Couple | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper to fetch profile and couple
    const fetchProfileAndCouple = async (userId: string) => {
        try {
            // 1. Get Profile
            const { data: dbProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError || !dbProfile) {
                console.warn("Profile fetch warning:", profileError || "No profile found");
                return;
            }

            const rawProfile = dbProfile as any;

            // TRANSFORM: DB (snake_case) -> Frontend (camelCase)
            const mappedProfile: Profile = {
                id: rawProfile.id,
                coupleId: rawProfile.couple_id,
                name: rawProfile.full_name, // Fixes name display issue
                email: rawProfile.email,
                role: rawProfile.role,
                monthlyIncome: rawProfile.monthly_income,
                incomeReceiptDate: rawProfile.income_receipt_day || rawProfile.income_date, // Handle both potential DB columns
                riskProfile: rawProfile.risk_profile,
                onboardingCompleted: rawProfile.onboarding_completed,
                avatarUrl: rawProfile.avatar_url
            };

            setProfile(mappedProfile);

            // 2. Get Couple (if exists)
            if (rawProfile.couple_id) {
                const { data: dbCouple, error: coupleError } = await supabase
                    .from('couples')
                    .select('*')
                    .eq('id', rawProfile.couple_id)
                    .single();

                if (!coupleError && dbCouple) {
                    const rawCouple = dbCouple as any;
                    // TRANSFORM Couple
                    const mappedCouple: Couple = {
                        id: rawCouple.id,
                        name: rawCouple.name,
                        subscriptionStatus: rawCouple.subscription_status,
                        stripeCustomerId: rawCouple.stripe_customer_id,
                        stripeSubscriptionId: rawCouple.stripe_subscription_id
                    };
                    setCouple(mappedCouple);
                }
            } else {
                setCouple(null);
            }
        } catch (error) {
            console.error("Error in fetchProfileAndCouple:", error);
        }
    };

    useEffect(() => {
        // 1. Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfileAndCouple(session.user.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // 2. Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                setLoading(true);
                fetchProfileAndCouple(session.user.id).finally(() => setLoading(false));
            } else {
                setProfile(null);
                setCouple(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 3. Realtime Subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('public:profile-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                (payload) => {
                    console.log('Realtime Profile Update:', payload);
                    fetchProfileAndCouple(user.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Derived State
    const isP1 = profile?.role === 'P1';
    const isP2 = profile?.role === 'P2';
    const subscriptionActive = couple?.subscriptionStatus === 'active' || couple?.subscriptionStatus === 'trialing';
    const onboardingCompleted = !!profile?.onboardingCompleted;

    const value = {
        session,
        user,
        profile,
        couple,
        loading,
        isP1,
        isP2,
        subscriptionActive,
        onboardingCompleted,
        refreshProfile: async () => { if (user) await fetchProfileAndCouple(user.id); }
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
