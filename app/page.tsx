import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg">Citas SaaS</span>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm text-gray-700 hover:text-blue-600">Iniciar sesión</Link>
            <Link href="/register" className="text-sm rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Registrarse</Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Gestión de citas, acomptos y recordatorios para profesionales médicos y estéticas
        </h1>
        <p className="text-lg text-gray-600">
          Automatice confirmaciones, cobros de acompto por MercadoPago, recordatorios y más — todo en una plataforma multi-cabinete segura.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/register" className="rounded-md bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700">
            Empezar gratis
          </Link>
          <Link href="/login" className="rounded-md border border-gray-300 bg-white px-6 py-3 text-gray-700 font-medium hover:bg-gray-50">
            Iniciar sesión
          </Link>
        </div>
      </main>
    </div>
  )
}
