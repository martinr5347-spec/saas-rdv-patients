import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

// Meme pattern que lib/pdf/ingresosPdf.tsx (couleurs, polices, en-tete "Núcleo · <titre>") --
// fichier separe, pas de refactor commun pour l'instant (cf. prompt prescripciones).
//
// Decision produit de Martin : feuille de prescription simple, imprimable, signee/tamponnee a la
// main par le praticien -- AUCUNE valeur de signature numerique. Le disclaimer en pied de page et
// l'espace de signature manuscrite ne sont jamais negociables : sans eux, le document pourrait etre
// pris pour une ordonnance electronique officielle conforme a la Directive 323-MINSA/DIGEMID-2022,
// ce qu'il n'est pas. Le texte ci-dessous est une proposition -- Martin doit le valider/l'ajuster
// avant mise en prod, mais le principe (disclaimer + espace de signature) reste obligatoire.
//
// Disclaimer et ligne de signature toujours en espagnol, quelle que soit la langue de
// l'organisation : ils citent nommement une directive peruvienne (DIGEMID/MINSA), traduire ce
// texte sans validation explicite de Martin serait plus risque que le garder tel qu'ecrit.
const DISCLAIMER =
  'Documento generado a través de Núcleo a solicitud del profesional de salud. No constituye receta electrónica oficial conforme a la Directiva 323-MINSA/DIGEMID-2022. Válido únicamente con la firma y sello manuscritos del profesional tratante.'
const FIRMA_LABEL = 'Firma y sello del profesional'

export interface PrescripcionMedicamento {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
  instrucciones: string
}

const LABELS: Record<'es' | 'pt', Record<string, string>> = {
  es: {
    title: 'Prescripción',
    colegiatura: 'N.° de colegiatura',
    paciente: 'Paciente',
    fecha: 'Fecha',
    colNombre: 'Nombre',
    colDosis: 'Dosis',
    colFrecuencia: 'Frecuencia',
    colDuracion: 'Duración',
    colInstrucciones: 'Instrucciones',
    notasAdicionales: 'Notas adicionales',
  },
  pt: {
    title: 'Prescrição',
    colegiatura: 'N.° de registro profissional',
    paciente: 'Paciente',
    fecha: 'Data',
    colNombre: 'Nome',
    colDosis: 'Dose',
    colFrecuencia: 'Frequência',
    colDuracion: 'Duração',
    colInstrucciones: 'Instruções',
    notasAdicionales: 'Notas adicionais',
  },
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 90,
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
  subInfo: {
    marginTop: 2,
    fontSize: 9,
    color: '#cccccc',
  },
  body: {
    paddingHorizontal: 32,
  },
  patientBox: {
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
    fontSize: 12,
    fontWeight: 700,
    color: '#6926D2',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 20,
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
  colNombre: { width: '24%' },
  colDosis: { width: '16%' },
  colFrecuencia: { width: '20%' },
  colDuracion: { width: '16%' },
  colInstrucciones: { width: '24%' },
  notasBox: {
    marginBottom: 20,
  },
  notasLabel: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notasText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
  },
  firmaLine: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#999999',
    width: 220,
    paddingTop: 4,
  },
  firmaLabel: {
    fontSize: 8,
    color: '#666666',
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 7,
    color: '#999999',
    lineHeight: 1.3,
  },
})

export async function renderPrescripcionPdf(params: {
  locale: 'es' | 'pt'
  clinicName: string
  praticienNombre: string
  numeroColegiatura: string | null
  clinicAdresse: string | null
  patientNombre: string
  fecha: string
  medicamentos: PrescripcionMedicamento[]
  notasAdicionales: string | null
}): Promise<Buffer> {
  const { locale, clinicName, praticienNombre, numeroColegiatura, clinicAdresse, patientNombre, fecha, medicamentos, notasAdicionales } = params
  const l = LABELS[locale]

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Núcleo<Text style={styles.brandAccent}> · {l.title}</Text>
          </Text>
          <Text style={styles.clinicName}>{clinicName}</Text>
          <Text style={styles.subInfo}>{praticienNombre}</Text>
          {numeroColegiatura && (
            <Text style={styles.subInfo}>
              {l.colegiatura}: {numeroColegiatura}
            </Text>
          )}
          {clinicAdresse && <Text style={styles.subInfo}>{clinicAdresse}</Text>}
        </View>

        <View style={styles.body}>
          <View style={styles.patientBox}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{l.paciente}</Text>
              <Text style={styles.summaryValue}>{patientNombre}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{l.fecha}</Text>
              <Text style={styles.summaryValue}>{fecha}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colNombre]}>{l.colNombre}</Text>
              <Text style={[styles.th, styles.colDosis]}>{l.colDosis}</Text>
              <Text style={[styles.th, styles.colFrecuencia]}>{l.colFrecuencia}</Text>
              <Text style={[styles.th, styles.colDuracion]}>{l.colDuracion}</Text>
              <Text style={[styles.th, styles.colInstrucciones]}>{l.colInstrucciones}</Text>
            </View>
            {medicamentos.map((m, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, styles.colNombre]}>{m.nombre || '-'}</Text>
                <Text style={[styles.td, styles.colDosis]}>{m.dosis || '-'}</Text>
                <Text style={[styles.td, styles.colFrecuencia]}>{m.frecuencia || '-'}</Text>
                <Text style={[styles.td, styles.colDuracion]}>{m.duracion || '-'}</Text>
                <Text style={[styles.td, styles.colInstrucciones]}>{m.instrucciones || '-'}</Text>
              </View>
            ))}
          </View>

          {notasAdicionales && (
            <View style={styles.notasBox}>
              <Text style={styles.notasLabel}>{l.notasAdicionales}</Text>
              <Text style={styles.notasText}>{notasAdicionales}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.firmaLine}>
            <Text style={styles.firmaLabel}>{FIRMA_LABEL}</Text>
          </View>
          <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
        </View>
      </Page>
    </Document>
  )

  return renderToBuffer(doc)
}
