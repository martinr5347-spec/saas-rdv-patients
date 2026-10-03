import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

const MESSAGES = { es: esMessages, pt: ptMessages }

export interface IngresoPdfRow {
  fecha: string
  paciente: string
  concepto: string
  metodo: 'efectivo' | 'transferencia' | 'otro' | 'mercadopago'
  monto: number
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 32,
    fontSize: 10,
    color: '#1a1a1a',
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#0A1422',
    paddingHorizontal: 32,
    paddingVertical: 20,
    marginBottom: 20,
  },
  brand: {
    fontSize: 16,
    fontWeight: 700,
    color: '#ffffff',
  },
  brandAccent: {
    color: '#A472F0',
  },
  clinicName: {
    marginTop: 6,
    fontSize: 12,
    color: '#ffffff',
  },
  periodo: {
    marginTop: 2,
    fontSize: 9,
    color: '#cccccc',
  },
  body: {
    paddingHorizontal: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#6926D2',
    borderRadius: 6,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 700,
    color: '#6926D2',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F0E8',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  th: {
    padding: 6,
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#666666',
  },
  td: {
    padding: 6,
    fontSize: 9,
  },
  colFecha: { width: '15%' },
  colPaciente: { width: '25%' },
  colConcepto: { width: '25%' },
  colMetodo: { width: '15%' },
  colMonto: { width: '20%', textAlign: 'right' },
  empty: {
    padding: 16,
    textAlign: 'center',
    fontSize: 9,
    color: '#999999',
  },
})

const METODO_LABEL: Record<string, { es: string; pt: string }> = {
  efectivo: { es: 'Efectivo', pt: 'Dinheiro' },
  transferencia: { es: 'Transferencia', pt: 'Transferência' },
  otro: { es: 'Otro', pt: 'Outro' },
  mercadopago: { es: 'MercadoPago', pt: 'MercadoPago' },
}

export async function renderIngresosPdf(params: {
  locale: 'es' | 'pt'
  clinicName: string
  mes: number
  ano: number
  monnaie: string
  totalMonth: number
  totalMp: number
  totalManual: number
  rows: IngresoPdfRow[]
}): Promise<Buffer> {
  const { locale, clinicName, mes, ano, monnaie, totalMonth, totalMp, totalManual, rows } = params
  const t = MESSAGES[locale].dashboard.ingresos
  const monthName = t.months[mes - 1]

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Núcleo<Text style={styles.brandAccent}> · {t.title}</Text>
          </Text>
          <Text style={styles.clinicName}>{clinicName}</Text>
          <Text style={styles.periodo}>{monthName} {ano}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{t.totalMonth}</Text>
              <Text style={styles.summaryValue}>{monnaie} {totalMonth.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{t.totalMp}</Text>
              <Text style={styles.summaryValue}>{monnaie} {totalMp.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{t.totalManual}</Text>
              <Text style={styles.summaryValue}>{monnaie} {totalManual.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colFecha]}>{t.colFecha}</Text>
              <Text style={[styles.th, styles.colPaciente]}>{t.colPaciente}</Text>
              <Text style={[styles.th, styles.colConcepto]}>{t.colConcepto}</Text>
              <Text style={[styles.th, styles.colMetodo]}>{t.colMetodo}</Text>
              <Text style={[styles.th, styles.colMonto]}>{t.colMonto}</Text>
            </View>
            {rows.length === 0 && <Text style={styles.empty}>{t.none}</Text>}
            {rows.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, styles.colFecha]}>{r.fecha}</Text>
                <Text style={[styles.td, styles.colPaciente]}>{r.paciente || '-'}</Text>
                <Text style={[styles.td, styles.colConcepto]}>{r.concepto || '-'}</Text>
                <Text style={[styles.td, styles.colMetodo]}>{METODO_LABEL[r.metodo]?.[locale] ?? r.metodo}</Text>
                <Text style={[styles.td, styles.colMonto]}>{monnaie} {r.monto.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  )

  return renderToBuffer(doc)
}
