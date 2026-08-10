import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Button } from 'antd';
import {
  IdcardOutlined,
  SafetyOutlined,
  CreditCardOutlined,
  BellOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { useAppSelector } from '../../../infrastructure/store/store';
import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import styles from './Landing.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

export function Landing() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAppSelector((state) => state.auth);

  // Si el usuario ya está autenticado, lo redirigimos automáticamente a su panel
  if (loading) {
    return <LoadingScreen message="Cargando..." />;
  }

  if (user) {
    if (profile?.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (profile?.role === 'receptionist') return <Navigate to="/reception" replace />;
    return <Navigate to="/portal" replace />;
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.landing}>
      <header className={styles.landing__header} role="banner">
        <div className={styles.landing__brand}>
          <img
            src={platinumLogo}
            alt="Platinum Center Logo"
            className={styles['landing__logo-image']}
          />
          <span className={styles['landing__brand-title']}>Platinum Center</span>
        </div>
        <Button
          type="primary"
          icon={<LoginOutlined />}
          onClick={() => navigate('/login')}
          className={styles.landing__login-btn}
        >
          Iniciar sesión
        </Button>
      </header>

      <main role="main">
        <section className={styles.landing__hero}>
          <h1 className={styles['landing__hero-title']}>Platinum Center</h1>
          <p className={styles['landing__hero-description']}>
            Plataforma de gestión administrativa y control de acceso para Gimnasio Platinum Center
          </p>
          <div className={styles['landing__hero-action']}>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              className={styles['landing__hero-btn']}
            >
              Comenzar ahora
            </Button>
          </div>
        </section>

        <section className={styles.landing__features} aria-labelledby="features-title">
          <h2 id="features-title" className={styles['landing__features-title']}>
            Nuestras Características
          </h2>
          
          <div className={styles['landing__features-grid']}>
            <div className={styles['landing__feature-card']}>
              <div className={styles['landing__feature-icon-wrapper']}>
                <IdcardOutlined />
              </div>
              <div className={styles['landing__feature-info']}>
                <h3 className={styles['landing__feature-title']}>Gestión de membresías</h3>
                <p className={styles['landing__feature-description']}>
                  Control completo de planes activos, vencimientos y estados de afiliados desde una plataforma unificada.
                </p>
              </div>
            </div>

            <div className={styles['landing__feature-card']}>
              <div className={styles['landing__feature-icon-wrapper']}>
                <SafetyOutlined />
              </div>
              <div className={styles['landing__feature-info']}>
                <h3 className={styles['landing__feature-title']}>Control de acceso</h3>
                <p className={styles['landing__feature-description']}>
                  Torniquete automático físico integrado mediante comunicación con lectoras inBio Pro y chips RFID.
                </p>
              </div>
            </div>

            <div className={styles['landing__feature-card']}>
              <div className={styles['landing__feature-icon-wrapper']}>
                <CreditCardOutlined />
              </div>
              <div className={styles['landing__feature-info']}>
                <h3 className={styles['landing__feature-title']}>Pagos en línea</h3>
                <p className={styles['landing__feature-description']}>
                  Pasarela de pagos en línea integrada con Bold para renovaciones rápidas y transferencias directas seguras.
                </p>
              </div>
            </div>

            <div className={styles['landing__feature-card']}>
              <div className={styles['landing__feature-icon-wrapper']}>
                <BellOutlined />
              </div>
              <div className={styles['landing__feature-info']}>
                <h3 className={styles['landing__feature-title']}>Notificaciones automáticas</h3>
                <p className={styles['landing__feature-description']}>
                  Recordatorios automáticos por correo electrónico y notificaciones previas al vencimiento de membresías.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.landing__footer} role="contentinfo">
        <p className={styles['landing__footer-copyright']}>
          © {currentYear} Platinum Center. Todos los derechos reservados.
        </p>
        <div className={styles['landing__footer-links']}>
          <Link to="/terminos" className={styles['landing__footer-link']}>
            Términos de servicio
          </Link>
          <span className={styles['landing__footer-separator']}>•</span>
          <Link to="/politica-privacidad" className={styles['landing__footer-link']}>
            Política de privacidad
          </Link>
          <span className={styles['landing__footer-separator']}>•</span>
          <a href="mailto:gym.platinum.center@gmail.com" className={styles['landing__footer-link']}>
            gym.platinum.center@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
