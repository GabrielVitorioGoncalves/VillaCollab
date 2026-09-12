interface ProductImageProps {
  image?: string;
  alt: string;
  className?: string;
}

export function ProductImage({
  image,
  alt,
  className = "",
}: ProductImageProps) {
  return (
    <div
      className={`
        aspect-square
        overflow-hidden
        bg-background
        ${className}
      `}
    >
      {image ? (
        <img
          src={image}
          alt={alt}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-300
          "
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-text-secondary">
          Sem imagem
        </div>
      )}
    </div>
  );
}