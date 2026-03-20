-- Script SQL pour vider les données opérationnelles en toute sécurité
-- Ce script CONSERVE :
-- - La structure de la base de données (tables, vues, triggers)
-- - Les profils utilisateurs et l'authentification (auth.users, public.profiles)
-- - La structure de l'entreprise (teams, team_members, team_invitations)
-- - Les paramètres généraux (white_label_settings)

-- /!\ ATTENTION : Cette action est IRREVERSIBLE. 
-- Toutes vos missions, clients, factures, devis, matériels et alertes seront supprimés.

TRUNCATE TABLE 
  public.client_portal_sessions,
  public.payment_proofs,
  public.notification_events,
  public.notification_reminders,
  public.stock_movements,
  public.mission_materiel,
  public.devis_items,
  public.facture_items,
  public.paiements,
  public.materiel,
  public.missions,
  public.factures,
  public.devis,
  public.clients
CASCADE;
