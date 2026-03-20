-- MIGRATION: Fix RLS Policies for mission_assignments and other tables
-- This migration re-applies and strengthens all missing or broken RLS policies

-- =============================================
-- 1. mission_assignments — Drop & recreate all policies
-- =============================================
ALTER TABLE public.mission_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view assignments" ON public.mission_assignments;
DROP POLICY IF EXISTS "Admins/Managers can manage assignments" ON public.mission_assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.mission_assignments;
DROP POLICY IF EXISTS "mission_assignments_select" ON public.mission_assignments;
DROP POLICY IF EXISTS "mission_assignments_insert" ON public.mission_assignments;
DROP POLICY IF EXISTS "mission_assignments_delete" ON public.mission_assignments;

-- Anyone in the same team can read
CREATE POLICY "mission_assignments_select" ON public.mission_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = mission_assignments.team_id
              AND team_members.user_id = auth.uid()
        )
        OR (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
    );

-- Admins and managers can insert
CREATE POLICY "mission_assignments_insert" ON public.mission_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = mission_assignments.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.role IN ('admin', 'manager')
        )
        OR (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
    );

-- Admins and managers can delete
CREATE POLICY "mission_assignments_delete" ON public.mission_assignments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = mission_assignments.team_id
              AND team_members.user_id = auth.uid()
              AND team_members.role IN ('admin', 'manager')
        )
        OR (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
    );

-- =============================================
-- 2. notifications — Only if the table exists
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
    EXECUTE $p$CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true)$p$;
    EXECUTE $p$CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true)$p$;
  END IF;
END $$;

-- =============================================
-- 3. notification_reminders — Only if the table exists
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_reminders') THEN
    ALTER TABLE public.notification_reminders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notification_reminders_select" ON public.notification_reminders;
    DROP POLICY IF EXISTS "notification_reminders_insert" ON public.notification_reminders;
    DROP POLICY IF EXISTS "notification_reminders_delete" ON public.notification_reminders;
    EXECUTE $p$CREATE POLICY "notification_reminders_select" ON public.notification_reminders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.team_members tm JOIN public.missions m ON m.team_id = tm.team_id WHERE tm.user_id = auth.uid()) OR target_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "notification_reminders_insert" ON public.notification_reminders FOR INSERT TO authenticated WITH CHECK (true)$p$;
    EXECUTE $p$CREATE POLICY "notification_reminders_delete" ON public.notification_reminders FOR DELETE TO authenticated USING (true)$p$;
  END IF;
END $$;

-- =============================================
-- 4. payment_reminders_log — Ensure RLS is enabled
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_reminders_log') THEN
    ALTER TABLE public.payment_reminders_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "payment_reminders_log_select" ON public.payment_reminders_log;
    DROP POLICY IF EXISTS "payment_reminders_log_insert" ON public.payment_reminders_log;

    EXECUTE $p$
    CREATE POLICY "payment_reminders_log_select" ON public.payment_reminders_log
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.team_members
                WHERE team_members.team_id = payment_reminders_log.team_id
                  AND team_members.user_id = auth.uid()
                  AND team_members.role IN ('admin', 'manager')
            )
            OR (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
        )
    $p$;

    EXECUTE $p$
    CREATE POLICY "payment_reminders_log_insert" ON public.payment_reminders_log
        FOR INSERT TO authenticated
        WITH CHECK (true)
    $p$;
  END IF;
END $$;

-- =============================================
-- 5. stock_movements — Verify policies exist
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
    DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;

    EXECUTE $p$
    CREATE POLICY "stock_movements_select" ON public.stock_movements
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.team_members tm
                JOIN public.materiel mat ON mat.user_id = stock_movements.user_id
                WHERE tm.user_id = auth.uid() AND tm.role IN ('admin', 'manager')
            )
            OR (SELECT is_superadmin FROM public.profiles WHERE user_id = auth.uid()) = true
        )
    $p$;

    EXECUTE $p$
    CREATE POLICY "stock_movements_insert" ON public.stock_movements
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- Tell PostgREST to reload
NOTIFY pgrst, 'reload schema';
