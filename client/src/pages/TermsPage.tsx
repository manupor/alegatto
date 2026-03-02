import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </a>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">Legal</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">Términos de Servicio</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: 1 de marzo de 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Partes del acuerdo</h2>
            <p>
              Estos Términos de Servicio ("Términos") regulan el acceso y uso de la plataforma Alegatto
              (el "Servicio"), operada por Alegatto S.A. ("la Empresa"), por parte del usuario o la organización
              que se registra ("el Cliente").
            </p>
            <p className="mt-2">
              Al crear una cuenta o utilizar el Servicio, el Cliente acepta estos Términos en su totalidad.
              Si actúa en nombre de una organización, declara tener autoridad para vincularla a estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descripción del servicio</h2>
            <p>
              Alegatto es una plataforma de asistencia legal con inteligencia artificial diseñada para profesionales
              del derecho en Costa Rica. Incluye:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Chat de consulta legal con IA sobre legislación costarricense.</li>
              <li>Análisis de documentos en formato PDF y DOCX.</li>
              <li>Generador de recursos de apelación con IA.</li>
              <li>Editor de documentos legales con historial de versiones y firma electrónica.</li>
              <li>Gestión de expedientes y vencimientos.</li>
              <li>Herramientas de analítica y gestión de equipos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Naturaleza del servicio — No es asesoría legal</h2>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Alegatto es una herramienta de productividad para abogados. No constituye asesoría legal,
              no reemplaza el criterio profesional del abogado y no crea relación cliente-abogado entre
              el usuario y la Empresa.
            </p>
            <p className="mt-2">
              Los textos generados por IA deben ser revisados, validados y firmados por un abogado colegiado
              antes de presentarse ante cualquier autoridad. La Empresa no se responsabiliza por el uso
              de los contenidos generados sin revisión profesional adecuada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cuentas y acceso</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>El Cliente es responsable de mantener la confidencialidad de sus credenciales.</li>
              <li>Debe notificar inmediatamente a <a href="mailto:soporte@alegatto.com" className="text-blue-600 underline">soporte@alegatto.com</a> ante cualquier acceso no autorizado.</li>
              <li>Cada cuenta es personal e intransferible; el acceso multiusuario se gestiona mediante el sistema de equipos de la plataforma.</li>
              <li>El Cliente no puede crear cuentas para terceros sin su consentimiento ni compartir credenciales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Planes y facturación</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>El Servicio está disponible en plan gratuito (con limitaciones) y planes de pago mensuales.</li>
              <li>Los precios están expresados en dólares estadounidenses (USD) e incluyen los impuestos aplicables en Costa Rica.</li>
              <li>La facturación es mensual y se cobra automáticamente en la fecha de renovación.</li>
              <li>El Cliente puede cancelar su suscripción en cualquier momento desde el panel de facturación. La cancelación aplica al final del período facturado vigente; no hay reembolsos prorrateados.</li>
              <li>La Empresa se reserva el derecho de modificar los precios con un aviso previo de 30 días.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Uso aceptable</h2>
            <p>El Cliente se compromete a no:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Usar el Servicio para generar documentos fraudulentos, engañosos o que violen la ley costarricense.</li>
              <li>Intentar acceder a datos de otros clientes o vulnerar la seguridad de la plataforma.</li>
              <li>Realizar ingeniería inversa, descompilar o extraer el código fuente del Servicio.</li>
              <li>Usar scrapers, bots o automatizaciones no autorizadas para extraer datos masivamente.</li>
              <li>Revender o sublicenciar el acceso al Servicio a terceros sin autorización escrita.</li>
            </ul>
            <p className="mt-2">
              El incumplimiento de estas normas puede resultar en la suspensión inmediata de la cuenta sin derecho a reembolso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Propiedad intelectual</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>La plataforma, su código, diseño y bases de datos propias son propiedad exclusiva de la Empresa.</li>
              <li>Los documentos y contenidos generados o subidos por el Cliente son propiedad del Cliente.</li>
              <li>El Cliente otorga a la Empresa una licencia limitada para procesar sus datos con el único fin de prestar el Servicio.</li>
              <li>La Empresa puede usar datos agregados y anonimizados para mejorar el servicio, sin identificar al Cliente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disponibilidad y SLA</h2>
            <p>
              La Empresa procura mantener una disponibilidad del 99% mensual. Sin embargo, no garantiza
              disponibilidad ininterrumpida. Pueden producirse interrupciones por mantenimiento programado
              (notificado con 24 horas de anticipación) o por causas de fuerza mayor.
            </p>
            <p className="mt-2">
              Los planes de pago incluyen soporte por correo electrónico con tiempo de respuesta de 1 día hábil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley costarricense, la responsabilidad total de la Empresa
              por cualquier reclamación derivada del uso del Servicio se limita al importe pagado por el Cliente
              en los últimos 3 meses anteriores al evento que origina la reclamación.
            </p>
            <p className="mt-2">
              La Empresa no es responsable por: (a) pérdida de datos por causas ajenas a su control,
              (b) decisiones tomadas con base en los textos generados por IA sin revisión profesional,
              (c) daños indirectos, lucro cesante o pérdida de oportunidades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Confidencialidad</h2>
            <p>
              Ambas partes se comprometen a mantener en estricta confidencialidad la información de la otra
              que sea designada como confidencial o que por su naturaleza deba considerarse como tal.
              Esta obligación persiste durante 5 años después de la terminación del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Terminación</h2>
            <p>
              Cualquiera de las partes puede terminar la relación contractual en cualquier momento.
              El Cliente puede eliminar su cuenta desde el panel de configuración.
              La Empresa puede suspender o terminar cuentas que violen estos Términos, con notificación previa
              salvo en casos de uso ilegal o riesgo de seguridad.
            </p>
            <p className="mt-2">
              Tras la terminación, el Cliente tiene 30 días para exportar sus datos. Pasado ese plazo,
              los datos serán eliminados conforme a la política de privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República de Costa Rica. Cualquier controversia
              que no pueda resolverse amigablemente se someterá a los Tribunales de Justicia de San José,
              Costa Rica, con renuncia expresa a cualquier otro fuero.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Cambios a los términos</h2>
            <p>
              La Empresa puede modificar estos Términos con un aviso de al menos 15 días por correo electrónico.
              El uso continuado del Servicio después de esa fecha constituye aceptación de los nuevos Términos.
              Si no está de acuerdo, puede cancelar su cuenta antes de que entren en vigor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Contacto</h2>
            <p>
              <strong>Alegatto S.A.</strong><br />
              San José, Costa Rica<br />
              <a href="mailto:soporte@alegatto.com" className="text-blue-600 underline">soporte@alegatto.com</a><br />
              <a href="https://alegatto.com" className="text-blue-600 underline">https://alegatto.com</a>
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 flex gap-6 text-sm text-gray-500">
          <Link href="/privacy"><a className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Política de Privacidad</a></Link>
          <Link href="/"><a className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Inicio</a></Link>
        </div>
      </div>
    </div>
  );
}
