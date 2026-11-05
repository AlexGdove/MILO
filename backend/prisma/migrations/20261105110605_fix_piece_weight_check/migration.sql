-- Исправление CHECK из 20261105105200_init: при unit = 'pcs' и piece_weight IS NULL условие
-- давало NULL (NULL OR FALSE), а CHECK пропускает NULL — штучный ингредиент без веса штуки
-- сохранялся. Найдено интеграционным тестом. Теперь NULL проверяется явно.
ALTER TABLE "public_recipe_ingredients"
  DROP CONSTRAINT "public_recipe_ingredients_piece_weight_check";

ALTER TABLE "public_recipe_ingredients"
  ADD CONSTRAINT "public_recipe_ingredients_piece_weight_check" CHECK (
    ("unit" = 'pcs' AND "piece_weight" IS NOT NULL AND "piece_weight" > 0 AND "piece_weight" <= 5000)
    OR ("unit" <> 'pcs' AND "piece_weight" IS NULL)
  );
