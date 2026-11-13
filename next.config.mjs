import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
    outputFileTracingIncludes: {
      '/api/patients/[id]/prescripciones': ['./node_modules/pdfkit/js/standard-fonts/**'],
      '/api/ingresos/export-pdf': ['./node_modules/pdfkit/js/standard-fonts/**'],
    },
  },
};

export default withNextIntl(nextConfig);
