import { Input } from '@/shared/ui';

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const ProductSearch = ({ value, onChange }: ProductSearchProps) => (
  <Input
    type="search"
    placeholder="Поиск продукта"
    aria-label="Поиск продукта"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);
