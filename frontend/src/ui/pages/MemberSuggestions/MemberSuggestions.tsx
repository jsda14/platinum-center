import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useAppSelector } from '../../../infrastructure/store/store';
import { getMemberSuggestions } from '../../../application/member/getMemberSuggestions.usecase';
import { createSuggestion } from '../../../application/member/createSuggestion.usecase';
import type { Suggestion } from '../../../domain/member/member.types';
import styles from './MemberSuggestions.module.css';

const suggestionFormSchema = z.object({
  message: z
    .string()
    .min(10, 'La sugerencia debe contener al menos 10 caracteres')
    .max(500, 'La sugerencia no puede superar los 500 caracteres'),
});

export function MemberSuggestions() {
  const { profile } = useAppSelector((state) => state.auth);
  
  // Suggestion list states
  const [memberId, setMemberId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Form states
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Fetch previous suggestions on mount
  useEffect(() => {
    if (!profile) return;

    setIsHistoryLoading(true);
    setHistoryError(null);
    getMemberSuggestions(profile.id)
      .then(({ memberId: mId, suggestions: list }) => {
        setMemberId(mId);
        setSuggestions(list);
        setIsHistoryLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error al obtener tus sugerencias anteriores';
        setHistoryError(msg);
        setIsHistoryLoading(false);
      });
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;

    setFormError(null);
    setShowSuccessAlert(false);

    // Validate using Zod
    const validation = suggestionFormSchema.safeParse({ message: message.trim() });
    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message || 'Mensaje inválido';
      setFormError(errorMsg);
      return;
    }

    try {
      setIsSubmitting(true);
      const newSuggestion = await createSuggestion(memberId, message.trim());
      
      // Update UI state
      setSuggestions((prev) => [newSuggestion, ...prev]);
      setMessage('');
      setShowSuccessAlert(true);
      
      // Auto-hide success alert after 4 seconds
      setTimeout(() => {
        setShowSuccessAlert(false);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar la sugerencia';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const statusLabels: Record<string, string> = {
    'pending': 'Pendiente',
    'read': 'Leída',
    'answered': 'Respondida',
  };

  const statusClasses: Record<string, string> = {
    'pending': styles['member-suggestions__badge--pending'],
    'read': styles['member-suggestions__badge--read'],
    'answered': styles['member-suggestions__badge--answered'],
  };

  return (
    <div className={styles['member-suggestions']} role="main">
      <header className={styles['member-suggestions__header']}>
        <h1 className={styles['member-suggestions__title']}>Buzón de Sugerencias</h1>
        <p className={styles['member-suggestions__subtitle']}>
          Tu opinión nos ayuda a mejorar. Déjanos tus comentarios, quejas o ideas.
        </p>
      </header>

      {/* Suggestion Form Section */}
      <section className={styles['member-suggestions__form-section']} aria-labelledby="form-section-title">
        <h2 id="form-section-title" className={styles['member-suggestions__form-title']}>
          Nueva sugerencia
        </h2>

        {showSuccessAlert && (
          <div className={styles['member-suggestions__success-alert']} role="status" aria-live="polite">
            ¡Sugerencia enviada correctamente! Gracias por tus comentarios.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles['member-suggestions__form']} noValidate>
          <div className={styles['member-suggestions__field']}>
            <label htmlFor="suggestion-message" className={styles['member-suggestions__label']}>
              Mensaje
            </label>
            <textarea
              id="suggestion-message"
              className={`${styles['member-suggestions__textarea']} ${
                formError ? styles['member-suggestions__textarea--invalid'] : ''
              }`}
              placeholder="Escribe aquí tu sugerencia, reclamo o propuesta de mejora..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (formError) setFormError(null);
              }}
              disabled={isSubmitting}
              maxLength={500}
              aria-invalid={formError ? 'true' : 'false'}
              aria-describedby={formError ? 'suggestion-error' : undefined}
            />
            {formError && (
              <span id="suggestion-error" className={styles['member-suggestions__field-error']} role="alert">
                {formError}
              </span>
            )}
            <span className={styles['member-suggestions__char-count']}>
              {message.length} / 500
            </span>
          </div>

          <button
            type="submit"
            className={styles['member-suggestions__submit-button']}
            disabled={isSubmitting || message.trim().length < 10}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Sugerencia'}
          </button>
        </form>
      </section>

      {/* Suggestions History Section */}
      <section className={styles['member-suggestions__history-section']} aria-labelledby="history-section-title">
        <h2 id="history-section-title" className={styles['member-suggestions__history-title']}>
          Mis Sugerencias Anteriores
        </h2>

        {isHistoryLoading ? (
          <div className={styles['member-suggestions__loading']} role="status" aria-live="polite">
            Cargando historial...
          </div>
        ) : historyError ? (
          <div className={styles['member-suggestions__error']} role="alert">
            <p className={styles['member-suggestions__error-message']}>{historyError}</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className={styles['member-suggestions__empty']}>
            <h3 className={styles['member-suggestions__empty-title']}>No tienes sugerencias previas</h3>
            <p className={styles['member-suggestions__empty-desc']}>
              Aún no has enviado ninguna sugerencia a través de tu portal.
            </p>
          </div>
        ) : (
          <div className={styles['member-suggestions__list']}>
            {suggestions.map((suggestion) => {
              const statusVal = suggestion.status || 'pending';

              return (
                <article key={suggestion.id} className={styles['member-suggestions__card']}>
                  <div className={styles['member-suggestions__card-header']}>
                    <span className={styles['member-suggestions__date']}>
                      {formatDate(suggestion.created_at)}
                    </span>
                    <span className={`${styles['member-suggestions__badge']} ${statusClasses[statusVal] || ''}`}>
                      {statusLabels[statusVal] || statusVal}
                    </span>
                  </div>

                  <p className={styles['member-suggestions__message']}>{suggestion.message}</p>

                  {suggestion.response && (
                    <div className={styles['member-suggestions__response-box']}>
                      <span className={styles['member-suggestions__response-title']}>Respuesta del Admin</span>
                      <p className={styles['member-suggestions__response-text']}>{suggestion.response}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
export default MemberSuggestions;
