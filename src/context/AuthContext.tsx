import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Types derived from DB
export interface Profile {
    id: string;
    couple_id: string | null;
    full_name: string | null;
    email: string | null;
    role: 'P1' | 'P2' | null;
    monthly_income: number;
    income_receipt_day: number | null;
    risk_profile: 'low' | 'medium' | 'high' | null;
    onboarding_completed: boolean;
    avatar_url?: string | null;
}

export interface Couple {
    id: string;
    name: string | null;
    subscription_status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled';
    stripe_customer_id: string | null;
    stripe_subscription_id?: string | null;
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
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                // If profile doesn't exist (race condition on signup?), it might be created by trigger or manual insert later.
                console.warn("Profile fetch warning:", profileError);
                return;
            }

            setProfile(profileData as Profile);

            // 2. Get Couple (if exists)
            if (profileData.couple_id) {
                const { data: coupleData, error: coupleError } = await supabase
                    .from('couples')
                    .select('*')
                    .eq('id', profileData.couple_id)
                    .single();

                if (!coupleError) {
                    setCouple(coupleData as Couple);
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

    // 3. Realtime Subscription (Listen for Profile/Couple updates - crucial for webhook flows)
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('public:profile-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                (payload) => {
                    console.log('Realtime Profile Update:', payload);
                    fetchProfileAndCouple(user.id); // Re-fetch to be safe and get relations
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
    const subscriptionActive = couple?.subscription_status === 'active' || couple?.subscription_status === 'trialing';
    const onboardingCompleted = !!profile?.onboarding_completed;

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
