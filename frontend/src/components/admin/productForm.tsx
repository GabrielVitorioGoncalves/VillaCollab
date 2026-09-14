import { useState } from "react";

import { Button } from "../ui/button";
import { FormField } from "../ui/formField";
import { Input } from "../ui/input";

import { ProductImageUpload } from "./productImageUpload";

export interface ProductFormData {
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  stock: number;
  available: boolean;
  image?: File;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit?: (data: ProductFormData) => void;
  onCancel?: () => void;
}

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [name, setName] = useState(
    initialData?.name ?? ""
  );

  const [category, setCategory] = useState(
    initialData?.category ?? ""
  );

  const [price, setPrice] = useState(
    initialData?.price?.toString() ?? ""
  );

  const [oldPrice, setOldPrice] = useState(
    initialData?.oldPrice?.toString() ?? ""
  );

  const [stock, setStock] = useState(
    initialData?.stock?.toString() ?? "0"
  );

  const [available, setAvailable] = useState(
    initialData?.available ?? true
  );

  const [image, setImage] = useState<File | undefined>();

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const data: ProductFormData = {
      name,
      category,
      price: Number(price),
      oldPrice: oldPrice
        ? Number(oldPrice)
        : undefined,
      stock: Number(stock),
      available,
      image,
    };

    onSubmit?.(data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <FormField
            label="Nome do produto"
            required
          >
            <Input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Ex.: Tênis Casual Urbano"
              required
            />
          </FormField>

          <FormField
            label="Categoria"
            required
          >
            <Input
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              placeholder="Ex.: Calçados"
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Preço"
              required
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) =>
                  setPrice(event.target.value)
                }
                placeholder="0,00"
                required
              />
            </FormField>

            <FormField label="Preço anterior">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={oldPrice}
                onChange={(event) =>
                  setOldPrice(event.target.value)
                }
                placeholder="0,00"
              />
            </FormField>
          </div>

          <FormField
            label="Estoque"
            required
          >
            <Input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(event) =>
                setStock(event.target.value)
              }
              required
            />
          </FormField>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) =>
                setAvailable(event.target.checked)
              }
              className="h-4 w-4 rounded border-border"
            />

            <span className="text-sm text-text">
              Produto disponível
            </span>
          </label>
        </div>

        <ProductImageUpload
          onChange={setImage}
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}

        <Button type="submit">
          Salvar produto
        </Button>
      </div>
    </form>
  );
}