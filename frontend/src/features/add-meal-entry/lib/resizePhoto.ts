/** Длинная сторона снимка после сжатия: модели хватает, а файл — сотни килобайт вместо мегабайт */
export const PHOTO_MAX_SIDE = 1280;
const JPEG_QUALITY = 0.82;

/** Размер после уменьшения до `maxSide` по длинной стороне; маленькие снимки не увеличиваются. */
export const fitSize = (
  width: number,
  height: number,
  maxSide = PHOTO_MAX_SIDE,
): { width: number; height: number } => {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const loadImage = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать фото'));
    };
    image.src = url;
  });

/**
 * Снимок → JPEG в base64 без префикса `data:`, уменьшенный до `PHOTO_MAX_SIDE`. Сжатие — на
 * устройстве: на сервер уходит только уменьшенная копия, метаданные снимка (место, время)
 * при перерисовке теряются.
 */
export async function photoToBase64(file: Blob): Promise<string> {
  const image = await loadImage(file);
  const { width, height } = fitSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось обработать фото');
  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('Не удалось обработать фото');
  return base64;
}
