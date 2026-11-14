import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
    outputFileTracingIncludes: {
      // renderPrescripcionPdf (pdfkit) a migre du POST de prescripciones/route.ts vers cette route
      // "generar" (brouillon editable avant generation, cf. prompt prescripciones-borrador) --
      // la cle doit suivre, sinon le crash pdfkit/standard-fonts corrige precedemment reviendrait
      // en production pour cette route.
      '/api/patients/[id]/prescripciones/[prescripcionId]/generar': ['./node_modules/pdfkit/js/standard-fonts/**'],
      '/api/ingresos/export-pdf': ['./node_modules/pdfkit/js/standard-fonts/**'],
    },
  },
};

export default withNextIntl(nextConfig);
