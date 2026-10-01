const { OrderStatus, ProductType, Role } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { validateDiscountCodeForUser, getBestAutoDiscount } = require("./discountController");
const { createOneTimeCheckoutSession } = require("../utils/onvoClient");
const { createPlanCore } = require("./installmentController");

const ALLOWED_CART_TYPES = [ProductType.DESCARGABLE, ProductType.PERSONALIZABLE, ProductType.PEDIDO_PERSONALIZADO];

function parsePositiveId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toColonesNumber(value) {
  return Math.round(Number(value || 0));
}

function normalizeAddOnRequests(addOns) {
  if (addOns === undefined || addOns === null) {
    return [];
  }
  if (!Array.isArray(addOns)) {
    return null;
  }

  const quantities = new Map();
  for (const item of addOns) {
    const addOnId = parsePositiveId(item?.addOnId);
    const qty = Number.parseInt(item?.qty, 10);
    if (!addOnId || !Number.isInteger(qty) || qty <= 0) {
      return null;
    }
    quantities.set(addOnId, (quantities.get(addOnId) || 0) + qty);
  }

  return [...quantities.entries()].map(([addOnId, qty]) => ({ addOnId, qty }));
}

function normalizeAnswerRequests(answers) {
  if (answers === undefined || answers === null) {
    return [];
  }
  if (!Array.isArray(answers)) {
    return null;
  }

  const mapped = new Map();
  for (const item of answers) {
    const questionId = parsePositiveId(item?.questionId);
    const answer = String(item?.answer || "").trim();
    if (!questionId) {
      return null;
    }
    mapped.set(questionId, answer);
  }

  return [...mapped.entries()].map(([questionId, answer]) => ({ questionId, answer }));
}

function groupByProductId(records) {
  return records.reduce((acc, record) => {
    const bucket = acc.get(record.productId) || [];
    bucket.push(record);
    acc.set(record.productId, bucket);
    return acc;
  }, new Map());
}

function resolveCartItemCustomizations({ item, product, addOnsByProduct, questionsByProduct }) {
  const requestedAddOns = normalizeAddOnRequests(item.addOns);
  if (!requestedAddOns) {
    return { status: 400, error: "addOns debe ser un arreglo de { addOnId, qty }" };
  }

  const requestedAnswers = normalizeAnswerRequests(item.answers);
  if (!requestedAnswers) {
    return { status: 400, error: "answers debe ser un arreglo de { questionId, answer }" };
  }

  const productAddOns = addOnsByProduct.get(product.id) || [];
  const addOnMap = new Map(productAddOns.map((addOn) => [addOn.id, addOn]));
  const orderAddOns = [];
  let addOnsTotal = 0;

  for (const requested of requestedAddOns) {
    const addOn = addOnMap.get(requested.addOnId);
    if (!addOn) {
      return { status: 400, error: `addOnId ${requested.addOnId} no pertenece a "${product.name}"` };
    }
    if (requested.qty > addOn.maxQty) {
      return { status: 400, error: `La cantidad de "${addOn.name}" no puede superar ${addOn.maxQty}` };
    }

    const unitPriceCRC = toColonesNumber(addOn.price);
    addOnsTotal += unitPriceCRC * requested.qty;
    orderAddOns.push({
      addOnId: addOn.id,
      qty: requested.qty,
      unitPriceCRC
    });
  }

  const productQuestions = questionsByProduct.get(product.id) || [];
  const questionMap = new Map(productQuestions.map((question) => [question.id, question]));
  for (const requested of requestedAnswers) {
    if (!questionMap.has(requested.questionId)) {
      return { status: 400, error: `questionId ${requested.questionId} no pertenece a "${product.name}"` };
    }
  }

  const answerMap = new Map(requestedAnswers.map((answer) => [answer.questionId, answer.answer]));
  const missingRequired = productQuestions.find((question) => (
    question.isRequired && !String(answerMap.get(question.id) || "").trim()
  ));
  if (missingRequired) {
    return { status: 400, error: `Debe responder para "${product.name}": ${missingRequired.question}` };
  }

  return {
    customizations: {
      addOnsTotal,
      orderAddOns,
      orderAnswers: requestedAnswers
    }
  };
}

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyOnvoSignature(req) {
  const secret = process.env.ONVO_WEBHOOK_SECRET;
  const signature = req.get("X-Onvo-Signature");
  const webhookSecret = req.get("X-Webhook-Secret");

  if (!secret) return false;

  if (webhookSecret && constantTimeEquals(webhookSecret, secret)) return true;

  if (!signature || !Buffer.isBuffer(req.body)) return false;

  const hex = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
  const base64 = crypto.createHmac("sha256", secret).update(req.body).digest("base64");
  const candidates = [hex, `sha256=${hex}`, base64, `sha256=${base64}`];
  return candidates.some((c) => constantTimeEquals(c, signature));
}

async function createOnvoCheckoutSession({ cartOrder, description, customerEmail, onBehalfOf }) {
  return createOneTimeCheckoutSession({
    amountCRC: cartOrder.finalAmountCRC,
    description,
    customerEmail,
    onBehalfOf,
    metadata: {
      cartOrderId: String(cartOrder.id),
      clientId: String(cartOrder.clientId),
      type: "CART"
    }
  });
}

async function createCartOrder(req, res, next) {
  try {
    const { items, discountCode } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Se requiere al menos un item" });
    }

    const productIds = items.map((i) => parsePositiveId(i.productId)).filter(Boolean);
    if (productIds.length !== items.length) {
      return res.status(400).json({ error: "Todos los items deben tener un productId válido" });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true }
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const [productAddOns, productQuestions] = await Promise.all([
      prisma.productAddOn.findMany({ where: { productId: { in: productIds } } }),
      prisma.productQuestion.findMany({ where: { productId: { in: productIds } } })
    ]);
    const addOnsByProduct = groupByProductId(productAddOns);
    const questionsByProduct = groupByProductId(productQuestions);

    for (const item of items) {
      const product = productMap.get(parsePositiveId(item.productId));
      if (!product) {
        return res.status(404).json({ error: `Producto ${item.productId} no encontrado o inactivo` });
      }
      if (!ALLOWED_CART_TYPES.includes(product.type)) {
        return res.status(400).json({
          error: `Producto "${product.name}" no es elegible para carrito (tipo ${product.type})`
        });
      }
    }

    let subtotalCRC = 0;
    const orderItems = items.map((item) => {
      const product = productMap.get(parsePositiveId(item.productId));
      const qty = Math.max(1, Number.parseInt(item.qty, 10) || 1);
      const unitPrice = toColonesNumber(product.launchPrice);
      const resolvedCustomizations = resolveCartItemCustomizations({
        item,
        product,
        addOnsByProduct,
        questionsByProduct
      });
      if (resolvedCustomizations.error) {
        return resolvedCustomizations;
      }
      const { addOnsTotal, orderAddOns, orderAnswers } = resolvedCustomizations.customizations;
      subtotalCRC += unitPrice * qty + addOnsTotal;
      return {
        productId: product.id,
        qty,
        unitPriceCRC: unitPrice,
        name: product.name,
        orderAddOns,
        orderAnswers
      };
    });

    const invalidItem = orderItems.find((item) => item.error);
    if (invalidItem) {
      return res.status(invalidItem.status).json({ error: invalidItem.error });
    }

    let discountPct = 0;
    let discountCodeId = null;
    const rawCode = String(discountCode || "").trim();
    if (rawCode) {
      const validation = await validateDiscountCodeForUser(rawCode, req.user.id);
      if (!validation.valid) {
        return res.status(validation.statusCode || 400).json({
          error: validation.reason || "El código no es válido"
        });
      }
      discountPct = Number(validation.discountPct || 0);
      discountCodeId = validation.codeId;
    }

    const autoCart = await getBestAutoDiscount(req.user.id, req.user.role);
    if (autoCart && autoCart.discountPct > discountPct) {
      discountPct = autoCart.discountPct;
      discountCodeId = autoCart.codeId;
    }

    const finalAmountCRC = Math.max(0, Math.round(subtotalCRC * (1 - discountPct / 100)));

    let onBehalfOf = null;
    const providerIds = [...new Set(orderItems.map((i) => productMap.get(i.productId)?.proveedorId).filter(Boolean))];
    if (providerIds.length === 1) {
      const proveedor = await prisma.user.findUnique({
        where: { id: providerIds[0] },
        select: { onvoSubAccountId: true }
      });
      if (proveedor?.onvoSubAccountId) {
        onBehalfOf = proveedor.onvoSubAccountId;
      }
    }

    const cartOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.cartOrder.create({
        data: {
          clientId: req.user.id,
          subtotalCRC,
          discountCodeId,
          discountPct,
          finalAmountCRC,
          status: OrderStatus.PENDING,
          items: {
            create: orderItems.map((oi) => ({
              productId: oi.productId,
              qty: oi.qty,
              unitPriceCRC: oi.unitPriceCRC,
              ...(oi.orderAddOns.length ? {
                orderAddOns: {
                  create: oi.orderAddOns
                }
              } : {}),
              ...(oi.orderAnswers.length ? {
                orderAnswers: {
                  create: oi.orderAnswers
                }
              } : {})
            }))
          }
        },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } }
        }
      });
      return created;
    });

    const itemNames = orderItems.map((i) => i.name).join(", ");
    const description = `Enyell — Carrito: ${itemNames}`.slice(0, 200);

    const requestedInstallments = Number(req.body?.numberOfInstallments || 0);
    const ALLOWED_INSTALLMENTS = [2, 3, 4, 6];

    if (requestedInstallments && ALLOWED_INSTALLMENTS.includes(requestedInstallments)) {
      try {
        const plan = await createPlanCore({
          clientId: req.user.id,
          description,
          totalAmountCRC: finalAmountCRC,
          numberOfInstallments: requestedInstallments,
          startDate: new Date(),
          cartOrderId: cartOrder.id
        });

        const firstInstallment = plan.installments[0];
        const session = await createOneTimeCheckoutSession({
          amountCRC: firstInstallment.amountCRC,
          description: `${description} - Cuota 1/${requestedInstallments}`,
          customerEmail: req.user.email,
          metadata: {
            installmentId: String(firstInstallment.id),
            installmentPlanId: String(plan.id),
            clientId: String(req.user.id),
            type: "INSTALLMENT"
          }
        });

        await prisma.installment.update({
          where: { id: firstInstallment.id },
          data: {
            paymentIntentId: session.paymentIntentId || null,
            checkoutUrl: session.url
          }
        });

        return res.status(201).json({
          cartOrderId: cartOrder.id,
          installmentPlanId: plan.id,
          numberOfInstallments: requestedInstallments,
          firstInstallmentAmount: firstInstallment.amountCRC,
          paymentUrl: session.url,
          finalAmountCRC,
          items: cartOrder.items.map((i) => ({
            productId: i.productId,
            name: i.product.name,
            qty: i.qty,
            unitPriceCRC: i.unitPriceCRC
          }))
        });
      } catch (installmentError) {
        await prisma.cartOrder.update({
          where: { id: cartOrder.id },
          data: { status: OrderStatus.FAILED }
        });
        throw installmentError;
      }
    }

    let checkoutSession;
    try {
      checkoutSession = await createOnvoCheckoutSession({
        cartOrder,
        description,
        customerEmail: req.user.email,
        onBehalfOf
      });

      await prisma.cartOrder.update({
        where: { id: cartOrder.id },
        data: { paymentIntentId: checkoutSession.paymentIntentId || null }
      });
    } catch (onvoError) {
      await prisma.cartOrder.update({
        where: { id: cartOrder.id },
        data: { status: OrderStatus.FAILED }
      });
      throw onvoError;
    }

    return res.status(201).json({
      cartOrderId: cartOrder.id,
      paymentUrl: checkoutSession.url,
      finalAmountCRC,
      items: cartOrder.items.map((i) => ({
        productId: i.productId,
        name: i.product.name,
        qty: i.qty,
        unitPriceCRC: i.unitPriceCRC
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function getCartOrder(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const cartOrder = await prisma.cartOrder.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        client: { select: { id: true, name: true, email: true } }
      }
    });

    if (!cartOrder) {
      return res.status(404).json({ error: "Orden de carrito no encontrada" });
    }

    if (req.user.role !== Role.ADMIN && cartOrder.clientId !== req.user.id) {
      return res.status(403).json({ error: "No tienes permiso para ver esta orden" });
    }

    return res.json(cartOrder);
  } catch (error) {
    return next(error);
  }
}

async function handleCartWebhook(req, res) {
  if (!verifyOnvoSignature(req)) {
    return res.status(401).json({ error: "Firma inválida" });
  }

  let payload;
  try {
    payload = Buffer.isBuffer(req.body)
      ? JSON.parse(req.body.toString("utf8"))
      : null;
  } catch (_e) {
    payload = null;
  }

  if (!payload) {
    return res.status(400).json({ error: "Payload inválido" });
  }

  try {
    const metadata = payload?.data?.metadata || payload?.metadata || {};
    const cartOrderId = parsePositiveId(metadata.cartOrderId);
    const paymentIntentId = payload?.data?.id || payload?.data?.paymentIntentId;

    let cartOrder = null;
    if (paymentIntentId) {
      cartOrder = await prisma.cartOrder.findUnique({
        where: { paymentIntentId: String(paymentIntentId) },
        include: { items: { include: { product: true } } }
      });
    }
    if (!cartOrder && cartOrderId) {
      cartOrder = await prisma.cartOrder.findUnique({
        where: { id: cartOrderId },
        include: { items: { include: { product: true } } }
      });
    }

    if (!cartOrder) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const eventType = payload.type || payload.event;

    if (
      eventType === "payment-intent.succeeded" ||
      eventType === "payment_intent.succeeded" ||
      eventType === "checkout-session.succeeded"
    ) {
      if (cartOrder.status !== OrderStatus.PAID) {
        await prisma.$transaction(async (tx) => {
          await tx.cartOrder.update({
            where: { id: cartOrder.id },
            data: { status: OrderStatus.PAID, paidAt: new Date() }
          });

          for (const item of cartOrder.items) {
            if (item.product.type === ProductType.DESCARGABLE) {
              const downloadFile = await tx.productDownloadFile.findUnique({
                where: { productId: item.productId },
                select: { id: true }
              });
              if (downloadFile) {
                await tx.clientDownload.upsert({
                  where: {
                    clientId_downloadFileId: {
                      clientId: cartOrder.clientId,
                      downloadFileId: downloadFile.id
                    }
                  },
                  update: { productId: item.productId, cartOrderId: cartOrder.id },
                  create: {
                    clientId: cartOrder.clientId,
                    productId: item.productId,
                    downloadFileId: downloadFile.id,
                    cartOrderId: cartOrder.id
                  }
                });
              }
            }
          }

          if (cartOrder.discountCodeId) {
            const existingUsage = await tx.discountUsage.findUnique({
              where: {
                codeId_userId: {
                  codeId: cartOrder.discountCodeId,
                  userId: cartOrder.clientId
                }
              },
              select: { id: true }
            });

            if (!existingUsage) {
              await tx.discountUsage.create({
                data: {
                  codeId: cartOrder.discountCodeId,
                  userId: cartOrder.clientId
                }
              });
              await tx.discountCode.update({
                where: { id: cartOrder.discountCodeId },
                data: { usedCount: { increment: 1 } }
              });
            }
          }

          for (const item of cartOrder.items) {
            if (item.product.proveedorId) {
              const totalSale = item.unitPriceCRC * item.qty;
              const comisionUtil = item.product.comisionUtil || 0;
              const porcentajeHacienda = item.product.porcentajeHacienda || 0;
              const amountUtil = Math.round(totalSale * (comisionUtil / 100));
              const amountTax = Math.round(totalSale * (porcentajeHacienda / 100));
              const amountProvider = totalSale - amountUtil - amountTax;
              const proveedorUser = await tx.user.findUnique({
                where: { id: item.product.proveedorId },
                select: { onvoSubAccountId: true }
              });
              const hasOnvo = Boolean(proveedorUser?.onvoSubAccountId);
              await tx.providerPayout.create({
                data: {
                  proveedorId: item.product.proveedorId,
                  cartOrderId: cartOrder.id,
                  productId: item.productId,
                  totalSale,
                  comisionUtil,
                  porcentajeHacienda,
                  amountUtil,
                  amountTax,
                  amountProvider,
                  method: hasOnvo ? "ONVO_SPLIT" : "MANUAL",
                  status: hasOnvo ? "PAID" : "PENDING"
                }
              });
            }
          }
        });
      }
    } else if (
      eventType === "payment-intent.failed" ||
      eventType === "payment_intent.failed"
    ) {
      if (cartOrder.status !== OrderStatus.PAID) {
        await prisma.cartOrder.update({
          where: { id: cartOrder.id },
          data: { status: OrderStatus.FAILED }
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Cart webhook failed:", error);
    return res.status(200).json({ received: true, error: "processing_failed" });
  }
}

async function listAdminCartOrders(req, res, next) {
  try {
    const cartOrders = await prisma.cartOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        items: { include: { product: { select: { id: true, name: true, type: true } } } }
      }
    });

    return res.json(cartOrders);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCartOrder,
  getCartOrder,
  handleCartWebhook,
  listAdminCartOrders
};
