import React from "react";

import ProductList from "@/components/shared/product/product-list";
import { getLatestProducts } from "@/lib/actions/product.actions";
import ProductCarousel from "@/components/shared/product/product-carousel";

async function HomePage() {
  const latestProducts = await getLatestProducts();

  return (
    <>
      <ProductCarousel />
      <ProductList data={latestProducts} title="Newest Arrival" limit={10} />
    </>
  );
}

export default HomePage;
