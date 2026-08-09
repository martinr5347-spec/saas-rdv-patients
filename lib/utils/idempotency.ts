import { createServiceRoleClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'

type NotificationType = Database['public']['Tables']['notifications']['Row']['type']

export async function isNotificationSent(
  appointmentId: string,
  canal: 'email' | 'whatsapp' | 'sms',
  type: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('canal', canal)
    .eq('type', type as NotificationType)
    .eq('statut', 'sent')
    .maybeSingle()
  return !!data
}

export async function isAppointmentPaid(appointmentId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('appointments')
    .select('statut')
    .eq('id', appointmentId)
    .eq('statut', 'pagado')
    .maybeSingle()
  return !!data
}
