const {
  ContractStatus,
  CreditSource,
  NotifType,
  OrderStatus,
  OrderType,
  ProductType,
  Role
} = require("@prisma/client");
const prisma = require("../lib/prisma");
const { validateDiscountCodeForUser, getBestAutoDiscount } = require("./discountController");
const { confirmReferralIfExists } = require("./referralController");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { createNotification } = require("../utils/notificationHelper");
const { generateInvoicePDFBuffer } = require("../utils/invoiceGenerator");
const { createOneTimeCheckoutSession, verifyWebhookSignature, parseWebhookBody } = require("../utils/onvoClient");
const { handleInstallmentPayment, createPlanCore } = require("./installmentController");

function parsePositiveId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toColonesNumber(value) {
  return Math.round(Number(value || 0));
}

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function safeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

async function resolveProductCustomizations({ productId, addOns, answers }) {
  const requestedAddOns = normalizeAddOnRequests(addOns);
  if (!requestedAddOns) {
    return { status: 400, error: "addOns debe ser un arreglo de { addOnId, qty }" };
  }

  const requestedAnswers = normalizeAnswerRequests(answers);
  if (!requestedAnswers) {
    return { status: 400, error: "answers debe ser un arreglo de { questionId, answer }" };
  }

  const [productAddOns, productQuestions] = await Promise.all([
    prisma.productAddOn.findMany({ where: { productId } }),
    prisma.productQuestion.findMany({ where: { productId } })
  ]);

  const addOnMap = new Map(productAddOns.map((addOn) => [addOn.id, addOn]));
  const orderAddOns = [];
  let addOnsTotal = 0;

  for (const requested of requestedAddOns) {
    const addOn = addOnMap.get(requested.addOnId);
    if (!addOn) {
      return { status: 400, error: `addOnId ${requested.addOnId} no pertenece al producto` };
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

  const questionMap = new Map(productQuestions.map((question) => [question.id, question]));
  for (const requested of requestedAnswers) {
    if (!questionMap.has(requested.questionId)) {
      return { status: 400, error: `questionId ${requested.questionId} no pertenece al producto` };
    }
  }

  const answerMap = new Map(requestedAnswers.map((answer) => [answer.questionId, answer.answer]));
  const missingRequired = productQuestions.find((question) => (
    question.isRequired && !String(answerMap.get(question.id) || "").trim()
  ));
  if (missingRequired) {
    return { status: 400, error: `Debe responder: ${missingRequired.question}` };
  }

  return {
    customizations: {
      addOnsTotal,
      orderAddOns,
      orderAnswers: requestedAnswers
    }
  };
}

const verifyOnvoSignature = verifyWebhookSignature;

function serializeOrder(order) {
  return {
    id: order.id,
    clientId: order.clientId,
    type: order.type,
    productId: order.productId,
    hourBookingId: order.hourBookingId,
    amountCRC: order.amountCRC,
    discountPct: order.discountPct,
    discountCodeId: order.discountCodeId,
    finalAmountCRC: order.finalAmountCRC,
    status: order.status,
    paymentIntentId: order.paymentIntentId,
    paidAt: order.paidAt,
    createdAt: order.createdAt
  };
}

async function resolveCheckoutItem({ type, productId, hourBookingId, clientId }) {
  if (type === OrderType.PRODUCT) {
    const parsedProductId = parsePositiveId(productId);
    if (!parsedProductId) {
      return { status: 400, error: "productId es requerido" };
    }

    const product = await prisma.product.findFirst({
      where: {
        id: parsedProductId,
        isActive: true
      },
      include: {
        proveedor: { select: { id: true, onvoSubAccountId: true } }
      }
    });
    if (!product) {
      return { status: 404, error: "Producto no encontrado o inactivo" };
    }

    return {
      item: {
        type,
        product,
        baseAmount: toColonesNumber(product.launchPrice),
        description: `Enyell — ${product.name}`
      }
    };
  }

  return { status: 400, error: "type debe ser PRODUCT" };
}

async function persistPendingOrder({
  clientId,
  type,
  item,
  amountCRC,
  discountPct,
  discountCodeId,
  finalAmountCRC,
  orderAddOns = [],
  orderAnswers = [],
  acceptedTerms,
  acceptedTermsAt,
  acceptedTermsIp,
  acceptedTermsUserAgent
}) {
  if (item.existingOrder) {
    if (item.existingOrder.status === OrderStatus.PAID) {
      const error = new Error("Esta reserva ya fue pagada");
      error.status = 409;
      throw error;
    }

    return prisma.order.update({
      where: { id: item.existingOrder.id },
      data: {
        amountCRC,
        discountPct,
        discountCodeId,
        finalAmountCRC,
        status: OrderStatus.PENDING,
        paymentIntentId: null,
        paidAt: null,
        acceptedTerms,
        acceptedTermsAt,
        acceptedTermsIp,
        acceptedTermsUserAgent
      }
    });
  }

  return prisma.order.create({
    data: {
      clientId,
      type,
      productId: item.product?.id || null,
      hourBookingId: item.booking?.id || null,
      amountCRC,
      discountPct,
      discountCodeId,
      finalAmountCRC,
      status: OrderStatus.PENDING,
      acceptedTerms,
      acceptedTermsAt,
      acceptedTermsIp,
      acceptedTermsUserAgent,
      ...(orderAddOns.length ? {
        orderAddOns: {
          create: orderAddOns
        }
      } : {}),
      ...(orderAnswers.length ? {
        orderAnswers: {
          create: orderAnswers
        }
      } : {})
    }
  });
}

async function createOnvoCheckoutSession({ order, description, customerEmail, onBehalfOf }) {
  return createOneTimeCheckoutSession({
    amountCRC: order.finalAmountCRC,
    description,
    customerEmail,
    onBehalfOf,
    metadata: {
      orderId: String(order.id),
      clientId: String(order.clientId),
      type: order.type
    }
  });
}

async function createIntent(req, res, next) {
  try {
    if (req.user.role !== Role.CLIENT) {
      return res.status(403).json({ error: "Solo clientes pueden iniciar checkout" });
    }

    const acceptedTerms = Boolean(req.body?.acceptedTerms);
    if (!acceptedTerms) {
      return res.status(400).json({ error: "Debe leer y aceptar los Términos y Condiciones y la Política de Privacidad de Enyell antes de realizar el pago." });
    }

    const type = String(req.body?.type || "").trim().toUpperCase();
    const resolved = await resolveCheckoutItem({
      type,
      productId: req.body?.productId,
      hourBookingId: req.body?.hourBookingId,
      clientId: req.user.id
    });
    if (resolved.error) {
      return res.status(resolved.status).json({ error: resolved.error });
    }

    let customizations = { addOnsTotal: 0, orderAddOns: [], orderAnswers: [] };
    const hasAddOns = Array.isArray(req.body?.addOns) && req.body.addOns.length > 0;
    const hasAnswers = Array.isArray(req.body?.answers) && req.body.answers.length > 0;
    if ((hasAddOns || hasAnswers) && !resolved.item.product) {
      return res.status(400).json({ error: "addOns y answers solo aplican a productos" });
    }
    if (resolved.item.product) {
      const resolvedCustomizations = await resolveProductCustomizations({
        productId: resolved.item.product.id,
        addOns: req.body?.addOns,
        answers: req.body?.answers
      });
      if (resolvedCustomizations.error) {
        return res.status(resolvedCustomizations.status).json({ error: resolvedCustomizations.error });
      }
      customizations = resolvedCustomizations.customizations;
    }

    let discountPct = Number(resolved.item.presetDiscountPct || 0);
    let discountCodeId = resolved.item.presetDiscountCodeId || null;
    const requestedCode = String(req.body?.discountCode || "").trim();
    if (requestedCode) {
      if (discountCodeId) {
        return res.status(400).json({ error: "Esta reserva ya tiene un código de descuento aplicado" });
      }
      const validation = await validateDiscountCodeForUser(requestedCode, req.user.id);
      if (!validation.valid) {
        return res.status(validation.statusCode || 400).json({
          error: validation.reason || "El código no es válido"
        });
      }
      discountPct = Number(validation.discountPct || 0);
      discountCodeId = validation.codeId;
    }

    const auto = await getBestAutoDiscount(req.user.id, req.user.role);
    if (auto && auto.discountPct > discountPct) {
      discountPct = auto.discountPct;
      discountCodeId = auto.codeId;
    }

    const amountCRC = toCents(resolved.item.baseAmount + customizations.addOnsTotal);
    const finalAmountCRC = resolved.item.presetFinalAmount !== undefined && !requestedCode && !auto
      ? toCents(resolved.item.presetFinalAmount)
      : Math.max(0, Math.round(amountCRC * (1 - discountPct / 100)));

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers["user-agent"] || null;

    const order = await persistPendingOrder({
      clientId: req.user.id,
      type,
      item: resolved.item,
      amountCRC,
      discountPct,
      discountCodeId,
      finalAmountCRC,
      orderAddOns: customizations.orderAddOns,
      orderAnswers: customizations.orderAnswers,
      acceptedTerms: true,
      acceptedTermsAt: new Date(),
      acceptedTermsIp: ip,
      acceptedTermsUserAgent: userAgent
    });

    const requestedInstallments = Number(req.body?.numberOfInstallments || 0);
    const ALLOWED_INSTALLMENTS = [2, 3, 4, 6];

    if (requestedInstallments && ALLOWED_INSTALLMENTS.includes(requestedInstallments)) {
      try {
        const plan = await createPlanCore({
          clientId: req.user.id,
          description: resolved.item.description,
          totalAmountCRC: finalAmountCRC,
          numberOfInstallments: requestedInstallments,
          startDate: new Date(),
          orderId: order.id
        });

        const firstInstallment = plan.installments[0];
        const session = await createOneTimeCheckoutSession({
          amountCRC: firstInstallment.amountCRC,
          description: `${resolved.item.description} - Cuota 1/${requestedInstallments}`,
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
          orderId: order.id,
          installmentPlanId: plan.id,
          numberOfInstallments: requestedInstallments,
          firstInstallmentAmount: firstInstallment.amountCRC,
          amount: finalAmountCRC,
          onvoCheckoutUrl: session.url,
          order: serializeOrder(order)
        });
      } catch (installmentError) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.FAILED }
        });
        throw installmentError;
      }
    }

    let onBehalfOf = null;
    if (resolved.item.product?.proveedorId) {
      const proveedor = await prisma.user.findUnique({
        where: { id: resolved.item.product.proveedorId },
        select: { onvoSubAccountId: true }
      });
      if (proveedor?.onvoSubAccountId) {
        onBehalfOf = proveedor.onvoSubAccountId;
      }
    }

    try {
      const checkoutSession = await createOnvoCheckoutSession({
        order,
        description: resolved.item.description,
        customerEmail: req.user.email,
        onBehalfOf
      });
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { paymentIntentId: checkoutSession.paymentIntentId || null }
      });

      return res.status(201).json({
        paymentIntentId: checkoutSession.paymentIntentId || null,
        checkoutSessionId: checkoutSession.id,
        orderId: updated.id,
        amount: updated.finalAmountCRC,
        checkoutUrl: `/checkout?orderId=${updated.id}`,
        onvoCheckoutUrl: checkoutSession.url,
        order: serializeOrder(updated)
      });
    } catch (onvoError) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED }
      });
      throw onvoError;
    }
  } catch (error) {
    return next(error);
  }
}


function orderIdFromReference(reference) {
  const match = String(reference || "").match(/^order_(\d+)$/);
  return match ? parsePositiveId(match[1]) : null;
}

function orderIdFromMetadata(payload) {
  const metadata = payload?.data?.metadata || payload?.metadata || null;
  return parsePositiveId(metadata?.orderId);
}

async function findWebhookOrder(payload) {
  const paymentIntentIds = [
    payload?.data?.id,
    payload?.data?.paymentIntentId
  ].filter(Boolean).map((value) => String(value));
  const referenceOrderId = orderIdFromReference(payload?.data?.reference);
  const metadataOrderId = orderIdFromMetadata(payload);

  for (const paymentIntentId of paymentIntentIds) {
    const order = await prisma.order.findUnique({
      where: { paymentIntentId },
      include: {
        client: true,
        product: true,
        hourBooking: true
      }
    });
    if (order) {
      return order;
    }
  }

  if (referenceOrderId || metadataOrderId) {
    return prisma.order.findUnique({
      where: { id: referenceOrderId || metadataOrderId },
      include: {
        client: true,
        product: true,
        hourBooking: true
      }
    });
  }

  return null;
}

async function findWebhookInstallment(payload) {
  const paymentIntentIds = [
    payload?.data?.id,
    payload?.data?.paymentIntentId
  ].filter(Boolean).map((value) => String(value));

  for (const paymentIntentId of paymentIntentIds) {
    const installment = await prisma.installment.findUnique({
      where: { paymentIntentId },
      include: { installmentPlan: true }
    });
    if (installment) {
      return installment;
    }
  }

  const metadata = payload?.data?.metadata || payload?.metadata || null;
  const installmentId = parsePositiveId(metadata?.installmentId);
  if (installmentId) {
    return prisma.installment.findUnique({
      where: { id: installmentId },
      include: { installmentPlan: true }
    });
  }

  return null;
}

async function applySuccessfulPayment(order) {
  if (order.status === OrderStatus.PAID) {
    return { order, alreadyPaid: true };
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        product: true,
        hourBooking: true
      }
    });

    if (!current || current.status === OrderStatus.PAID) {
      return current;
    }

    if (current.type === OrderType.PRODUCT && current.productId) {
      const existing = await tx.clientProduct.findFirst({
        where: {
          clientId: current.clientId,
          productId: current.productId,
          status: ContractStatus.ACTIVE
        },
        select: { id: true }
      });

      if (!existing) {
        const clientProduct = await tx.clientProduct.create({
          data: {
            clientId: current.clientId,
            productId: current.productId,
            status: ContractStatus.ACTIVE,
            startDate: new Date(),
            price: current.finalAmountCRC / 100
          }
        });

        if (current.product?.revisionEnabled) {
          await tx.revisionTracker.create({
            data: {
              clientProductId: clientProduct.id,
              totalAllowed: current.product.includedRevisions || 0
            }
          });
        }
      }

      // Auto-grant download access for DESCARGABLE products
      if (current.product?.type === ProductType.DESCARGABLE) {
        const downloadFile = await tx.productDownloadFile.findUnique({
          where: { productId: current.productId },
          select: { id: true }
        });
        if (downloadFile) {
          await tx.clientDownload.upsert({
            where: {
              clientId_downloadFileId: {
                clientId: current.clientId,
                downloadFileId: downloadFile.id
              }
            },
            update: { productId: current.productId, orderId: current.id },
            create: {
              clientId: current.clientId,
              productId: current.productId,
              downloadFileId: downloadFile.id,
              orderId: current.id
            }
          });
        }
      }
    }

    if (current.discountCodeId) {
      const existingUsage = await tx.discountUsage.findUnique({
        where: {
          codeId_userId: {
            codeId: current.discountCodeId,
            userId: current.clientId
          }
        },
        select: { id: true }
      });

      if (!existingUsage) {
        await tx.discountUsage.create({
          data: {
            codeId: current.discountCodeId,
            userId: current.clientId
          }
        });
        await tx.discountCode.update({
          where: { id: current.discountCodeId },
          data: {
            usedCount: {
              increment: 1
            }
          }
        });
      }
    }

    const paidOrder = await tx.order.update({
      where: { id: current.id },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date()
      },
      include: {
        client: true,
        product: true,
        hourBooking: true
      }
    });

    if (current.type === OrderType.PRODUCT && current.productId) {
      const productWithProvider = await tx.product.findUnique({
        where: { id: current.productId },
        select: {
          proveedorId: true,
          comisionUtil: true,
          porcentajeHacienda: true,
          proveedor: { select: { onvoSubAccountId: true } }
        }
      });
      if (productWithProvider?.proveedorId) {
        const totalSale = current.finalAmountCRC;
        const comisionUtil = productWithProvider.comisionUtil || 0;
        const porcentajeHacienda = productWithProvider.porcentajeHacienda || 0;
        const amountUtil = Math.round(totalSale * (comisionUtil / 100));
        const amountTax = Math.round(totalSale * (porcentajeHacienda / 100));
        const amountProvider = totalSale - amountUtil - amountTax;
        const hasOnvo = Boolean(productWithProvider.proveedor?.onvoSubAccountId);
        await tx.providerPayout.create({
          data: {
            proveedorId: productWithProvider.proveedorId,
            orderId: current.id,
            productId: current.productId,
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

    return paidOrder;
  });

  if (!updatedOrder || updatedOrder.status !== OrderStatus.PAID) {
    return { order: updatedOrder, alreadyPaid: true };
  }

  await confirmReferralIfExists(updatedOrder.clientId);

  const itemLabel = updatedOrder.product?.name || "servicio";

  await createNotification(updatedOrder.clientId, {
    title: "Pago confirmado",
    body: `¡Pago confirmado! Tu ${itemLabel} está activo.`,
    type: NotifType.STATUS_CHANGE,
    linkUrl: "/dashboard/products",
    metadata: {
      orderId: updatedOrder.id,
      type: updatedOrder.type
    }
  });

  if (updatedOrder.client?.email) {
    let clientAttachments = [];
    try {
      const invoiceBuffer = await generateInvoicePDFBuffer(updatedOrder);
      clientAttachments.push({
        filename: `factura-ienyell-ORD-${updatedOrder.id}.pdf`,
        content: invoiceBuffer
      });
    } catch (invoiceErr) {
      console.error("Error al generar factura PDF para el cliente:", invoiceErr);
    }

    await sendEmail({
      to: updatedOrder.client.email,
      subject: "Tu Factura de Enyell - Pago Confirmado",
      html: renderEmailLayout({
        title: "Pago confirmado",
        contentHtml: `
          <p>Hola ${safeText(updatedOrder.client.name)},</p>
          <p>Confirmamos el pago de tu ${safeText(itemLabel)} y hemos adjuntado tu factura en PDF a este correo.</p>
          <p><strong>Monto:</strong> ₡${new Intl.NumberFormat("es-CR").format(updatedOrder.finalAmountCRC / 100)}</p>
          <p>Ya podés ver el estado y comenzar a utilizar tu servicio desde tu dashboard.</p>
        `
      }),
      attachments: clientAttachments
    });
  }

  // Enviar Comprobante de Aceptación Legal al Administrador
  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `[Comprobante Legal] Aceptación de Términos y Contratación - ORD-${updatedOrder.id}`,
      html: renderEmailLayout({
        title: "Comprobante de Consentimiento Legal",
        contentHtml: `
          <p>Se ha registrado un pago exitoso. A continuación se detallan los datos de aceptación legal y facturación:</p>
          <hr style="border:0; border-top:1px solid #E5E7EB; margin:16px 0;" />
          <ul style="list-style:none; padding:0; margin:0; line-height:1.8;">
            <li><strong>Cliente:</strong> ${safeText(updatedOrder.client.name)} (${safeText(updatedOrder.client.email)})</li>
            <li><strong>Empresa:</strong> ${safeText(updatedOrder.client.company || "Sin empresa")}</li>
            <li><strong>Servicio/Producto:</strong> ${safeText(itemLabel)}</li>
            <li><strong>Monto pagado:</strong> ₡${new Intl.NumberFormat("es-CR").format(updatedOrder.finalAmountCRC / 100)}</li>
            <li><strong>Fecha/Hora de aceptación:</strong> ${updatedOrder.acceptedTermsAt ? new Date(updatedOrder.acceptedTermsAt).toLocaleString("es-CR") : new Date().toLocaleString("es-CR")}</li>
            <li><strong>Dirección IP del cliente:</strong> ${safeText(updatedOrder.acceptedTermsIp || "No registrada")}</li>
            <li><strong>Navegador (User Agent):</strong> ${safeText(updatedOrder.acceptedTermsUserAgent || "No registrado")}</li>
            <li><strong>Identificador de Pedido:</strong> ORD-${updatedOrder.id}</li>
          </ul>
        `
      })
    });
  } catch (adminEmailErr) {
    console.error("Error al enviar comprobante de aceptación al admin:", adminEmailErr);
  }

  return { order: updatedOrder, alreadyPaid: false };
}

async function applyFailedPayment(order) {
  if (order.status === OrderStatus.PAID) {
    return order;
  }

  return prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.FAILED }
  });
}

async function handleWebhook(req, res) {
  if (!verifyOnvoSignature(req)) {
    return res.status(401).json({ error: "Firma inválida" });
  }

  const payload = parseWebhookBody(req.body);
  if (!payload) {
    return res.status(400).json({ error: "Payload inválido" });
  }

  try {
    const eventType = payload.type || payload.event;
    const isSuccess = eventType === "payment-intent.succeeded" || eventType === "payment_intent.succeeded" || eventType === "checkout-session.succeeded";
    const isFailed = eventType === "payment-intent.failed" || eventType === "payment_intent.failed";

    const installment = await findWebhookInstallment(payload);
    if (installment) {
      if (isSuccess) {
        await handleInstallmentPayment(installment);
        const onvoCustomerId = payload?.data?.customerId || payload?.data?.customer?.id || null;
        const onvoPaymentMethodId = payload?.data?.paymentMethodId || payload?.data?.payment_method?.id || null;
        if (installment.installmentPlan?.clientId) {
          const updateData = {};
          if (onvoCustomerId) updateData.onvoCustomerId = String(onvoCustomerId);
          if (onvoPaymentMethodId) updateData.onvoPaymentMethodId = String(onvoPaymentMethodId);
          if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
              where: { id: installment.installmentPlan.clientId },
              data: updateData
            }).catch(() => {});
          }
        }
      } else if (isFailed) {
        console.warn(`Installment payment failed: installment=${installment.id} plan=${installment.installmentPlanId}`);
      }
      return res.status(200).json({ received: true });
    }

    const order = await findWebhookOrder(payload);
    if (!order) {
      return res.status(200).json({ received: true, ignored: true });
    }

    if (isSuccess) {
      await applySuccessfulPayment(order);
      const custId = payload?.data?.customerId || payload?.data?.customer?.id || null;
      const pmId = payload?.data?.paymentMethodId || payload?.data?.payment_method?.id || null;
      if (order.clientId && (custId || pmId)) {
        const upd = {};
        if (custId) upd.onvoCustomerId = String(custId);
        if (pmId) upd.onvoPaymentMethodId = String(pmId);
        await prisma.user.update({ where: { id: order.clientId }, data: upd }).catch(() => {});
      }
    } else if (isFailed) {
      await applyFailedPayment(order);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Onvo webhook failed:", error);
    return res.status(200).json({ received: true, error: "processing_failed" });
  }
}

async function previewIntent(req, res, next) {
  try {
    if (req.user.role !== Role.CLIENT) {
      return res.status(403).json({ error: "Solo clientes pueden previsualizar el checkout" });
    }

    const type = String(req.query?.type || "").trim().toUpperCase();
    const resolved = await resolveCheckoutItem({
      type,
      productId: req.query?.productId,
      hourBookingId: req.query?.hourBookingId,
      clientId: req.user.id
    });
    if (resolved.error) {
      return res.status(resolved.status).json({ error: resolved.error });
    }

    let discountPct = Number(resolved.item.presetDiscountPct || 0);
    let discountCodeId = resolved.item.presetDiscountCodeId || null;
    const requestedCode = String(req.query?.discountCode || "").trim();
    if (requestedCode) {
      if (discountCodeId) {
        return res.status(400).json({ error: "Esta reserva ya tiene un código de descuento aplicado" });
      }
      const validation = await validateDiscountCodeForUser(requestedCode, req.user.id);
      if (!validation.valid) {
        return res.status(validation.statusCode || 400).json({
          error: validation.reason || "El código no es válido"
        });
      }
      discountPct = Number(validation.discountPct || 0);
      discountCodeId = validation.codeId;
    }

    const autoPreview = await getBestAutoDiscount(req.user.id, req.user.role);
    if (autoPreview && autoPreview.discountPct > discountPct) {
      discountPct = autoPreview.discountPct;
      discountCodeId = autoPreview.codeId;
    }

    const amountCRC = resolved.item.baseAmount;
    const finalAmountCRC = resolved.item.presetFinalAmount !== undefined && !requestedCode && !autoPreview
      ? resolved.item.presetFinalAmount
      : Math.max(0, Math.round(amountCRC * (1 - discountPct / 100)));

    return res.json({
      description: resolved.item.description,
      amount: amountCRC,
      finalAmount: finalAmountCRC,
      discountPct,
      autoAppliedCode: autoPreview && autoPreview.discountPct >= discountPct ? autoPreview.code : undefined,
      type
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createIntent,
  previewIntent,
  handleWebhook
};
