"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";

const ProductCarousel = () => {
  const data = ["/images/banner-1.jpg", "/images/banner-2.jpg"];

  return (
    <Carousel
      className="w-full mb-12"
      opts={{
        loop: true,
      }}
      plugins={[
        Autoplay({
          delay: 10000,
          stopOnInteraction: true,
          stopOnMouseEnter: true,
        }),
      ]}
    >
      <CarouselContent>
        {data.map((product, index) => (
          <CarouselItem key={index}>
            <Link href={`/product`}>
              <div className="relative mx-auto">
                <Image
                  src={product}
                  alt="banner1"
                  width="0"
                  height="0"
                  sizes="100vw"
                  className="w-full h-auto"
                />
                {/* <div className="absolute inset-0 flex items-end justify-center">
                  <h2 className="bg-gray-900 bg-opacity-50 text-2xl font-bold px-2 text-white">
                    Banner 1
                  </h2>
                </div> */}
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default ProductCarousel;
