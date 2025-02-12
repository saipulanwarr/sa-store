import React from "react";

import ProductList from "@/components/shared/product/product-list";
import sampleData from "@/db/sample-data";

function HomePage() {
  return (
    <>
      <ProductList
        data={sampleData.products}
        title="Newest Arrival"
        limit={10}
      />
    </>
  );
}

export default HomePage;
