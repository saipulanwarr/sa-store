'use server';
import { convertToPlainObject, formatError } from "../utils";
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from "../constants";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertProductSchema, updateProductSchema } from "../validators";
import { Prisma } from "@prisma/client";

export async function getLatestProducts() {
    const data = await prisma.product.findMany({
        take: LATEST_PRODUCTS_LIMIT,
        orderBy: {createdAt: 'desc'}
    });

    return convertToPlainObject(data);
}

export async function getProductBySlug(slug: string){
    return await prisma.product.findFirst({
        where: {
            slug: slug
        }
    })
}

export async function getProductById(productId: string){
    const data = await prisma.product.findFirst({
        where: {id: productId}
    });

    return convertToPlainObject(data);
}

export async function getAllProducts({
    query,
    limit = PAGE_SIZE,
    page,
    category,
    price,
    rating,
    sort
}: {
    query: string;
    limit?: number;
    page: number;
    category?: string;
    price?: string;
    rating?: string;
    sort?: string;
}){
    const queryFilter: Prisma.ProductWhereInput =
    query && query !== 'all'
      ? {
          name: {
            contains: query,
            mode: 'insensitive',
          } as Prisma.StringFilter,
        }
      : {};

    const categoryFilter = category && category !== "all" ? {category} : {};

    const priceFilter: Prisma.ProductWhereInput = price && price !== "all" ? {
        price: {
            gte: Number(price.split("-")[0]),
            lte: Number(price.split("-")[1])
        }
    } : {};

    const ratingFilter = rating && rating !== "all" ? {
        rating: {
            gte: Number(rating),
        },
    } : {}

    const data = await prisma.product.findMany({
        where: {...queryFilter, ...categoryFilter, ...priceFilter, ...ratingFilter},
        orderBy:
            sort === 'lowest' 
                ? {price: 'asc'}
                : sort === 'highest'
                ? {price: 'desc'}
                : sort === 'rating'
                ? {rating: 'desc'}
                : {createdAt: 'desc'},
        skip: (page - 1) * limit,
        take: limit
    });

    const dataCount = await prisma.product.count();

    return {
        data,
        totalPages: Math.ceil(dataCount / limit)
    }
}

export async function deleteProduct(id: string){
    try{
        const productExists = await prisma.product.findFirst({
            where: {id}
        });

        if(!productExists) throw new Error('Product not found');

        await prisma.product.delete({ where: {id}});

        revalidatePath('/admin/products');

        return {success: true, message: 'Product deleted successfully'}
    }catch(error){
        return {success: false, message: formatError(error)}
    }
}

export async function createProduct(data: z.infer<typeof insertProductSchema>){
    try{
        const product = insertProductSchema.parse(data);
        await prisma.product.create({data: product});

        revalidatePath("/admin/products");

        return {
            success: true,
            message: 'Product created successfully'
        }

    }catch(error){
        return {success: false, message: formatError(error)}
    }
}

export async function updateProduct(data: z.infer<typeof updateProductSchema>){
    try{
        const product = updateProductSchema.parse(data);
        const productExists = await prisma.product.findFirst({
            where: {id: product.id}
        });

        if(!productExists) throw new Error('Product not found')

        await prisma.product.update({
            where: {
                id: product.id
            },
            data: product,
        });

        revalidatePath("/admin/products");

        return {
            success: true,
            message: 'Product updated successfully'
        }

    }catch(error){
        return {success: false, message: formatError(error)}
    }
}

export async function getAllCategories(){
    const data = await prisma.product.groupBy({
        by: ['category'],
        _count: true,
    });

    return data;
}