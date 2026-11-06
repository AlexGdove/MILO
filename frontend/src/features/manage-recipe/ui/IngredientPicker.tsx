import { useState, type ReactNode } from 'react';

import {
  type CatalogFood,
  type SharedProduct,
  useCatalogSearch,
  useSharedProductSearch,
} from '@/entities/food-catalog';
import {
  filterProducts,
  type Product,
  type ProductDraft,
  useProductStore,
} from '@/entities/product';
import { ApiError } from '@/shared/api';
import { cn, formatAmount } from '@/shared/lib';
import { Input, Modal } from '@/shared/ui';

import styles from './IngredientPicker.module.css';

interface IngredientPickerProps {
  /** Подпись поля для экранного диктора: «Продукт 1» */
  label: string;
  products: readonly Product[];
  /** id выбранного продукта кладовой ('' — не выбран) */
  value: string;
  invalid?: boolean;
  onChange: (productId: string) => void;
}

/**
 * Выбор ингредиента поиском (решение №55): по нажатию — окно с поиском по своим продуктам
 * (сначала то, что есть дома), общей базе MILO и Open Food Facts. Ингредиент всегда ссылается
 * на продукт кладовой, поэтому выбранное из базы становится своим продуктом с остатком 0.
 */
export const IngredientPicker = ({
  label,
  products,
  value,
  invalid,
  onChange,
}: IngredientPickerProps) => {
  const [open, setOpen] = useState(false);
  const selected = products.find((product) => product.id === value);

  return (
    <>
      <button
        type="button"
        className={cn(styles.field, invalid && styles.invalid)}
        aria-label={`${label}: ${selected?.name ?? 'не выбран'}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={selected ? styles.value : styles.placeholder}>
          {selected?.name ?? 'Найти продукт…'}
        </span>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.5-4.5" />
        </svg>
      </button>
      <Modal open={open} title="Выбор продукта" onClose={() => setOpen(false)}>
        <PickerSearch
          products={products}
          onPick={(productId) => {
            onChange(productId);
            setOpen(false);
          }}
        />
      </Modal>
    </>
  );
};

const byStockThenName = (a: Product, b: Product) =>
  Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name, 'ru-RU');

const per100 = (unit: Product['unit']) => (unit === 'ml' ? '100 мл' : '100 г');

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('ru-RU');

const sameProduct = (product: Product, draft: ProductDraft) =>
  product.unit === draft.unit && normalizeName(product.name) === normalizeName(draft.name);

const fromShared = (item: SharedProduct): ProductDraft => ({
  name: item.name,
  unit: item.unit,
  pieceWeight: item.pieceWeight ?? undefined,
  per100g: item.per100g,
  stock: 0,
  minStock: 0,
});

const fromOff = (food: CatalogFood): ProductDraft => ({
  name: food.name,
  unit: food.unit,
  per100g: food.per100g,
  stock: 0,
  minStock: 0,
});

const catalogMeta = (kcal: number, unit: Product['unit'], brand: string | null) =>
  [`${kcal} ккал на ${per100(unit)}`, brand].filter(Boolean).join(' · ');

interface PickerSearchProps {
  products: readonly Product[];
  onPick: (productId: string) => void;
}

/** Содержимое окна: запросы к базам идут, только пока окно открыто. */
const PickerSearch = ({ products, onPick }: PickerSearchProps) => {
  const [query, setQuery] = useState('');
  const addProduct = useProductStore((state) => state.addProduct);
  const shared = useSharedProductSearch(query);
  const off = useCatalogSearch(query);

  const local = filterProducts([...products], query).sort(byStockThenName);
  const sharedItems = shared.error ? [] : (shared.data ?? []);
  const barcodes = new Set(sharedItems.map((item) => item.barcode).filter(Boolean));
  const offItems = off.error ? [] : (off.data ?? []).filter((food) => !barcodes.has(food.code));
  const offBusy = off.error instanceof ApiError && off.error.code === 'catalog_busy';
  const searching = (shared.enabled && shared.isFetching) || (off.enabled && off.isFetching);

  /** Такой продукт уже есть у пользователя — берём его, иначе создаём с остатком 0. */
  const pickDraft = (draft: ProductDraft) => {
    const existing = products.find((product) => sameProduct(product, draft));
    onPick(existing ? existing.id : addProduct(draft).id);
  };

  return (
    <div className={styles.search}>
      <Input
        type="search"
        aria-label="Название продукта"
        placeholder="Название или штрихкод"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <Section title="Ваши продукты">
        {local.length === 0 ? (
          <p className={styles.note}>
            {query.trim() ? 'У вас такого нет — поищите в базе ниже' : 'Своих продуктов пока нет'}
          </p>
        ) : (
          local.map((product) => (
            <Option
              key={product.id}
              name={product.name}
              meta={
                product.stock > 0 ? `есть ${formatAmount(product.stock, product.unit)}` : 'нет дома'
              }
              onClick={() => onPick(product.id)}
            />
          ))
        )}
      </Section>

      {sharedItems.length > 0 && (
        <Section title="Общая база MILO">
          {sharedItems.map((item) => (
            <Option
              key={item.id}
              name={item.name}
              meta={catalogMeta(item.per100g.kcal, item.unit, item.brand)}
              onClick={() => pickDraft(fromShared(item))}
            />
          ))}
        </Section>
      )}

      {(offItems.length > 0 || offBusy) && (
        <Section title="Open Food Facts">
          {offBusy ? (
            <p className={styles.note}>Слишком много запросов — попробуйте через минуту</p>
          ) : (
            offItems.map((food) => (
              <Option
                key={food.code}
                name={food.name}
                meta={catalogMeta(food.per100g.kcal, food.unit, food.brand)}
                onClick={() => pickDraft(fromOff(food))}
              />
            ))
          )}
          <p className={styles.attribution}>Данные: Open Food Facts (ODbL)</p>
        </Section>
      )}

      {searching && <p className={styles.note}>Ищем в базе…</p>}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className={styles.section} aria-label={title}>
    <h3 className={styles.title}>{title}</h3>
    {children}
  </section>
);

const Option = ({ name, meta, onClick }: { name: string; meta: string; onClick: () => void }) => (
  <button type="button" className={styles.option} onClick={onClick}>
    <span className={styles.optionName}>{name}</span>
    <span className={styles.optionMeta}>{meta}</span>
  </button>
);
