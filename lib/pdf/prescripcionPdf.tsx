import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

// Meme pattern que lib/pdf/ingresosPdf.tsx (couleurs, polices) -- fichier separe, pas de refactor
// commun pour l'instant (cf. prompt prescripciones). Le branding "Núcleo" a ete retire de l'en-tete
// (cf. prompt prescripcion-plantillas-branding) -- seule la palette de couleurs est reutilisee,
// jamais le nom.
//
// Decision produit de Martin : feuille de prescription simple, imprimable, signee/tamponnee a la
// main par le praticien -- AUCUNE valeur de signature numerique. Le disclaimer en pied de page et
// l'espace de signature manuscrite ne sont jamais negociables, sur AUCUN des 3 modeles : sans eux,
// le document pourrait etre pris pour une ordonnance electronique officielle conforme a la
// Directive 323-MINSA/DIGEMID-2022, ce qu'il n'est pas. Le texte ci-dessous est une proposition --
// Martin doit le valider/l'ajuster avant mise en prod, mais le principe (disclaimer + espace de
// signature) reste obligatoire.
//
// Disclaimer et ligne de signature toujours en espagnol, quelle que soit la langue de
// l'organisation : ils citent nommement une directive peruvienne (DIGEMID/MINSA), traduire ce
// texte sans validation explicite de Martin serait plus risque que le garder tel qu'ecrit.
const DISCLAIMER =
  'Documento generado a solicitud del profesional de salud. No constituye receta electrónica oficial conforme a la Directiva 323-MINSA/DIGEMID-2022. Válido únicamente con la firma y sello manuscritos del profesional tratante.'
const FIRMA_LABEL = 'Firma y sello del profesional'

export interface PrescripcionMedicamento {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
  instrucciones: string
}

export type PlantillaPrescripcion = 'clasico' | 'minimalista' | 'moderno'

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
    instagram: 'Instagram',
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
    instagram: 'Instagram',
  },
}

// Palette commune aux 3 modeles -- seule la disposition change entre eux, jamais ces couleurs
// (cf. prompt prescripcion-plantillas-branding).
const COLORS = {
  dark: '#0A1422',
  violet: '#6926D2',
  accent: '#A472F0',
  cream: '#F5F0E8',
}

type RenderParams = {
  locale: 'es' | 'pt'
  clinicName: string
  praticienNombre: string
  numeroColegiatura: string | null
  especialidad: string | null
  instagram: string | null
  clinicAdresse: string | null
  patientNombre: string
  fecha: string
  medicamentos: PrescripcionMedicamento[]
  notasAdicionales: string | null
}

// --- Modele "clasico" : mise en page d'origine (bandeau sombre en en-tete, encadres violets pour
// patient/date), moins le branding "Núcleo" retire du titre.
const clasicoStyles = StyleSheet.create({
  page: { paddingBottom: 90, fontSize: 10, color: '#1a1a1a', fontFamily: 'Helvetica' },
  header: { backgroundColor: COLORS.dark, paddingHorizontal: 32, paddingVertical: 20, marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 700, color: '#ffffff' },
  clinicName: { marginTop: 6, fontSize: 12, color: '#ffffff' },
  subInfo: { marginTop: 2, fontSize: 9, color: '#cccccc' },
  body: { paddingHorizontal: 32 },
  patientBox: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: COLORS.violet, borderRadius: 6, padding: 10 },
  summaryLabel: { fontSize: 8, color: '#666666', textTransform: 'uppercase' },
  summaryValue: { marginTop: 4, fontSize: 12, fontWeight: 700, color: COLORS.violet },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, marginBottom: 20 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: COLORS.cream, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  th: { padding: 6, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#666666' },
  td: { padding: 6, fontSize: 9 },
  colNombre: { width: '24%' },
  colDosis: { width: '16%' },
  colFrecuencia: { width: '20%' },
  colDuracion: { width: '16%' },
  colInstrucciones: { width: '24%' },
  notasBox: { marginBottom: 20 },
  notasLabel: { fontSize: 8, color: '#666666', textTransform: 'uppercase', marginBottom: 4 },
  notasText: { fontSize: 10, lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32 },
  firmaLine: { marginTop: 28, borderTopWidth: 1, borderTopColor: '#999999', width: 220, paddingTop: 4 },
  firmaLabel: { fontSize: 8, color: '#666666' },
  disclaimer: { marginTop: 10, fontSize: 7, color: '#999999', lineHeight: 1.3 },
  instagramLine: { marginTop: 3, fontSize: 8, color: '#666666' },
})

interface TableStyles {
  table: Style
  tableHeaderRow: Style
  tableRow: Style
  th: Style
  td: Style
  colNombre: Style
  colDosis: Style
  colFrecuencia: Style
  colDuracion: Style
  colInstrucciones: Style
}

function MedicamentosTable({
  styles,
  l,
  medicamentos,
}: {
  styles: TableStyles
  l: Record<string, string>
  medicamentos: PrescripcionMedicamento[]
}) {
  return (
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
  )
}

function renderClasico(p: RenderParams) {
  const l = LABELS[p.locale]
  const s = clasicoStyles
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{l.title}</Text>
          <Text style={s.clinicName}>{p.clinicName}</Text>
          <Text style={s.subInfo}>{p.praticienNombre}</Text>
          {p.especialidad && <Text style={s.subInfo}>{p.especialidad}</Text>}
          {p.numeroColegiatura && (
            <Text style={s.subInfo}>
              {l.colegiatura}: {p.numeroColegiatura}
            </Text>
          )}
          {p.clinicAdresse && <Text style={s.subInfo}>{p.clinicAdresse}</Text>}
        </View>

        <View style={s.body}>
          <View style={s.patientBox}>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>{l.paciente}</Text>
              <Text style={s.summaryValue}>{p.patientNombre}</Text>
            </View>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>{l.fecha}</Text>
              <Text style={s.summaryValue}>{p.fecha}</Text>
            </View>
          </View>

          <MedicamentosTable styles={s} l={l} medicamentos={p.medicamentos} />

          {p.notasAdicionales && (
            <View style={s.notasBox}>
              <Text style={s.notasLabel}>{l.notasAdicionales}</Text>
              <Text style={s.notasText}>{p.notasAdicionales}</Text>
            </View>
          )}
        </View>

        <View style={s.footer}>
          <View style={s.firmaLine}>
            <Text style={s.firmaLabel}>{FIRMA_LABEL}</Text>
          </View>
          {p.instagram && (
            <Text style={s.instagramLine}>
              {l.instagram}: {p.instagram}
            </Text>
          )}
          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
        </View>
      </Page>
    </Document>
  )
}

// --- Modele "minimalista" : pas de bandeau de couleur plein, fond blanc, un simple filet superieur
// fin en violet -- titre et infos praticien en texte noir/gris sobre.
const minimalistaStyles = StyleSheet.create({
  page: { paddingBottom: 90, paddingTop: 0, fontSize: 10, color: '#1a1a1a', fontFamily: 'Helvetica', borderTopWidth: 3, borderTopColor: COLORS.violet },
  header: { paddingHorizontal: 32, paddingVertical: 24, marginBottom: 12 },
  title: { fontSize: 11, fontWeight: 700, color: COLORS.violet, textTransform: 'uppercase', letterSpacing: 1 },
  clinicName: { marginTop: 8, fontSize: 13, fontWeight: 700, color: '#1a1a1a' },
  subInfo: { marginTop: 2, fontSize: 9, color: '#666666' },
  body: { paddingHorizontal: 32 },
  patientBox: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 10 },
  summaryLabel: { fontSize: 8, color: '#999999', textTransform: 'uppercase' },
  summaryValue: { marginTop: 4, fontSize: 12, fontWeight: 700, color: '#1a1a1a' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, marginBottom: 20 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  th: { padding: 6, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#999999' },
  td: { padding: 6, fontSize: 9 },
  colNombre: { width: '24%' },
  colDosis: { width: '16%' },
  colFrecuencia: { width: '20%' },
  colDuracion: { width: '16%' },
  colInstrucciones: { width: '24%' },
  notasBox: { marginBottom: 20 },
  notasLabel: { fontSize: 8, color: '#999999', textTransform: 'uppercase', marginBottom: 4 },
  notasText: { fontSize: 10, lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32 },
  firmaLine: { marginTop: 28, borderTopWidth: 1, borderTopColor: '#cccccc', width: 220, paddingTop: 4 },
  firmaLabel: { fontSize: 8, color: '#666666' },
  disclaimer: { marginTop: 10, fontSize: 7, color: '#999999', lineHeight: 1.3 },
  instagramLine: { marginTop: 3, fontSize: 8, color: '#666666' },
})

function renderMinimalista(p: RenderParams) {
  const l = LABELS[p.locale]
  const s = minimalistaStyles
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{l.title}</Text>
          <Text style={s.clinicName}>{p.clinicName}</Text>
          <Text style={s.subInfo}>{p.praticienNombre}</Text>
          {p.especialidad && <Text style={s.subInfo}>{p.especialidad}</Text>}
          {p.numeroColegiatura && (
            <Text style={s.subInfo}>
              {l.colegiatura}: {p.numeroColegiatura}
            </Text>
          )}
          {p.clinicAdresse && <Text style={s.subInfo}>{p.clinicAdresse}</Text>}
        </View>

        <View style={s.body}>
          <View style={s.patientBox}>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>{l.paciente}</Text>
              <Text style={s.summaryValue}>{p.patientNombre}</Text>
            </View>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>{l.fecha}</Text>
              <Text style={s.summaryValue}>{p.fecha}</Text>
            </View>
          </View>

          <MedicamentosTable styles={s} l={l} medicamentos={p.medicamentos} />

          {p.notasAdicionales && (
            <View style={s.notasBox}>
              <Text style={s.notasLabel}>{l.notasAdicionales}</Text>
              <Text style={s.notasText}>{p.notasAdicionales}</Text>
            </View>
          )}
        </View>

        <View style={s.footer}>
          <View style={s.firmaLine}>
            <Text style={s.firmaLabel}>{FIRMA_LABEL}</Text>
          </View>
          {p.instagram && (
            <Text style={s.instagramLine}>
              {l.instagram}: {p.instagram}
            </Text>
          )}
          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
        </View>
      </Page>
    </Document>
  )
}

// --- Modele "moderno" : bande laterale verticale pleine couleur a gauche (nom du cabinet/
// praticien/specialite/colegiatura empiles en blanc), contenu principal a droite.
const SIDEBAR_WIDTH = 85

const modernoStyles = StyleSheet.create({
  page: { paddingBottom: 90, fontSize: 10, color: '#1a1a1a', fontFamily: 'Helvetica' },
  sidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: SIDEBAR_WIDTH, backgroundColor: COLORS.violet, padding: 16 },
  sidebarTitle: { fontSize: 10, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', marginBottom: 14 },
  sidebarClinic: { fontSize: 11, fontWeight: 700, color: '#ffffff', marginBottom: 8 },
  sidebarInfo: { fontSize: 8, color: COLORS.cream, marginBottom: 6, lineHeight: 1.3 },
  body: { paddingLeft: SIDEBAR_WIDTH + 24, paddingRight: 32, paddingTop: 32 },
  patientBox: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 6, padding: 10 },
  summaryLabel: { fontSize: 8, color: '#666666', textTransform: 'uppercase' },
  summaryValue: { marginTop: 4, fontSize: 12, fontWeight: 700, color: COLORS.violet },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, marginBottom: 20 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: COLORS.cream, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  th: { padding: 6, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#666666' },
  td: { padding: 6, fontSize: 9 },
  colNombre: { width: '24%' },
  colDosis: { width: '16%' },
  colFrecuencia: { width: '20%' },
  colDuracion: { width: '16%' },
  colInstrucciones: { width: '24%' },
  notasBox: { marginBottom: 20 },
  notasLabel: { fontSize: 8, color: '#666666', textTransform: 'uppercase', marginBottom: 4 },
  notasText: { fontSize: 10, lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 24, left: SIDEBAR_WIDTH + 24, right: 32 },
  firmaLine: { marginTop: 28, borderTopWidth: 1, borderTopColor: '#999999', width: 220, paddingTop: 4 },
  firmaLabel: { fontSize: 8, color: '#666666' },
  disclaimer: { marginTop: 10, fontSize: 7, color: '#999999', lineHeight: 1.3 },
  instagramLine: { marginTop: 3, fontSize: 8, color: '#666666' },
})

function renderModerno(p: RenderParams) {
  const l = LABELS[p.locale]
  const s = modernoStyles
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.sidebar}>
          <Text style={s.sidebarTitle}>{l.title}</Text>
          <Text style={s.sidebarClinic}>{p.clinicName}</Text>
          <Text style={s.sidebarInfo}>{p.praticienNombre}</Text>
          {p.especialidad && <Text style={s.sidebarInfo}>{p.especialidad}</Text>}
          {p.numeroColegiatura && (
            <Text style={s.sidebarInfo}>
              {l.colegiatura}: {p.numeroColegiatura}
            </Text>
          )}
          {p.clinicAdresse && <Text style={s.sidebarInfo}>{p.clinicAdresse}</Text>}
        </View>

        <View style={s.body}>
          <View style={s.patientBox}>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>{l.paciente}</Text>
              <Text style={s.summaryValue}>{p.patientNombre}</Text>
            </View>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>{l.fecha}</Text>
              <Text style={s.summaryValue}>{p.fecha}</Text>
            </View>
          </View>

          <MedicamentosTable styles={s} l={l} medicamentos={p.medicamentos} />

          {p.notasAdicionales && (
            <View style={s.notasBox}>
              <Text style={s.notasLabel}>{l.notasAdicionales}</Text>
              <Text style={s.notasText}>{p.notasAdicionales}</Text>
            </View>
          )}
        </View>

        <View style={s.footer}>
          <View style={s.firmaLine}>
            <Text style={s.firmaLabel}>{FIRMA_LABEL}</Text>
          </View>
          {p.instagram && (
            <Text style={s.instagramLine}>
              {l.instagram}: {p.instagram}
            </Text>
          )}
          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderPrescripcionPdf(params: {
  locale: 'es' | 'pt'
  clinicName: string
  praticienNombre: string
  numeroColegiatura: string | null
  especialidad: string | null
  instagram: string | null
  clinicAdresse: string | null
  patientNombre: string
  fecha: string
  medicamentos: PrescripcionMedicamento[]
  notasAdicionales: string | null
  plantilla: PlantillaPrescripcion
}): Promise<Buffer> {
  const { plantilla, ...rest } = params
  const doc = plantilla === 'minimalista' ? renderMinimalista(rest) : plantilla === 'moderno' ? renderModerno(rest) : renderClasico(rest)
  return renderToBuffer(doc)
}
