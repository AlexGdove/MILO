import { useEffect, useRef, useState } from 'react';

import styles from './AddMealEntryForm.module.css';
import { fitSize } from '../lib/resizePhoto';

type CameraStatus = 'starting' | 'ready' | 'denied' | 'unavailable' | 'insecure';

const MESSAGES: Record<CameraStatus, string> = {
  starting: 'Запускаем камеру…',
  ready: 'Наведите камеру на блюдо',
  denied: 'Нет доступа к камере. Разрешите её в настройках или выберите фото из галереи.',
  unavailable: 'Камера недоступна. Выберите фото из галереи.',
  insecure: 'Камера работает только по защищённому соединению (HTTPS). Выберите фото из галереи.',
};

const JPEG_QUALITY = 0.9;

const isPermissionError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'NotAllowedError' || error.name === 'SecurityError');

interface PhotoCameraProps {
  /** Снимок с камеры (JPEG) */
  onCapture: (photo: Blob) => void;
  onCancel: () => void;
}

/**
 * Камера прямо в приложении (как у сканера штрихкода, №67): задняя камера, «Снять» — кадр
 * в JPEG. Камера выключается после снимка, при отмене и при уходе с экрана.
 */
export const PhotoCamera = ({ onCapture, onCancel }: PhotoCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('starting');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let stopped = false;

    const run = async () => {
      if (!window.isSecureContext) {
        setStatus('insecure');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
      } catch (error) {
        if (!stopped) setStatus(isPermissionError(error) ? 'denied' : 'unavailable');
        return;
      }
      const video = videoRef.current;
      if (stopped || !video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      if (!stopped) setStatus('ready');
    };

    void run();
    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const { width, height } = fitSize(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      setStatus('unavailable');
      return;
    }
    setCapturing(true);
    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) {
          setStatus('unavailable');
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        onCapture(blob);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  };

  return (
    <div className={styles.camera}>
      <video ref={videoRef} className={styles.cameraVideo} playsInline muted aria-hidden />
      <p className={styles.note} role="status">
        {MESSAGES[status]}
      </p>
      {/* Как в обычной камере телефона: «назад» слева, круглая кнопка съёмки по центру */}
      <div className={styles.cameraBar}>
        <button type="button" className={styles.cameraBack} onClick={onCancel}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Назад
        </button>
        <button
          type="button"
          className={styles.shutter}
          aria-label="Снять"
          onClick={capture}
          disabled={status !== 'ready' || capturing}
        />
        <span aria-hidden />
      </div>
    </div>
  );
};
