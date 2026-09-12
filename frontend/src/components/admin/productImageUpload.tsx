import { ImagePlus, X } from "lucide-react";
import { useState } from "react";

interface ProductImageUploadProps {
  value?: string;
  onChange?: (file: File | undefined) => void;
  onRemove?: () => void;
}

export function ProductImageUpload({
  value,
  onChange,
  onRemove,
}: ProductImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>();
  const [removed, setRemoved] = useState(false);

  const currentPreview = removed ? undefined : preview ?? value;

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setPreview(imageUrl);
    setRemoved(false);

    onChange?.(file);

    event.target.value = "";
  };

  const handleRemove = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(undefined);
    setRemoved(true);

    onChange?.(undefined);
    onRemove?.();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text">
        Imagem do produto
      </p>

      {currentPreview ? (
        <div className="relative aspect-square max-w-xs overflow-hidden rounded-lg border border-border">
          <img
            src={currentPreview}
            alt="Pré-visualização do produto"
            className="h-full w-full object-cover"
          />

          <button
            type="button"
            onClick={handleRemove}
            className="
              absolute right-2 top-2
              flex h-8 w-8 items-center justify-center
              rounded-full bg-white text-text shadow-sm
              transition-colors hover:bg-gray-100
            "
            aria-label="Remover imagem"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          className="
            flex aspect-square max-w-xs cursor-pointer
            flex-col items-center justify-center
            rounded-lg border-2 border-dashed border-border
            bg-background text-text-secondary
            transition-colors hover:bg-background-secondary
          "
        >
          <ImagePlus size={28} />

          <span className="mt-2 text-sm font-medium">
            Adicionar imagem
          </span>

          <span className="mt-1 text-xs">
            PNG, JPG ou WEBP
          </span>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}