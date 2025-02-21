/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
"use server"

import { auth } from "@/auth"
import { getMyCart } from "./cart.actions";
import { getUserById } from "./user.actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { convertToPlainObject, formatError } from "../utils";
import { insertOrderSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { CartItem } from "@/types";
import { PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";

export async function createOrder(){
    try{
        const session = await auth();
        if(!session) throw new Error('User is not authenticated');

        const cart = await getMyCart();
        const userId = session?.user?.id;
        if(!userId) throw new Error('User not found')

        const user = await getUserById(userId);

        if(!cart || cart.items.length === 0){
            return {success: false, message: 'Your cart is empty', redirectTo: '/cart'}
        }

        if(!user.address){
            return {success: false, message: 'No shipping address', redirectTo: '/shipping-address'}
        }

        if(!user.paymentMethod){
            return {success: false, message: 'No payment method', redirectTo: '/payment-method'}
        }

        const order = insertOrderSchema.parse({
            userId: user.id,
            shippingAddress: user.address,
            paymentMethod: user.paymentMethod,
            itemsPrice: cart.itemsPrice,
            shippingPrice: cart.shippingPrice,
            taxPrice: cart.taxPrice,
            totalPrice: cart.totalPrice,
        });

        const insertedOrderId = await prisma.$transaction(async (tx) => {
            const insertOrder = await tx.order.create({ data: order});

            for(const item of cart.items as CartItem[]){
                await tx.orderItem.create({
                    data: {
                        ...item,
                        price: item.price,
                        orderId: insertOrder.id,
                    }
                });
            }

            await tx.cart.update({
                where: {id: cart.id},
                data: {
                    items: [],
                    totalPrice: 0,
                    taxPrice: 0,
                    shippingPrice: 0,
                    itemsPrice: 0,
                }
            });

            return insertOrder.id;
        });

        if(!insertedOrderId) throw new Error('Order not created');

        return {
            success: true,
            message: 'order created',
            redirectTo: `/order/${insertedOrderId}`
        }

    }catch(error){
        if(isRedirectError(error)) throw error;
        return {success: false, message: formatError(error)}
    }
}

export async function getOrderById(orderId: string){
    const data = await prisma.order.findFirst({
        where: {
            id: orderId,
        },
        include: {
            orderItems: true,
            user: { select: { name: true, email: true }}
        }
    });

    return convertToPlainObject(data);
}

export async function getMyOrders({
    limit = PAGE_SIZE,
    page
}: {
    limit?: number;
    page: number;
}){
    const session = await auth();
    if(!session) throw new Error('User is not authorized')

    const data = await prisma.order.findMany({
        where: {userId: session?.user?.id!},
        orderBy: {createdAt: 'desc'},
        take: limit,
        skip: (page - 1) * limit,
    });

    const dataCount = await prisma.order.count({
        where: { userId: session?.user?.id! },
    });

    return {
        data,
        totalPages: Math.ceil(dataCount / limit)
    }
}

type SalesDataType = {
    month: string;
    totalSales: number;
}[]

export async function getOrderSummary(){
    const ordersCount = await prisma.order.count()
    const productsCount = await prisma.product.count()
    const usersCount = await prisma.user.count()

    const totalSales = await prisma.order.aggregate({
        _sum: {totalPrice: true}
    })

    const salesDataRaw = await prisma.$queryRaw<
    Array<{ month: string; totalSales: Prisma.Decimal }>
  >`SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY')`;

    const salesData: SalesDataType = salesDataRaw.map((entry) => ({
        month: entry.month,
        totalSales: Number(entry.totalSales)
    }))

    const latestSales = await prisma.order.findMany({
        orderBy: {createdAt: 'desc'},
        include: {
            user: { select: {name: true}}
        },
        take: 6,
    });

    return {
        ordersCount,
        productsCount,
        usersCount,
        totalSales,
        latestSales,
        salesData,
    }
}