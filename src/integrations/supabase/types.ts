export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      b2b_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          inviting_team_id: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          inviting_team_id: string
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          inviting_team_id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_invitations_inviting_team_id_fkey"
            columns: ["inviting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_sessions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          last_access_at: string | null
          revoked_at: string | null
          team_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          team_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          client_id: string | null
          created_at: string
          date: string
          discount_amount: number
          discount_type: string
          id: string
          margin_amount: number
          margin_cost_equipment_depreciation: number
          margin_cost_labor: number
          margin_cost_logistics: number
          margin_rate: number
          margin_snapshot: Json | null
          margin_total_cost: number
          mission_id: string | null
          notes: string | null
          number: string
          public_token: string | null
          signature_data: string | null
          signed_at: string | null
          status: string
          team_id: string | null
          total_ht: number
          total_ttc: number
          tva_rate: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          margin_amount?: number
          margin_cost_equipment_depreciation?: number
          margin_cost_labor?: number
          margin_cost_logistics?: number
          margin_rate?: number
          margin_snapshot?: Json | null
          margin_total_cost?: number
          mission_id?: string | null
          notes?: string | null
          number: string
          public_token?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          team_id?: string | null
          total_ht?: number
          total_ttc?: number
          tva_rate?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          margin_amount?: number
          margin_cost_equipment_depreciation?: number
          margin_cost_labor?: number
          margin_cost_logistics?: number
          margin_rate?: number
          margin_snapshot?: Json | null
          margin_total_cost?: number
          mission_id?: string | null
          notes?: string | null
          number?: string
          public_token?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string
          team_id?: string | null
          total_ht?: number
          total_ttc?: number
          tva_rate?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_attachments: {
        Row: {
          created_at: string
          devis_id: string
          file_name: string
          file_url: string
          file_type: string | null
          id: string
          size: number | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          devis_id: string
          file_name: string
          file_url: string
          file_type?: string | null
          id?: string
          size?: number | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          devis_id?: string
          file_name?: string
          file_url?: string
          file_type?: string | null
          id?: string
          size?: number | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_attachments_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_attachments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_items: {
        Row: {
          created_at: string
          description: string
          devis_id: string
          discount_amount: number
          discount_type: string
          id: string
          quantity: number
          sort_order: number
          unit_price: number
          provider_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          devis_id: string
          discount_amount?: number
          discount_type?: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
          provider_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          devis_id?: string
          discount_amount?: number
          discount_type?: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_items_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      facture_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          discount_type: string
          facture_id: string
          id: string
          quantity: number
          sort_order: number
          unit_price: number
          provider_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          discount_type?: string
          facture_id: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
          provider_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          discount_type?: string
          facture_id?: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facture_items_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client_id: string | null
          created_at: string
          date: string
          devis_id: string | null
          discount_amount: number
          discount_type: string
          due_date: string | null
          id: string
          margin_real_amount: number | null
          margin_snapshot: Json | null
          mission_id: string | null
          notes: string | null
          number: string
          status: string
          team_id: string | null
          total_ht: number
          total_ttc: number
          tva_rate: number
          updated_at: string
          user_id: string
          type: string
          parent_facture_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date?: string
          devis_id?: string | null
          discount_amount?: number
          discount_type?: string
          due_date?: string | null
          id?: string
          margin_real_amount?: number | null
          margin_snapshot?: Json | null
          mission_id?: string | null
          notes?: string | null
          number: string
          status?: string
          team_id?: string | null
          total_ht?: number
          total_ttc?: number
          tva_rate?: number
          updated_at?: string
          user_id: string
          type?: string
          parent_facture_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          devis_id?: string | null
          discount_amount?: number
          discount_type?: string
          due_date?: string | null
          id?: string
          margin_real_amount?: number | null
          margin_snapshot?: Json | null
          mission_id?: string | null
          notes?: string | null
          number?: string
          status?: string
          team_id?: string | null
          total_ht?: number
          total_ttc?: number
          tva_rate?: number
          updated_at?: string
          user_id?: string
          type?: string
          parent_facture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_item_templates: {
        Row: {
          created_at: string
          default_price: number
          description: string | null
          id: string
          name: string
          team_id: string | null
          type: Database["public"]["Enums"]["template_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_item_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      materiel: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_b2b_shared: boolean | null
          is_subrented: boolean | null
          location: string | null
          name: string
          notes: string | null
          purchase_price: number | null
          quantity: number
          rental_price: number | null
          serial_number: string | null
          status: string
          storage_location_id: string | null
          subrent_cost: number | null
          supplier_id: string | null
          team_id: string | null
          tracking_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_b2b_shared?: boolean | null
          is_subrented?: boolean | null
          location?: string | null
          name: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rental_price?: number | null
          serial_number?: string | null
          status?: string
          storage_location_id?: string | null
          subrent_cost?: number | null
          supplier_id?: string | null
          team_id?: string | null
          tracking_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_b2b_shared?: boolean | null
          is_subrented?: boolean | null
          location?: string | null
          name?: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rental_price?: number | null
          serial_number?: string | null
          status?: string
          storage_location_id?: string | null
          subrent_cost?: number | null
          supplier_id?: string | null
          team_id?: string | null
          tracking_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiel_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiel_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiel_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_materiel: {
        Row: {
          created_at: string
          id: string
          materiel_id: string
          mission_id: string
          notes: string | null
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          materiel_id: string
          mission_id: string
          notes?: string | null
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          materiel_id?: string
          mission_id?: string
          notes?: string | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_materiel_materiel_id_fkey"
            columns: ["materiel_id"]
            isOneToOne: false
            referencedRelation: "materiel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_materiel_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          amount: number | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_type: string | null
          id: string
          location: string | null
          notes: string | null
          start_date: string | null
          status: string
          team_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          id: string
          message: string
          metadata: Json
          read_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          team_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          team_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          team_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reminders: {
        Row: {
          channel: string
          created_at: string
          created_by: string
          id: string
          payload: Json
          recipient_email: string | null
          remind_at: string
          status: string
          target_id: string
          target_type: string
          team_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by: string
          id?: string
          payload?: Json
          recipient_email?: string | null
          remind_at: string
          status?: string
          target_id: string
          target_type: string
          team_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string
          id?: string
          payload?: Json
          recipient_email?: string | null
          remind_at?: string
          status?: string
          target_id?: string
          target_type?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reminders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          amount: number
          cash_justification: string | null
          created_at: string
          facture_id: string | null
          id: string
          method: string | null
          notes: string | null
          payment_date: string
          reference: string | null
          team_id: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validated_comment: string | null
          validation_status: string
        }
        Insert: {
          amount: number
          cash_justification?: string | null
          created_at?: string
          facture_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          team_id?: string | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validated_comment?: string | null
          validation_status?: string
        }
        Update: {
          amount?: number
          cash_justification?: string | null
          created_at?: string
          facture_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          team_id?: string | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_comment?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          amount_declared: number | null
          created_at: string
          facture_id: string
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          note: string | null
          payment_date: string | null
          team_id: string
          uploaded_by_client_id: string | null
        }
        Insert: {
          amount_declared?: number | null
          created_at?: string
          facture_id: string
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          note?: string | null
          payment_date?: string | null
          team_id: string
          uploaded_by_client_id?: string | null
        }
        Update: {
          amount_declared?: number | null
          created_at?: string
          facture_id?: string
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          note?: string | null
          payment_date?: string | null
          team_id?: string
          uploaded_by_client_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_uploaded_by_client_id_fkey"
            columns: ["uploaded_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders_log: {
        Row: {
          facture_id: string
          id: string
          recipient_email: string
          reminder_type: string
          sent_at: string | null
          status: string | null
          team_id: string
        }
        Insert: {
          facture_id: string
          id?: string
          recipient_email: string
          reminder_type: string
          sent_at?: string | null
          status?: string | null
          team_id: string
        }
        Update: {
          facture_id?: string
          id?: string
          recipient_email?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_log_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bic: string | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          first_name: string | null
          iban: string | null
          id: string
          last_name: string | null
          phone: string | null
          siret: string | null
          updated_at: string
          user_id: string
          daily_rate: number | null
          hourly_rate: number | null
          is_superadmin: boolean | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bic?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          first_name?: string | null
          iban?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          siret?: string | null
          updated_at?: string
          user_id: string
          daily_rate?: number | null
          hourly_rate?: number | null
          is_superadmin?: boolean | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bic?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          first_name?: string | null
          iban?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          siret?: string | null
          updated_at?: string
          user_id?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          is_superadmin?: boolean | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          materiel_id: string
          movement_date: string
          notes: string | null
          quantity: number
          reason: string | null
          team_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          materiel_id: string
          movement_date?: string
          notes?: string | null
          quantity?: number
          reason?: string | null
          team_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          materiel_id?: string
          movement_date?: string
          notes?: string | null
          quantity?: number
          reason?: string | null
          team_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_materiel_id_fkey"
            columns: ["materiel_id"]
            isOneToOne: false
            referencedRelation: "materiel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subrent_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          materiel_id: string | null
          materiel_name: string
          mission_id: string | null
          notes: string | null
          provider_team_id: string
          quantity: number | null
          requester_team_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          materiel_id?: string | null
          materiel_name: string
          mission_id?: string | null
          notes?: string | null
          provider_team_id: string
          quantity?: number | null
          requester_team_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          materiel_id?: string | null
          materiel_name?: string
          mission_id?: string | null
          notes?: string | null
          provider_team_id?: string
          quantity?: number | null
          requester_team_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subrent_requests_materiel_id_fkey"
            columns: ["materiel_id"]
            isOneToOne: false
            referencedRelation: "materiel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subrent_requests_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subrent_requests_provider_team_id_fkey"
            columns: ["provider_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subrent_requests_requester_team_id_fkey"
            columns: ["requester_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          id: string
          user_id: string | null
          team_id: string
          name: string
          hourly_rate: number | null
          daily_rate: number | null
          specialties: string[] | null
          legal_info: Json | null
          contact_info: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          team_id: string
          name: string
          hourly_rate?: number | null
          daily_rate?: number | null
          specialties?: string[] | null
          legal_info?: Json | null
          contact_info?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          team_id?: string
          name?: string
          hourly_rate?: number | null
          daily_rate?: number | null
          specialties?: string[] | null
          legal_info?: Json | null
          contact_info?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          connected_team_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          connected_team_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          connected_team_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_connected_team_id_fkey"
            columns: ["connected_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          display_first_name: string | null
          display_last_name: string | null
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_first_name?: string | null
          display_last_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_first_name?: string | null
          display_last_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teams: {
        Row: {
          auto_reminder_enabled: boolean | null
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          auto_reminder_enabled?: boolean | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          auto_reminder_enabled?: boolean | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      white_label_settings: {
        Row: {
          company_address: string | null
          company_lat: number | null
          company_lng: number | null
          created_at: string
          id: string
          legal_mentions: string | null
          logo_url: string | null
          price_per_km: number | null
          primary_color: string
          secondary_color: string
          support_email: string | null
          support_phone: string | null
          team_id: string
          updated_at: string
          updated_by: string | null
          is_tva_subject: boolean | null
          tva_rates: Json | null
          cgv_text: string | null
          iban: string | null
          bic: string | null
        }
        Insert: {
          company_address?: string | null
          company_lat?: number | null
          company_lng?: number | null
          created_at?: string
          id?: string
          legal_mentions?: string | null
          logo_url?: string | null
          price_per_km?: number | null
          primary_color?: string
          secondary_color?: string
          support_email?: string | null
          support_phone?: string | null
          team_id: string
          updated_at?: string
          updated_by?: string | null
          is_tva_subject?: boolean | null
          tva_rates?: Json | null
          cgv_text?: string | null
          iban?: string | null
          bic?: string | null
        }
        Update: {
          company_address?: string | null
          company_lat?: number | null
          company_lng?: number | null
          created_at?: string
          id?: string
          legal_mentions?: string | null
          logo_url?: string | null
          price_per_km?: number | null
          primary_color?: string
          secondary_color?: string
          support_email?: string | null
          support_phone?: string | null
          team_id?: string
          updated_at?: string
          updated_by?: string | null
          is_tva_subject?: boolean | null
          tva_rates?: Json | null
          cgv_text?: string | null
          iban?: string | null
          bic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "white_label_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_team_members_with_profiles: {
        Args: { _team_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          daily_rate: number
          hourly_rate: number
        }[]
      }
      get_team_user: { Args: { p_team_id: string }; Returns: string }
      get_user_team_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_team_access: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _team_id: string
          _user_id: string
        }
        Returns: boolean
      }
      validate_cash_payment: {
        Args: { p_comment?: string; p_payment_id: string; p_status: string }
        Returns: {
          amount: number
          cash_justification: string | null
          created_at: string
          facture_id: string | null
          id: string
          method: string | null
          notes: string | null
          payment_date: string
          reference: string | null
          team_id: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validated_comment: string | null
          validation_status: string
        }
        SetofOptions: {
          from: "*"
          to: "paiements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verifier_disponibilite_materiel: {
        Args: {
          p_buffer_hours?: number
          p_end: string
          p_exclude_mission_id?: string
          p_materiel_id: string
          p_missing_return_days?: number
          p_start: string
        }
        Returns: {
          conflits: Json
          quantite_assignee: number
          quantite_bloquee_retours: number
          quantite_disponible: number
          stock_total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "technicien" | "prestataire"
      subscription_plan: "free" | "pro" | "suite"
      template_type: "gestion" | "technique" | "autre"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "manager", "technicien", "prestataire"],
      subscription_plan: ["free", "pro", "suite"],
    },
  },
} as const
