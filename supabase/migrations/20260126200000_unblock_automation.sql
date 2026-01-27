-- Create blocked_resources table
CREATE TABLE IF NOT EXISTS public.blocked_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('chatbot', 'flow')),
    resource_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, resource_type, resource_id)
);

ALTER TABLE public.blocked_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to blocked_resources" ON public.blocked_resources
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );

-- Allow Admins to manage Chatbots
CREATE POLICY "Admins can view all chatbots" ON public.chatbots FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

CREATE POLICY "Admins can update all chatbots" ON public.chatbots FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- Allow Admins to manage Flows
CREATE POLICY "Admins can view all flows" ON public.flows FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

CREATE POLICY "Admins can update all flows" ON public.flows FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);
