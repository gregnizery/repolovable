-- MIGRATION: 20260302150000_realtime_notifications.sql
-- Description: Triggers pour notifications temps réel lors d'événements clés

-- 1. FONCTION DE NOTIFICATION GÉNÉRIQUE
CREATE OR REPLACE FUNCTION public.create_notification_event()
RETURNS TRIGGER AS $$
DECLARE
    v_team_id uuid;
    v_user_id uuid;
    v_title text;
    v_message text;
    v_type text;
BEGIN
    -- Cas 1: Assignation de mission (trigger sur mission_assignments)
    IF (TG_TABLE_NAME = 'mission_assignments') THEN
        v_team_id := NEW.team_id;
        v_user_id := NEW.user_id;
        v_type := 'mission_assigned';
        v_title := 'Nouvelle mission assignée';
        SELECT title INTO v_message FROM public.missions WHERE id = NEW.mission_id;
        v_message := 'Vous avez été assigné à la mission : ' || v_message;
        
    -- Cas 2: Signature de devis (trigger sur devis)
    ELSIF (TG_TABLE_NAME = 'devis' AND NEW.status = 'signé' AND OLD.status != 'signé') THEN
        v_team_id := NEW.team_id;
        -- On notifie l'owner de l'équipe ou le premier admin trouvé
        SELECT user_id INTO v_user_id FROM public.team_members 
        WHERE team_id = NEW.team_id AND role = 'admin' 
        LIMIT 1;
        
        v_type := 'quote_signed';
        v_title := 'Devis signé par le client';
        v_message := 'Le devis ' || NEW.number || ' a été signé.';
    END IF;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.notification_events (
            team_id,
            user_id,
            title,
            message,
            type,
            status,
            channel
        ) VALUES (
            v_team_id,
            v_user_id,
            v_title,
            v_message,
            v_type,
            'pending',
            'app'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGERS
DROP TRIGGER IF EXISTS tr_notify_mission_assignment ON public.mission_assignments;
CREATE TRIGGER tr_notify_mission_assignment
    AFTER INSERT ON public.mission_assignments
    FOR EACH ROW EXECUTE FUNCTION public.create_notification_event();

DROP TRIGGER IF EXISTS tr_notify_quote_signed ON public.devis;
CREATE TRIGGER tr_notify_quote_signed
    AFTER UPDATE ON public.devis
    FOR EACH ROW 
    WHEN (NEW.status = 'signé' AND OLD.status != 'signé')
    EXECUTE FUNCTION public.create_notification_event();
