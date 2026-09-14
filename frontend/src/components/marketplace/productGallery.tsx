import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProductImage } from "./productImage";

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

export function ProductGallery({
  images,
  alt,
}: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  if (images.length === 0) {
    return (
      <ProductImage
        alt={alt}
        className="rounded-[22px]"
      />
    );
  }

  const currentImage = images[selectedImage];

  const previousImage = () => {
    setSelectedImage((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  };

  const nextImage = () => {
    setSelectedImage((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  };

  return (
    <div className="space-y-4">
      {/* Imagem principal */}
      <div className="group relative">
        <ProductImage
          image={currentImage}
          alt={alt}
          className="rounded-[22px]"
        />

        {images.length > 1 && (
          <>
            {/* Seta esquerda */}
            <button
              type="button"
              onClick={previousImage}
              aria-label="Imagem anterior"
              className="
                absolute
                left-3
                top-1/2
                flex
                h-10
                w-10
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                bg-white/90
                text-text
                opacity-0
                shadow-md
                transition-opacity
                duration-200
                group-hover:opacity-100
                hover:bg-white
                hover:shadow-lg
              "
            >
              <ChevronLeft size={22} />
            </button>

            {/* Seta direita */}
            <button
              type="button"
              onClick={nextImage}
              aria-label="Próxima imagem"
              className="
                absolute
                right-3
                top-1/2
                flex
                h-10
                w-10
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                bg-white/90
                text-text
                opacity-0
                shadow-md
                transition-opacity
                duration-200
                group-hover:opacity-100
                hover:bg-white
                hover:shadow-lg
              "
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedImage(index)}
              aria-label={`Selecionar imagem ${index + 1}`}
              className={`
                h-20
                w-20
                shrink-0
                overflow-hidden
                rounded-lg
                border-2
                transition-colors
                ${
                  selectedImage === index
                    ? "border-primary"
                    : "border-border hover:border-text-secondary"
                }
              `}
            >
              <img
                src={image}
                alt={`${alt} - imagem ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}