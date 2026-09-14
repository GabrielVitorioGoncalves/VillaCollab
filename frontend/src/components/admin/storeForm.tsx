import { useState } from "react";

import { Button } from "../ui/button";
import { FormField } from "../ui/formField";
import { Input } from "../ui/input";

export interface StoreFormData {
  name: string;
  category: string;
  description: string;
}

interface StoreFormProps {
  initialData?: Partial<StoreFormData>;
  onSubmit?: (data: StoreFormData) => void;
  onCancel?: () => void;
}

export function StoreForm({
  initialData,
  onSubmit,
  onCancel,
}: StoreFormProps) {
  const [name, setName] = useState(
    initialData?.name ?? ""
  );

  const [category, setCategory] = useState(
    initialData?.category ?? ""
  );

  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    onSubmit?.({
      name,
      category,
      description,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-5"
    >
      <FormField
        label="Nome da loja"
        required
      >
        <Input
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="Ex.: Urban Store"
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
          placeholder="Ex.: Moda"
          required
        />
      </FormField>

      <FormField
        label="Descrição"
        required
      >
        <textarea
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Descreva a loja..."
          rows={5}
          required
          className="
            w-full
            resize-none
            rounded-lg
            border
            border-border
            bg-background
            px-3
            py-2
            text-sm
            text-text
            outline-none
            transition-colors
            placeholder:text-text-secondary
            focus:border-black
          "
        />
      </FormField>

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
          Salvar loja
        </Button>
      </div>
    </form>
  );
}