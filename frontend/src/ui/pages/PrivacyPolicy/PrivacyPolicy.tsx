import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import styles from './PrivacyPolicy.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className={styles['privacy-page']} role="main">
      <div className={styles['privacy-page__container']}>
        <header className={styles['privacy-page__brand']}>
          <img
            src={platinumLogo}
            alt="Platinum Center Logo"
            className={styles['privacy-page__logo-image']}
          />
          <h1 className={styles['privacy-page__logo']}>PLATINUM CENTER</h1>
          <p className={styles['privacy-page__subtitle']}>Política de Privacidad</p>
        </header>

        <div className={styles['privacy-page__divider']} />

        <div className={styles['privacy-page__content']}>
          <section className={styles['privacy-page__section']}>
            <h2 className={styles['privacy-page__section-title']}>1. Datos que Recopilamos</h2>
            <p className={styles['privacy-page__section-text']}>
              En Platinum Center recopilamos información directamente relacionada con la prestación de nuestros servicios de fitness
              y la administración de membresías. Los datos personales que podemos recolectar incluyen:
            </p>
            <ul className={styles['privacy-page__section-list']}>
              <li className={styles['privacy-page__section-list-item']}>
                <strong>Datos de Perfil:</strong> Nombre completo, dirección de correo electrónico, número de teléfono y URL de avatar (si inicia sesión con Google).
              </li>
              <li className={styles['privacy-page__section-list-item']}>
                <strong>Datos de Acceso Físico:</strong> Registros automáticos de ingreso (fecha, hora y estado de acceso concedido/denegado) asociados a su tarjeta física (chip RFID) en los torniquetes.
              </li>
              <li className={styles['privacy-page__section-list-item']}>
                <strong>Información Transaccional:</strong> Datos referentes al plan contratado, historial de pagos, montos y estados de facturación (no guardamos información confidencial de sus tarjetas de crédito o débito, las cuales son procesadas de forma segura por nuestro aliado Bold).
              </li>
            </ul>
          </section>

          <section className={styles['privacy-page__section']}>
            <h2 className={styles['privacy-page__section-title']}>2. Cómo Usamos sus Datos</h2>
            <p className={styles['privacy-page__section-text']}>
              La información recopilada se utiliza exclusivamente para los siguientes propósitos operativos y de seguridad:
            </p>
            <ul className={styles['privacy-page__section-list']}>
              <li className={styles['privacy-page__section-list-item']}>
                Permitir y auditar el acceso físico seguro a las instalaciones del gimnasio mediante el torniquete electrónico.
              </li>
              <li className={styles['privacy-page__section-list-item']}>
                Administrar su cuenta de usuario, renovar planes de entrenamiento y procesar pagos en línea o presenciales.
              </li>
              <li className={styles['privacy-page__section-list-item']}>
                Enviar correos electrónicos de confirmación transaccional, recordatorios de vencimiento de su membresía y alertas de seguridad importantes.
              </li>
              <li className={styles['privacy-page__section-list-item']}>
                Atender y gestionar las sugerencias, preguntas o reclamaciones que usted registre en el portal de miembro.
              </li>
            </ul>
          </section>

          <section className={styles['privacy-page__section']}>
            <h2 className={styles['privacy-page__section-title']}>3. Seguridad de la Información</h2>
            <p className={styles['privacy-page__section-text']}>
              Implementamos rigurosas medidas de seguridad técnicas y administrativas para proteger sus datos personales contra el acceso no autorizado,
              la alteración, revelación o destrucción no permitida. Su información se almacena en bases de datos cifradas gestionadas por Supabase y
              el acceso está limitado estrictamente al personal del gimnasio debidamente autorizado (recepcionistas y administradores) bajo políticas
              estrictas de confidencialidad.
            </p>
          </section>

          <section className={styles['privacy-page__section']}>
            <h2 className={styles['privacy-page__section-title']}>4. Contacto y Derechos ARCO</h2>
            <p className={styles['privacy-page__section-text']}>
              Usted tiene el derecho legal de Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Si desea ejercer
              cualquiera de estos derechos o si tiene dudas relacionadas con esta Política de Privacidad, puede contactar al oficial de datos
              personales de Platinum Center a través del correo electrónico:
              <strong> gym.platinum.center@gmail.com</strong> o dirigirse directamente a la recepción física del Gimnasio.
            </p>
          </section>
        </div>

        <div className={styles['privacy-page__divider']} />

        <footer className={styles['privacy-page__footer']}>
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/login')}
            className={styles['privacy-page__back-button']}
          >
            Volver al Login
          </Button>
        </footer>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
