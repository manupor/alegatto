import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
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
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">Privacidad</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: 1 de marzo de 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Responsable del tratamiento</h2>
            <p>
              Alegatto (en adelante "la Empresa", "nosotros" o "nos") es el responsable del tratamiento de sus datos
              personales. Operamos conforme a la <strong>Ley de Protección de la Persona frente al Tratamiento de sus
              Datos Personales (Ley N.° 8968)</strong> de Costa Rica y sus reglamentos.
            </p>
            <p className="mt-2">
              Contacto del responsable: <a href="mailto:privacidad@alegatto.com" className="text-blue-600 underline">privacidad@alegatto.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Datos que recopilamos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Datos de cuenta:</strong> nombre, apellidos, correo electrónico, foto de perfil (cuando se autentica con Google).</li>
              <li><strong>Datos profesionales:</strong> nombre del despacho, número de colegiado, cargo dentro de la organización.</li>
              <li><strong>Datos de uso:</strong> expedientes, recursos de apelación generados, documentos creados, fechas de vencimiento registradas.</li>
              <li><strong>Datos de pago:</strong> plan contratado e historial de facturación. Los datos de tarjeta son procesados directamente por Tilopay (PCI-DSS) y nunca se almacenan en nuestros servidores.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, páginas visitadas y registros de acceso para seguridad y diagnóstico.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidad del tratamiento</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Prestar el servicio de asistencia legal con inteligencia artificial.</li>
              <li>Autenticar su identidad y mantener la seguridad de su cuenta.</li>
              <li>Procesar pagos y gestionar su suscripción.</li>
              <li>Enviar notificaciones sobre vencimientos, actualizaciones del servicio y alertas legales.</li>
              <li>Mejorar los modelos de IA y la calidad del servicio con datos anonimizados.</li>
              <li>Cumplir con obligaciones legales y requerimientos de autoridades competentes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Base legal del tratamiento</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Ejecución del contrato:</strong> el tratamiento es necesario para prestar el servicio contratado.</li>
              <li><strong>Consentimiento:</strong> para comunicaciones de marketing opcionales y para el uso de datos con fines de mejora del servicio.</li>
              <li><strong>Interés legítimo:</strong> seguridad, prevención del fraude y diagnóstico técnico.</li>
              <li><strong>Obligación legal:</strong> conservación de registros contables y cumplimiento tributario.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Compartición de datos con terceros</h2>
            <p>No vendemos sus datos personales. Los compartimos únicamente con:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>OpenAI:</strong> para el procesamiento de consultas de IA (texto enviado al chat o al generador de recursos). OpenAI no entrena sus modelos con los datos enviados a través de la API.</li>
              <li><strong>Tilopay:</strong> procesador de pagos certificado PCI-DSS.</li>
              <li><strong>Google:</strong> autenticación OAuth y, si lo autoriza, sincronización de Google Calendar.</li>
              <li><strong>Resend:</strong> envío de correos transaccionales.</li>
              <li><strong>Neon / PostgreSQL:</strong> almacenamiento seguro de datos en la nube.</li>
            </ul>
            <p className="mt-2">Todos los terceros están sujetos a acuerdos de protección de datos conforme a la Ley 8968.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Confidencialidad legal</h2>
            <p>
              Entendemos que los datos ingresados en Alegatto pueden estar cubiertos por el secreto profesional del abogado.
              Nuestro personal no accede al contenido de sus expedientes salvo cuando usted lo solicita explícitamente para
              soporte técnico. Todo acceso queda registrado en bitácora de auditoría.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Plazo de conservación</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Datos de cuenta y expedientes: mientras la cuenta esté activa y hasta 5 años después de la cancelación para efectos de litigios o requerimientos legales.</li>
              <li>Registros de pago: 5 años conforme a la legislación tributaria costarricense.</li>
              <li>Registros técnicos (logs): 90 días.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Sus derechos (Ley 8968)</h2>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Acceso:</strong> conocer qué datos tenemos sobre usted.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando no sean necesarios para la finalidad original.</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento para fines de marketing o mejora de servicio.</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado y legible por máquina.</li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, escriba a <a href="mailto:privacidad@alegatto.com" className="text-blue-600 underline">privacidad@alegatto.com</a> desde
              el correo asociado a su cuenta. Respondemos en un plazo máximo de 10 días hábiles.
            </p>
            <p className="mt-2">
              También puede presentar una reclamación ante la <strong>Agencia de Protección de Datos de los Habitantes (PRODHAB)</strong> de Costa Rica.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas apropiadas: cifrado TLS en tránsito, cifrado en reposo,
              control de acceso por roles, autenticación multifactor para administradores y auditorías periódicas de
              seguridad. Ante una brecha de seguridad que afecte sus datos, le notificaremos en un plazo máximo de 72 horas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Cookies</h2>
            <p>
              Usamos únicamente cookies de sesión estrictamente necesarias para mantener su autenticación.
              No utilizamos cookies de rastreo ni publicidad de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Cambios a esta política</h2>
            <p>
              Notificaremos cualquier cambio material por correo electrónico con al menos 15 días de anticipación.
              El uso continuado del servicio después de esa fecha constituye aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contacto</h2>
            <p>
              <strong>Alegatto</strong><br />
              San José, Costa Rica<br />
              <a href="mailto:privacidad@alegatto.com" className="text-blue-600 underline">privacidad@alegatto.com</a><br />
              <a href="https://alegatto.com" className="text-blue-600 underline">https://alegatto.com</a>
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 flex gap-6 text-sm text-gray-500">
          <Link href="/terms"><a className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Términos de Servicio</a></Link>
          <Link href="/"><a className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Inicio</a></Link>
        </div>
      </div>
    </div>
  );
}
