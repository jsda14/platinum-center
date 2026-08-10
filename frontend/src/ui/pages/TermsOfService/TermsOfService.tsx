import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import styles from './TermsOfService.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

export function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className={styles['terms-page']} role="main">
      <div className={styles['terms-page__container']}>
        <header className={styles['terms-page__brand']}>
          <img
            src={platinumLogo}
            alt="Platinum Center Logo"
            className={styles['terms-page__logo-image']}
          />
          <h1 className={styles['terms-page__logo']}>PLATINUM CENTER</h1>
          <p className={styles['terms-page__subtitle']}>Términos del Servicio</p>
        </header>

        <div className={styles['terms-page__divider']} />

        <div className={styles['terms-page__content']}>
          <section className={styles['terms-page__section']}>
            <h2 className={styles['terms-page__section-title']}>1. Uso del Servicio</h2>
            <p className={styles['terms-page__section-text']}>
              Al acceder y utilizar las instalaciones, equipamiento y plataformas web de Platinum Center (el "Gimnasio"),
              usted acepta cumplir y estar sujeto a las siguientes reglas y condiciones de uso. Este servicio está
              diseñado para la administración de membresías, reserva de espacios de entrenamiento y registro de accesos
              físicos automatizados.
            </p>
            <p className={styles['terms-page__section-text']}>
              Es de carácter obligatorio el uso correcto del torniquete automático mediante su tarjeta RFID asignada individualmente.
              Cualquier uso indebido del equipamiento del gimnasio, daño intencionado o comportamiento hostil hacia el personal u otros
              miembros resultará en la suspensión inmediata del acceso al sistema y las instalaciones sin derecho a reembolso.
            </p>
          </section>

          <section className={styles['terms-page__section']}>
            <h2 className={styles['terms-page__section-title']}>2. Membresías y Acceso</h2>
            <p className={styles['terms-page__section-text']}>
              Platinum Center ofrece múltiples modalidades de planes adaptadas a sus necesidades de entrenamiento:
            </p>
            <ul className={styles['terms-page__section-list']}>
              <li className={styles['terms-page__section-list-item']}>
                <strong>Plan Diario (1 Día):</strong> Acceso ininterrumpido durante las 24 horas siguientes a la confirmación de la transacción.
              </li>
              <li className={styles['terms-page__section-list-item']}>
                <strong>Plan Mensual / Anual:</strong> Membresía de 30 o 365 días corridos a partir del momento de activación.
              </li>
              <li className={styles['terms-page__section-list-item']}>
                <strong>Plan 15 Días Consumibles:</strong> Paquete de 15 pases de entrada de un solo uso que pueden consumirse libremente
                dentro de un mes calendario (30 días). Los días no consumidos al finalizar el mes no acumulables y expirarán de forma automática.
              </li>
            </ul>
            <p className={styles['terms-page__section-text']}>
              Cada membresía está vinculada directamente a una tarjeta física (chip RFID). La pérdida o daño de la tarjeta RFID física requiere
              la adquisición de un reemplazo y su posterior vinculación por parte del personal de recepción.
            </p>
          </section>

          <section className={styles['terms-page__section']}>
            <h2 className={styles['terms-page__section-title']}>3. Pagos y Reembolsos</h2>
            <p className={styles['terms-page__section-text']}>
              Los pagos de los planes pueden realizarse en línea mediante nuestra pasarela aliada integrada (Bold) con métodos como tarjeta de crédito,
              débito, PSE, Nequi y Daviplata, o de forma presencial (efectivo o transferencia directa) en la recepción.
            </p>
            <p className={styles['terms-page__section-text']}>
              Todas las ventas de membresías son definitivas. Platinum Center no realiza devoluciones de dinero ni reembolsos parciales bajo
              ninguna circunstancia, excepto en casos excepcionales de suspensión médica justificada por un profesional de la salud competente,
              previa evaluación de la administración.
            </p>
          </section>

          <section className={styles['terms-page__section']}>
            <h2 className={styles['terms-page__section-title']}>4. Privacidad y Seguridad</h2>
            <p className={styles['terms-page__section-text']}>
              Nos comprometemos a salvaguardar sus datos de acuerdo con la ley de protección de datos personales. Recopilamos información
              básica de perfil como su nombre, correo electrónico, número de teléfono y registro de accesos físicos con el único propósito
              de gestionar y auditar el ingreso correcto a las instalaciones mediante el torniquete.
            </p>
            <p className={styles['terms-page__section-text']}>
              Para más información sobre el tratamiento de su información, le invitamos a revisar nuestra Política de Privacidad detallada.
            </p>
          </section>
        </div>

        <div className={styles['terms-page__divider']} />

        <footer className={styles['terms-page__footer']}>
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/login')}
            className={styles['terms-page__back-button']}
          >
            Volver al Login
          </Button>
        </footer>
      </div>
    </div>
  );
}

export default TermsOfService;
