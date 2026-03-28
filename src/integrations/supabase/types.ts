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
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          inviting_team_id: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          inviting_team_id?: string
          status?: string
          token?: string
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
      bank_transactions: {
        Row: {
          amount: number
          bank_name: string | null
          created_at: string
          id: string
          label: string
          reconciled_paiement_id: string | null
          reference: string | null
          status: string
          team_id: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          created_at?: string
          id?: string
          label: string
          reconciled_paiement_id?: string | null
          reference?: string | null
          status?: string
          team_id?: string | null
          transaction_date: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          label?: string
          reconciled_paiement_id?: string | null
          reference?: string | null
          status?: string
          team_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_reconciled_paiement_id_fkey"
            columns: ["reconciled_paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_team_id_fkey"
            columns: ["team_id"]
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
          team_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          team_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          last_access_at?: string | null
          revoked_at?: string | null
          team_id?: string | null
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
          id: string
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
      devis_items: {
        Row: {
          created_at: string
          description: string
          devis_id: string
          id: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          devis_id: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          devis_id?: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
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
      equipment_checkouts: {
        Row: {
          checked_at: string
          checked_by: string | null
          condition: string | null
          created_at: string
          id: string
          materiel_id: string | null
          mission_id: string | null
          notes: string | null
          quantity: number
          team_id: string | null
          type: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          materiel_id?: string | null
          mission_id?: string | null
          notes?: string | null
          quantity?: number
          team_id?: string | null
          type: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          materiel_id?: string | null
          mission_id?: string | null
          notes?: string | null
          quantity?: number
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_checkouts_materiel_id_fkey"
            columns: ["materiel_id"]
            isOneToOne: false
            referencedRelation: "materiel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_checkouts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_checkouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          supplier_id: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          supplier_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          supplier_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      facture_items: {
        Row: {
          created_at: string
          description: string
          facture_id: string
          id: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          facture_id: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          facture_id?: string
          id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
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
          due_date: string | null
          id: string
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
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date?: string
          devis_id?: string | null
          due_date?: string | null
          id?: string
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
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          devis_id?: string | null
          due_date?: string | null
          id?: string
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
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          type?: string
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
      logistics_config: {
        Row: {
          auto_checkout: boolean
          auto_packing_list: boolean
          auto_transport: boolean
          created_at: string
          delivery_hours_before: number
          event_type: string
          id: string
          pickup_hours_after: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          auto_checkout?: boolean
          auto_packing_list?: boolean
          auto_transport?: boolean
          created_at?: string
          delivery_hours_before?: number
          event_type: string
          id?: string
          pickup_hours_after?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_checkout?: boolean
          auto_packing_list?: boolean
          auto_transport?: boolean
          created_at?: string
          delivery_hours_before?: number
          event_type?: string
          id?: string
          pickup_hours_after?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_config_team_id_fkey"
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
          location: string | null
          name: string
          notes: string | null
          purchase_price: number | null
          quantity: number
          rental_price: number | null
          serial_number: string | null
          status: string
          team_id: string | null
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
          location?: string | null
          name: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rental_price?: number | null
          serial_number?: string | null
          status?: string
          team_id?: string | null
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
          location?: string | null
          name?: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          rental_price?: number | null
          serial_number?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          metadata: Json | null
          read_at: string | null
          status: string
          team_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          status?: string
          team_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          status?: string
          team_id?: string | null
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
      paiements: {
        Row: {
          amount: number
          created_at: string
          facture_id: string | null
          id: string
          method: string | null
          notes: string | null
          payment_date: string
          reference: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          facture_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          facture_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          team_id?: string | null
          user_id?: string
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
          created_at: string
          facture_id: string | null
          file_name: string | null
          file_url: string
          id: string
          notes: string | null
          status: string
          team_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          facture_id?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          notes?: string | null
          status?: string
          team_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          facture_id?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          status?: string
          team_id?: string | null
          uploaded_by?: string | null
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
        }
        Relationships: []
      }
      providers: {
        Row: {
          bio: string | null
          contact_info: Json | null
          created_at: string
          daily_rate: number | null
          hourly_rate: number | null
          id: string
          id_document_url: string | null
          insurance_document_url: string | null
          insurance_expiry: string | null
          legal_info: Json | null
          name: string
          notes: string | null
          photo_url: string | null
          rib_document_url: string | null
          specialties: string[] | null
          team_id: string | null
          updated_at: string
          urssaf_document_url: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          contact_info?: Json | null
          created_at?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          id_document_url?: string | null
          insurance_document_url?: string | null
          insurance_expiry?: string | null
          legal_info?: Json | null
          name: string
          notes?: string | null
          photo_url?: string | null
          rib_document_url?: string | null
          specialties?: string[] | null
          team_id?: string | null
          updated_at?: string
          urssaf_document_url?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          contact_info?: Json | null
          created_at?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          id_document_url?: string | null
          insurance_document_url?: string | null
          insurance_expiry?: string | null
          legal_info?: Json | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          rib_document_url?: string | null
          specialties?: string[] | null
          team_id?: string | null
          updated_at?: string
          urssaf_document_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          team_id?: string | null
          updated_at?: string
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
          quantity: number
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
          quantity?: number
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
          quantity?: number
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
      supplier_invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          sort_order: number
          supplier_invoice_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          sort_order?: number
          supplier_invoice_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          sort_order?: number
          supplier_invoice_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_items_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          created_at: string
          date: string
          due_date: string | null
          id: string
          notes: string | null
          number: string
          status: string
          supplier_id: string | null
          team_id: string | null
          total_ht: number
          total_ttc: number
          tva_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number: string
          status?: string
          supplier_id?: string | null
          team_id?: string | null
          total_ht?: number
          total_ttc?: number
          tva_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string
          status?: string
          supplier_id?: string | null
          team_id?: string | null
          total_ht?: number
          total_ttc?: number
          tva_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
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
          team_id: string | null
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
          team_id?: string | null
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
          team_id?: string | null
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
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
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
        ]
      }
      teams: {
        Row: {
          auto_reminder_enabled: boolean | null
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at: string
          workspace_slug: string
        }
        Insert: {
          auto_reminder_enabled?: boolean | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string
          workspace_slug?: string
        }
        Update: {
          auto_reminder_enabled?: boolean | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string
          workspace_slug?: string
        }
        Relationships: []
      }
      transport_plans: {
        Row: {
          address: string | null
          created_at: string
          driver_name: string | null
          id: string
          mission_id: string | null
          notes: string | null
          scheduled_at: string | null
          status: string
          team_id: string | null
          type: string
          updated_at: string
          vehicle: string | null
          vehicle_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          mission_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          team_id?: string | null
          type: string
          updated_at?: string
          vehicle?: string | null
          vehicle_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          mission_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          team_id?: string | null
          type?: string
          updated_at?: string
          vehicle?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_plans_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_plans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_costs: {
        Row: {
          amount: number
          category: string
          cost_date: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          team_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount?: number
          category?: string
          cost_date?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          team_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          category?: string
          cost_date?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          team_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_costs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity: string | null
          created_at: string
          ct_expiry: string | null
          id: string
          insurance_expiry: string | null
          mileage: number | null
          name: string
          notes: string | null
          plate_number: string | null
          status: string
          team_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          capacity?: string | null
          created_at?: string
          ct_expiry?: string | null
          id?: string
          insurance_expiry?: string | null
          mileage?: number | null
          name: string
          notes?: string | null
          plate_number?: string | null
          status?: string
          team_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          capacity?: string | null
          created_at?: string
          ct_expiry?: string | null
          id?: string
          insurance_expiry?: string | null
          mileage?: number | null
          name?: string
          notes?: string | null
          plate_number?: string | null
          status?: string
          team_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
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
        }[]
      }
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
  public: {
    Enums: {
      app_role: ["admin", "manager", "technicien", "prestataire"],
    },
  },
} as const
