interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
}: QuantitySelectorProps) {
  const decrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const increase = () => {
    if (max === undefined || value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text">
        Quantidade
      </p>

      <div className="flex w-fit items-center overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={decrease}
          disabled={value <= min}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            text-lg
            text-text
            transition-colors
            hover:bg-background-secondary
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          −
        </button>

        <span className="flex h-10 min-w-10 items-center justify-center border-x border-border text-sm font-medium text-text">
          {value}
        </span>

        <button
          type="button"
          onClick={increase}
          disabled={max !== undefined && value >= max}
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            text-lg
            text-text
            transition-colors
            hover:bg-background-secondary
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          +
        </button>
      </div>
    </div>
  );
}