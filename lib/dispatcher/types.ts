export interface NotificationJob {
  appointmentId: string
  organizationId: string
  type: 'confirmation' | 'aviso' | 'pago' | 'pago_praticien' | 'anulacion' | 'recordatorio'
}
