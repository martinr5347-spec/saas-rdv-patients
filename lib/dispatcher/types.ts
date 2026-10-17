export interface NotificationJob {
  appointmentId: string
  organizationId: string
  type: 'confirmation' | 'aviso' | 'pago' | 'pago_praticien' | 'anulacion' | 'recordatorio' | 'reprogramacion' | 'cambio_praticien'
  // Utilise uniquement par 'cambio_praticien' -- distingue l'alerte annulation de l'alerte reprogrammation.
  cancelado?: boolean
}
