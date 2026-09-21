const Razorpay = require('razorpay');
const crypto = require('crypto');
const Decimal = require('decimal.js');

const prisma = require('../lib/prisma');
const { toNum } = require('../lib/decimal');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  async createRazorpayOrder(orderId) {
    if (!orderId) {
      const err = new Error('orderId is required');
      err.statusCode = 400;
      throw err;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    const orderTotalNum = toNum(order.total);
    const amountInPaise = new Decimal(orderTotalNum).times(100).round().toNumber();

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${order.id.slice(0, 20)}`,
      notes: {
        internalOrderId: order.id,
        userId: order.userId,
      },
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        transactionId: razorpayOrder.id,
        amount: orderTotalNum,
        method: 'CARD',
        status: 'PENDING',
      },
      create: {
        orderId: order.id,
        amount: orderTotalNum,
        currency: 'INR',
        method: 'CARD',
        status: 'PENDING',
        transactionId: razorpayOrder.id,
      },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, internalOrderId }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const err = new Error('Missing Razorpay fields');
      err.statusCode = 400;
      throw err;
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      await prisma.payment.update({
        where: { orderId: internalOrderId },
        data: { status: 'FAILED' },
      }).catch(() => {});

      const err = new Error('Payment verification failed — invalid signature');
      err.statusCode = 400;
      throw err;
    }

    const updatedPayment = await prisma.payment.update({
      where: { orderId: internalOrderId },
      data: {
        status: 'PAID',
        transactionId: razorpay_payment_id,
        paidAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: internalOrderId },
      data: { paymentStatus: 'PAID' },
    });

    return updatedPayment;
  }
}

module.exports = new PaymentService();