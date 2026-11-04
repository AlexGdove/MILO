/**
 * Заготовка API-клиента для будущего бэкенда (см. backend/README.md).
 * Пока данные хранятся локально через @/shared/lib (persistStorage).
 */
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

export const isApiEnabled = (): boolean => API_URL.length > 0;
