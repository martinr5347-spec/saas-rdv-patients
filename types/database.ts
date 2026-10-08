export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          nom: string
          adresse: string | null
          pays: string
          fuseau: string
          langue: string
          especialidad: 'estetica_dermato' | 'clinica_medica' | null
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          adresse?: string | null
          pays?: string
          fuseau?: string
          langue?: string
          especialidad?: 'estetica_dermato' | 'clinica_medica' | null
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          adresse?: string | null
          pays?: string
          fuseau?: string
          langue?: string
          especialidad?: 'estetica_dermato' | 'clinica_medica' | null
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          organization_id: string | null
          role: 'praticien' | 'staff' | 'admin'
          nom: string | null
          email: string
          idioma: 'es' | 'pt'
          nombre_completo: string | null
          especialidad: string | null
          foto_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          role: 'praticien' | 'staff' | 'admin'
          nom?: string | null
          email: string
          idioma?: 'es' | 'pt'
          nombre_completo?: string | null
          especialidad?: string | null
          foto_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: 'praticien' | 'staff' | 'admin'
          nom?: string | null
          email?: string
          idioma?: 'es' | 'pt'
          nombre_completo?: string | null
          especialidad?: string | null
          foto_url?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'users_id_fkey'; columns: ['id']; isOneToOne: true; referencedRelation: 'users'; referencedColumns: ['id'] },
          { foreignKeyName: 'users_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          stripe_customer_id: string | null
          stripe_sub_id: string | null
          plan: string
          statut: 'pending' | 'trial' | 'active' | 'past_due' | 'canceled'
          periode_debut: string | null
          periode_fin: string | null
          trial_ends_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          plan?: string
          statut?: 'pending' | 'trial' | 'active' | 'past_due' | 'canceled'
          periode_debut?: string | null
          periode_fin?: string | null
          trial_ends_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          plan?: string
          statut?: 'pending' | 'trial' | 'active' | 'past_due' | 'canceled'
          periode_debut?: string | null
          periode_fin?: string | null
          trial_ends_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'subscriptions_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }
        ]
      }
      org_settings: {
        Row: {
          organization_id: string
          delai_paiement_h: number
          delai_aviso_h: number
          delai_rappel_h: number
          monto_acompte: number
          calendly_url: string | null
          unipile_account_id: string | null
          unipile_connected_at: string | null
          mp_access_token: string | null
          mp_notification_url: string | null
          canal_email: boolean
          canal_whatsapp: boolean
          monnaie: string
          costo_total: number | null
          variantes_mensaje: Json
          updated_at: string
        }
        Insert: {
          organization_id: string
          delai_paiement_h?: number
          delai_aviso_h?: number
          delai_rappel_h?: number
          monto_acompte?: number
          calendly_url?: string | null
          unipile_account_id?: string | null
          unipile_connected_at?: string | null
          mp_access_token?: string | null
          mp_notification_url?: string | null
          canal_email?: boolean
          canal_whatsapp?: boolean
          monnaie?: string
          costo_total?: number | null
          variantes_mensaje?: Json
          updated_at?: string
        }
        Update: {
          organization_id?: string
          delai_paiement_h?: number
          delai_aviso_h?: number
          delai_rappel_h?: number
          monto_acompte?: number
          calendly_url?: string | null
          unipile_account_id?: string | null
          unipile_connected_at?: string | null
          mp_access_token?: string | null
          mp_notification_url?: string | null
          canal_email?: boolean
          canal_whatsapp?: boolean
          monnaie?: string
          costo_total?: number | null
          variantes_mensaje?: Json
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'org_settings_organization_id_fkey'; columns: ['organization_id']; isOneToOne: true; referencedRelation: 'organizations'; referencedColumns: ['id'] }
        ]
      }
      patients: {
        Row: {
          id: string
          organization_id: string
          nom: string
          email: string | null
          telefono: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          nom: string
          email?: string | null
          telefono?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          nom?: string
          email?: string | null
          telefono?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'patients_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }
        ]
      }
      appointments: {
        Row: {
          id: string
          organization_id: string
          patient_id: string
          fecha_cita: string
          hora_cita: string
          hora_fin: string | null
          fecha_reserva: string
          notas: string | null
          statut: 'pendiente' | 'confirmado' | 'en_curso' | 'pagado' | 'anulado'
          monto_acompte: number
          fecha_pago: string | null
          link_pago: string | null
          calendly_event_id: string | null
          mp_preference_id: string | null
          mp_external_ref: string | null
          presente: boolean | null
          created_at: string
          patients?: patientsRow | null
          organizations?: (organizationsRow & { org_settings?: org_settingsRow | null }) | null
        }
        Insert: {
          id?: string
          organization_id: string
          patient_id: string
          fecha_cita: string
          hora_cita: string
          hora_fin?: string | null
          fecha_reserva?: string
          notas?: string | null
          statut?: 'pendiente' | 'confirmado' | 'en_curso' | 'pagado' | 'anulado'
          monto_acompte: number
          fecha_pago?: string | null
          link_pago?: string | null
          calendly_event_id?: string | null
          mp_preference_id?: string | null
          mp_external_ref?: string | null
          presente?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          patient_id?: string
          fecha_cita?: string
          hora_cita?: string
          hora_fin?: string | null
          fecha_reserva?: string
          notas?: string | null
          statut?: 'pendiente' | 'confirmado' | 'en_curso' | 'pagado' | 'anulado'
          monto_acompte?: number
          fecha_pago?: string | null
          link_pago?: string | null
          calendly_event_id?: string | null
          mp_preference_id?: string | null
          mp_external_ref?: string | null
          presente?: boolean | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'appointments_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointments_patient_id_fkey'; columns: ['patient_id']; isOneToOne: false; referencedRelation: 'patients'; referencedColumns: ['id'] }
        ]
      }
      payments: {
        Row: {
          id: string
          appointment_id: string
          montant: number
          moyen: string
          statut: 'pending' | 'approved' | 'rejected'
          provider_ref: string | null
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          montant: number
          moyen?: string
          statut?: 'pending' | 'approved' | 'rejected'
          provider_ref?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          montant?: number
          moyen?: string
          statut?: 'pending' | 'approved' | 'rejected'
          provider_ref?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'payments_appointment_id_fkey'; columns: ['appointment_id']; isOneToOne: false; referencedRelation: 'appointments'; referencedColumns: ['id'] }
        ]
      }
      notifications: {
        Row: {
          id: string
          appointment_id: string
          canal: 'email' | 'whatsapp' | 'sms'
          type: 'confirmation' | 'aviso' | 'pago' | 'pago_praticien' | 'anulacion' | 'recordatorio'
          statut: 'pending' | 'sent' | 'failed'
          error_message: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          canal: 'email' | 'whatsapp' | 'sms'
          type: 'confirmation' | 'aviso' | 'pago' | 'pago_praticien' | 'anulacion' | 'recordatorio'
          statut?: 'pending' | 'sent' | 'failed'
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          canal?: 'email' | 'whatsapp' | 'sms'
          type?: 'confirmation' | 'aviso' | 'pago' | 'pago_praticien' | 'anulacion' | 'recordatorio'
          statut?: 'pending' | 'sent' | 'failed'
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'notifications_appointment_id_fkey'; columns: ['appointment_id']; isOneToOne: false; referencedRelation: 'appointments'; referencedColumns: ['id'] }
        ]
      }
      message_templates: {
        Row: {
          id: string
          organization_id: string | null
          type: string
          canal: 'email' | 'whatsapp'
          langue: string
          sujet: string | null
          corps: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          type: string
          canal: 'email' | 'whatsapp'
          langue?: string
          sujet?: string | null
          corps: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          type?: string
          canal?: 'email' | 'whatsapp'
          langue?: string
          sujet?: string | null
          corps?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'message_templates_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }
        ]
      }
      ingresos_manuales: {
        Row: {
          id: string
          organization_id: string
          fecha: string
          monto: number
          metodo_pago: 'efectivo' | 'transferencia' | 'otro'
          paciente_nombre: string | null
          concepto: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          fecha: string
          monto: number
          metodo_pago: 'efectivo' | 'transferencia' | 'otro'
          paciente_nombre?: string | null
          concepto?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          fecha?: string
          monto?: number
          metodo_pago?: 'efectivo' | 'transferencia' | 'otro'
          paciente_nombre?: string | null
          concepto?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'ingresos_manuales_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] },
          { foreignKeyName: 'ingresos_manuales_created_by_fkey'; columns: ['created_by']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: {}
    Functions: {
      current_org_id: { Args: Record<string, never>; Returns: string | null }
      is_platform_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

type patientsRow = Database['public']['Tables']['patients']['Row']
type organizationsRow = Database['public']['Tables']['organizations']['Row']
type org_settingsRow = Database['public']['Tables']['org_settings']['Row']
