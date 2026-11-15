// Partage entre app/api/patients/[id]/notes/[noteId]/photos/route.ts,
// app/api/public/photo-transfer/[token]/route.ts et PatientDetailView.tsx -- un route.ts Next.js
// ne peut exporter que les noms de handler reconnus (GET/POST/...), d'ou ce petit module separe
// plutot qu'un export supplementaire direct depuis l'une des routes (meme raison que
// lib/patients/prescripcionBody.ts). Evite aussi de dupliquer la validation de fichier entre les
// deux routes d'upload (cf. prompt notas-foto-transfer-qr).
export const MAX_PHOTOS_PER_NOTE = 6
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5 Mo
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
