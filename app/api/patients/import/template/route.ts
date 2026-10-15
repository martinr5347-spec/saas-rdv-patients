import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const headers = ['Nombre', 'Email', 'Teléfono', 'Fecha de nacimiento (AAAA-MM-DD)']
  const example = ['María García', 'maria@example.com', '+51987654321', '1985-03-20']

  const worksheet = XLSX.utils.aoa_to_sheet([headers, example])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_pacientes_nucleo.xlsx"',
    },
  })
}
