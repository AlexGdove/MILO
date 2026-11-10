import { useEffect, useRef, useState } from 'react';

import { createBarcodeReader } from '@/shared/lib';

import styles from './ScanBarcodeButton.module.css';
import { Modal } from '../Modal/Modal';

type ScanStatus = 'starting' | 'scanning' | 'denied' | 'unavailable' | 'insecure';

const MESSAGES: Record<ScanStatus, string> = {
  starting: 'Запускаем камеру…',
  scanning: 'Наведите камеру на штрихкод',
  denied: 'Нет доступа к камере. Разрешите её в настройках или введите штрихкод вручную.',
  unavailable: 'Камера или сканер недоступны. Введите штрихкод вручную.',
  insecure: 'Камера работает только по защищённому соединению (HTTPS). Введите штрихкод вручную.',
};

/** Интервал между попытками прочитать кадр, мс: хватает для руки, не грузит слабый телефон. */
const SCAN_INTERVAL_MS = 250;

const isPermissionError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'NotAllowedError' || error.name === 'SecurityError');

/** Камера и чтение кадров; камера выключается при закрытии окна и при первой находке. */
const ScanView = ({ onDetect }: { onDetect: (code: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);
  const [status, setStatus] = useState<ScanStatus>('starting');

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;

    const stopCamera = () => stream?.getTracks().forEach((track) => track.stop());

    const run = async () => {
      if (!window.isSecureContext) {
        setStatus('insecure');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (error) {
        if (!stopped) setStatus(isPermissionError(error) ? 'denied' : 'unavailable');
        return;
      }
      const video = videoRef.current;
      if (stopped || !video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      let reader;
      try {
        reader = await createBarcodeReader();
      } catch {
        stopCamera();
        if (!stopped) setStatus('unavailable');
        return;
      }
      if (stopped) return;
      setStatus('scanning');

      const tick = async () => {
        if (stopped) return;
        const code = await reader.read(video).catch(() => null);
        if (stopped) return;
        if (code) {
          stopCamera();
          onDetectRef.current(code);
          return;
        }
        timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS);
      };
      void tick();
    };

    void run();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stopCamera();
    };
  }, []);

  return (
    <div className={styles.scan}>
      <video ref={videoRef} className={styles.video} playsInline muted aria-hidden />
      <p className={styles.message} role="status">
        {MESSAGES[status]}
      </p>
    </div>
  );
};

interface ScanBarcodeButtonProps {
  /** Получает найденный штрихкод (8–14 цифр) после закрытия окна сканера. */
  onScan: (code: string) => void;
}

/** Кнопка рядом с полем: открывает окно с камерой, найденный штрихкод отдаёт в `onScan`. */
export const ScanBarcodeButton = ({ onScan }: ScanBarcodeButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label="Сканировать штрихкод"
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
          <path d="M8 8v8M11 8v8M14 8v8M17 8v8" />
        </svg>
      </button>
      <Modal open={open} title="Сканер штрихкода" onClose={() => setOpen(false)}>
        <ScanView
          onDetect={(code) => {
            setOpen(false);
            onScan(code);
          }}
        />
      </Modal>
    </>
  );
};
