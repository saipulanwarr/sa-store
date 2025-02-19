"use server"

import { auth } from "@/auth"
import { getMyCart } from "./cart.actions";
import { getUserById } from "./user.actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { convertToPlainObject, formatError } from "../utils";
import { insertOrderSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { CartItem } from "@/types";

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