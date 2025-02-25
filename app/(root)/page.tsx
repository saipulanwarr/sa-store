import React from "react";

import ProductList from "@/components/shared/product/product-list";
import { getLatestProducts } from "@/lib/actions/product.actions";
import ProductCarousel from "@/components/shared/product/product-carousel";
import ViewAllProductsButton from "@/components/view-all-products-button";

async function HomePage() {
  const latestProducts = await getLatestProducts();

  return (
    <>
      <ProductCarousel />
      <ProductList data={latestProducts} title="Newest Arrival" limit={10} />
      <ViewAllProductsButton />
    </>
  );
}

export default HomePage;
