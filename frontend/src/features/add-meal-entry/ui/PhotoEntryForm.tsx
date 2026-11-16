import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { selectAccount, selectToken, useSessionStore } from '@/entities/account';
import { MEAL_TYPES, useMealEntryStore, type MealType } from '@/entities/meal-entry';
import { selectProducts, useProductStore } from '@/entities/product';
import { ApiError } from '@/shared/api';
import { createId, formatGrams, formatKcal, type IsoDate } from '@/shared/lib';
import { Button, Input, SegmentedControl, Select } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';
import { PhotoCamera } from './PhotoCamera';
import { FREE_LIMIT_TEXT, photoAiApi, photoErrorText } from '../api/photoAiApi';
import {
  canSaveDish,
  dishTotals,
  ingredientGrams,
  removeIngredient,
  setIngredientGrams,
  setIngredientProduct,
  toDishIngredients,
  type DishIngredient,
  type Recognition,
} from '../lib/photoDish';
import { photoToBase64 } from '../lib/resizePhoto';

export const HINT_MAX_LENGTH = 200;
/** Форматы фото из галереи — те, что принимает сервер (`detectPhotoMime`) */
export const GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp';

interface PhotoEntryFormProps {
  date: IsoDate;
  initialMealType: MealType;
  /** Вернуться к поиску продуктов и блюд */
  onChangeSource: () => void;
  onDone: () => void;
  /** Подготовка снимка к отправке — подменяется в тестах (в jsdom нет canvas) */
  encodePhoto?: (file: Blob) => Promise<string>;
}

type Step = 'pick' | 'loading' | 'review';

/**
 * Блюдо по фото (решения №68, №75): снимок и описание → сервер называет блюдо и ингредиенты →
 * пользователь проверяет граммы и продукты → одна запись в дневнике. Модель ошибается, поэтому
 * перед записью всё можно поправить; КБЖУ считается по справочнику и своим продуктам, не моделью.
 */
export const PhotoEntryForm = ({
  date,
  initialMealType,
  onChangeSource,
  onDone,
  encodePhoto = photoToBase64,
}: PhotoEntryFormProps) => {
  const token = useSessionStore(selectToken);
  const account = useSessionStore(selectAccount);
  const products = useProductStore(selectProducts);
  const addEntry = useMealEntryStore((state) => state.addEntry);

  const [step, setStep] = useState<Step>('pick');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<DishIngredient[]>([]);
  const [usage, setUsage] = useState<Recognition['usage'] | null>(null);
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  const totals = useMemo(() => dishTotals(ingredients), [ingredients]);

  // Ссылка на превью создаётся при выборе фото (`choosePhoto`); при уходе с экрана освобождается
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const back = (
    <Button variant="ghost" size="small" onClick={onChangeSource}>
      ← К поиску
    </Button>
  );

  if (!token || !account) {
    return (
      <div className={styles.form}>
        <p className={styles.note}>
          Распознавание блюда по фото доступно после входа в аккаунт — войдите на вкладке «Профиль».
        </p>
        {back}
      </div>
    );
  }
  const isFree = account.plan === 'free';

  const choosePhoto = (next: Blob) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    // В тестовом окружении (jsdom) createObjectURL нет — тогда без превью
    const url = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(next) : null;
    previewRef.current = url;
    setPreviewUrl(url);
    setPhoto(next);
    setCameraOpen(false);
    setError(null);
  };

  const handleGallery = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    // Тот же файл можно выбрать снова — иначе браузер не пришлёт `change`
    event.target.value = '';
    if (picked) choosePhoto(picked);
  };

  const handleRecognize = async (event: FormEvent) => {
    event.preventDefault();
    if (!photo) return;
    setStep('loading');
    setError(null);
    try {
      const image = await encodePhoto(photo);
      const recognition = await photoAiApi.recognize(token, image, hint);
      setName(recognition.dish);
      setIngredients(toDishIngredients(recognition, products));
      setUsage(recognition.usage);
      setStep('review');
    } catch (caught) {
      setError(
        isFree && caught instanceof ApiError && caught.code === 'photo_ai_limit'
          ? FREE_LIMIT_TEXT
          : photoErrorText(caught),
      );
      setStep('pick');
    }
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!canSaveDish(name, ingredients)) return;
    addEntry({
      date,
      mealType,
      // Блюдо по фото не связано с кладовой: остатки не списываются
      source: { type: 'photo', id: createId() },
      productName: name.trim(),
      per100g: totals.per100g,
      amount: totals.grams,
      unit: 'g',
      grams: totals.grams,
      stockDeducted: 0,
    });
    onDone();
  };

  if (step !== 'review' && cameraOpen) {
    return <PhotoCamera onCapture={choosePhoto} onCancel={() => setCameraOpen(false)} />;
  }

  if (step !== 'review') {
    const loading = step === 'loading';
    return (
      <form className={styles.form} onSubmit={(event) => void handleRecognize(event)} noValidate>
        {photo && (
          <div className={styles.photoPreview}>
            {previewUrl && <img src={previewUrl} alt="Выбранное фото блюда" />}
          </div>
        )}
        <div className={styles.photoActions}>
          <Button
            type="button"
            variant={photo ? 'secondary' : 'primary'}
            onClick={() => setCameraOpen(true)}
            disabled={loading}
          >
            {photo ? 'Переснять' : 'Сделать фото'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => galleryRef.current?.click()}
            disabled={loading}
          >
            {photo ? 'Другое из галереи' : 'Выбрать из галереи'}
          </Button>
          {/*
            Конкретные форматы, а не image/*: с image/* Android предлагает «Камера / Файлы»,
            а со списком форматов сразу открывает выбор фото. iPhone отдаёт HEIC как JPEG.
          */}
          <input
            ref={galleryRef}
            type="file"
            accept={GALLERY_ACCEPT}
            className={styles.hiddenInput}
            aria-label="Фото из галереи"
            tabIndex={-1}
            onChange={handleGallery}
          />
        </div>
        <Input
          label="Описание (необязательно)"
          placeholder="Например: пельмени со свининой, 15 штук"
          value={hint}
          maxLength={HINT_MAX_LENGTH}
          onChange={(event) => setHint(event.target.value)}
          disabled={loading}
        />
        {isFree && (
          <p className={styles.note}>
            На бесплатном тарифе — 3 распознавания в неделю. Больше — на тарифе Plus.
          </p>
        )}
        <p className={styles.note}>
          Описание помогает: похожие на вид блюда модель путает. Фото отправляется на сервер только
          для распознавания и не сохраняется.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p className={styles.note} role="status">
            Распознаём… Обычно это занимает 10–20 секунд.
          </p>
        )}
        <Button type="submit" fullWidth disabled={!photo || loading}>
          {loading ? 'Распознаём…' : 'Распознать'}
        </Button>
        {!loading && back}
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSave} noValidate>
      {previewUrl && (
        <div className={styles.photoPreview}>
          <img src={previewUrl} alt="Фото блюда" />
        </div>
      )}
      <Input
        label="Блюдо"
        value={name}
        maxLength={80}
        onChange={(event) => setName(event.target.value)}
        error={name.trim() === '' ? 'Введите название' : undefined}
      />

      <p className={styles.note}>
        Проверьте продукты и вес: модель оценивает их на глаз и может ошибаться.
      </p>

      {ingredients.length === 0 ? (
        <p className={styles.error} role="alert">
          Ингредиентов не осталось — сделайте другое фото
        </p>
      ) : (
        <ul className={styles.ingredients} aria-label="Ингредиенты">
          {ingredients.map((item) => {
            const grams = ingredientGrams(item);
            return (
              <li key={item.key} className={styles.ingredient}>
                <div className={styles.ingredientHead}>
                  <span className={styles.optionName}>{item.name}</span>
                  <button
                    type="button"
                    className={styles.removeIngredient}
                    onClick={() => setIngredients((list) => removeIngredient(list, item.key))}
                    aria-label={`Убрать ${item.name}`}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.ingredientRow}>
                  <Input
                    aria-label={`Вес, г: ${item.name}`}
                    inputMode="decimal"
                    className={styles.gramsInput}
                    value={item.gramsInput}
                    onChange={(event) =>
                      setIngredients((list) =>
                        setIngredientGrams(list, item.key, event.target.value),
                      )
                    }
                    error={grams === null ? 'Вес больше 0' : undefined}
                  />
                  <span className={styles.optionMeta}>
                    {item.per100g === null
                      ? 'нет в справочнике'
                      : `г · ${formatKcal((item.per100g.kcal * (grams ?? 0)) / 100)} ккал`}
                  </span>
                </div>
                {(item.per100g === null || item.productId !== null) && (
                  <Select
                    aria-label={`Продукт для «${item.name}»`}
                    value={item.productId ?? ''}
                    onChange={(event) =>
                      setIngredients((list) =>
                        setIngredientProduct(
                          list,
                          item.key,
                          products.find((product) => product.id === event.target.value) ?? null,
                        ),
                      )
                    }
                  >
                    <option value="">Выберите свой продукт…</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </Select>
                )}
                {item.sourceName !== null && item.productId === null && (
                  <span className={styles.optionMeta}>КБЖУ: {item.sourceName}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totals.unresolved > 0 && (
        <p className={styles.error} role="alert">
          Для продуктов, которых нет в справочнике, выберите свой продукт из кладовой или уберите их
          кнопкой «×».
        </p>
      )}

      <SegmentedControl
        legend="Приём пищи"
        options={MEAL_TYPES}
        value={mealType}
        onChange={setMealType}
      />

      <p className={styles.preview}>
        <strong>{formatKcal(totals.nutrients.kcal)} ккал</strong> · {formatGrams(totals.grams)} г ·
        Б {formatGrams(totals.nutrients.protein)} · Ж {formatGrams(totals.nutrients.fat)} · У{' '}
        {formatGrams(totals.nutrients.carbs)}
      </p>

      {usage && (
        <p className={styles.note}>
          Распознаваний за {usage.period === 'week' ? 'неделю' : 'сутки'}: {usage.used} из{' '}
          {usage.limit}
        </p>
      )}

      <Button type="submit" fullWidth disabled={!canSaveDish(name, ingredients)}>
        Добавить
      </Button>
      <Button variant="ghost" size="small" onClick={() => setStep('pick')}>
        ← Другое фото
      </Button>
    </form>
  );
};
