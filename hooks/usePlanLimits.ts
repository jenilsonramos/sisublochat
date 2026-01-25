import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PlanLimits {
    max_instances: number;
    max_contacts: number;
    max_chatbots: number;
    max_users: number;
    ai_enabled: boolean;
}

export interface CurrentUsage {
    instances: number;
    contacts: number;
    chatbots: number;
    users: number;
}

// Basic caching outside the hook to keep state between mounts
let cachedLimits: PlanLimits | null = null;
let cachedUsage: CurrentUsage | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10000; // 10 seconds

export const usePlanLimits = () => {
    const [limits, setLimits] = useState<PlanLimits | null>(cachedLimits);
    const [usage, setUsage] = useState<CurrentUsage | null>(cachedUsage);
    const [loading, setLoading] = useState(!cachedLimits);

    const fetchLimitsAndUsage = async (force = false) => {
        if (!force && cachedLimits && (Date.now() - lastFetchTime < CACHE_DURATION)) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Subscription, Plan AND Profile to check for ADMIN status
            const [subResponse, profileResponse] = await Promise.all([
                supabase
                    .from('subscriptions')
                    .select(`
                        id,
                        status,
                        plan:plans (
                            max_instances,
                            max_contacts,
                            max_chatbots,
                            max_users,
                            ai_enabled
                        )
                    `)
                    .eq('user_id', user.id)
                    .maybeSingle(),
                supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle()
            ]);

            const subData = subResponse.data;
            const isAdmin = profileResponse.data?.role === 'ADMIN';

            // Default to basic limits if no subscription found
            // BUT UNLOCK AI IF ADMIN
            const planData = subData?.plan;
            let activePlan: PlanLimits = (Array.isArray(planData) ? planData[0] : planData) || {
                max_instances: 1,
                max_contacts: 500,
                max_chatbots: 1,
                max_users: 1,
                ai_enabled: false
            };

            // Status check: if subscription exists but is not active, maybe restrict features?
            // For now, we trust the database but ensure ADMIN has everything.
            if (isAdmin) {
                activePlan = {
                    ...activePlan,
                    ai_enabled: true,
                    max_instances: Math.max(activePlan.max_instances || 0, 100),
                    max_chatbots: Math.max(activePlan.max_chatbots || 0, 100)
                };
            }

            setLimits(activePlan as any);
            cachedLimits = activePlan as any;

            // 2. Get Usage (Parallelized)
            const [
                { count: instCount },
                { count: contactsCount },
                { count: botsCount },
                { count: usersCount }
            ] = await Promise.all([
                supabase.from('instances').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('chatbots').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'OPERATOR') // More specific count
            ]);

            const newUsage = {
                instances: instCount || 0,
                contacts: contactsCount || 0,
                chatbots: botsCount || 0,
                users: usersCount || 0
            };

            setUsage(newUsage);
            cachedUsage = newUsage;
            lastFetchTime = Date.now();
        } catch (error) {
            console.error('Error fetching plan limits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLimitsAndUsage();
    }, []);

    const isLimitReached = (feature: keyof CurrentUsage) => {
        if (!limits || !usage) return false;
        const limitKey = `max_${feature}` as keyof PlanLimits;
        return usage[feature] >= (limits[limitKey] as number);
    };

    const hasFeature = (feature: keyof PlanLimits) => {
        if (!limits) return false;
        return !!limits[feature];
    };

    return { limits, usage, loading, isLimitReached, hasFeature, refresh: fetchLimitsAndUsage };
};
