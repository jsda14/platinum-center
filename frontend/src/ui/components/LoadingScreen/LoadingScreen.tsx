import styles from './LoadingScreen.module.css';
import logo from '../../../assets/platinum-center-logo.png';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'PLATINUM CENTER' }: LoadingScreenProps) {
  return (
    <div className={styles['loading-screen']} role="status" aria-live="polite">
      <div className={styles['loading-screen__container']}>
        <img
          src={logo}
          alt="Logo Platinum Center"
          className={styles['loading-screen__logo']}
        />
        <h1 className={styles['loading-screen__title']}>
          {message}
        </h1>
      </div>
    </div>
  );
}
