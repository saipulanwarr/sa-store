import { cn, formatCurrency } from "@/lib/utils";
import React from "react";

function ProductPrice({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const stringValue = value.toFixed(3);
  const [intValue, floatValue] = stringValue.split(".");

  return (
    <p className={cn("text-2xl", className)}>
      <span className="text-xs align-super">Rp.</span>
      {formatCurrency(intValue).replace("Rp", "").trim()}
      <span className="text-xs align-super">. {floatValue}</span>
    </p>
  );
}

export default ProductPrice;
