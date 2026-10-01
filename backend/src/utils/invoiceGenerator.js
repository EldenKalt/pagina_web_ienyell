const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const sharp = require("sharp");

async function generateInvoicePDFBuffer(order) {
  const absoluteLogoPath = path.resolve(__dirname, "../../../assets/logotipo_ienyell.svg");
  let logoBuffer = null;
  try {
    if (fs.existsSync(absoluteLogoPath)) {
      const logoSvgBuffer = fs.readFileSync(absoluteLogoPath);
      logoBuffer = await sharp(logoSvgBuffer)
        .resize({ height: 50 })
        .png()
        .toBuffer();
    }
  } catch (err) {
    console.error("No se pudo cargar el logo de la factura:", err);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      if (logoBuffer) {
        doc.image(logoBuffer, 50, 40, { height: 50 });
      }

      // Draw header
      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor("#003366")
        .text("FACTURA DE COMPRA", 180, 42, { align: "right" });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#1F1F1E")
        .text(`Factura N°: FAC-ORD-${order.id}`, 180, 70, { align: "right" })
        .text(`Fecha de pago: ${new Date(order.paidAt || new Date()).toLocaleDateString("es-CR")}`, 180, 85, { align: "right" });

      doc.moveDown(4);

      // Divider line
      doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, 120).lineTo(545, 120).stroke();

      // Issuer & Client info
      const yInfo = 135;
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#003366")
        .text("EMISOR", 50, yInfo)
        .text("CLIENTE", 300, yInfo);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#1F1F1E")
        .text("Enyell — Illustration & Design", 50, yInfo + 18)
        .text(process.env.ADMIN_EMAIL || "contacto@ienyell.com", 50, yInfo + 32)
        .text(process.env.WHATSAPP_NUMBER ? `+${process.env.WHATSAPP_NUMBER}` : "", 50, yInfo + 46)
        .text("Costa Rica", 50, yInfo + 60);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#1F1F1E")
        .text(order.client.name, 300, yInfo + 18)
        .text(order.client.email, 300, yInfo + 32)
        .text(order.client.company || "Sin empresa", 300, yInfo + 46);

      doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, 220).lineTo(545, 220).stroke();

      // Description, Qty, Total
      let yTable = 240;
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#003366")
        .text("DESCRIPCIÓN", 50, yTable)
        .text("CANTIDAD", 350, yTable, { width: 80, align: "center" })
        .text("TOTAL", 450, yTable, { width: 95, align: "right" });

      doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, yTable + 18).lineTo(545, yTable + 18).stroke();

      // Item detail line
      yTable += 28;
      let itemDesc = "Servicio contratado";
      if (order.type === "HOURS" && order.hourBooking) {
        const hours = order.hourBooking.hours;
        const categories = order.hourBooking.selectedCategories || order.hourBooking.serviceCategory?.name || "Servicios generales";
        itemDesc = `Bolsa de horas de trabajo: ${hours} horas\nServicios: ${categories}`;
      } else if (order.type === "PRODUCT" && order.product) {
        itemDesc = `Paquete contratado: ${order.product.name}`;
      }

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#1F1F1E")
        .text(itemDesc, 50, yTable, { width: 280 })
        .text("1", 350, yTable, { width: 80, align: "center" })
        .text(`₡${new Intl.NumberFormat("es-CR").format(order.amountCRC / 100)}`, 450, yTable, { width: 95, align: "right" });

      doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, yTable + 40).lineTo(545, yTable + 40).stroke();

      // Calculations and totals
      let yTotals = yTable + 55;
      const subtotalVal = order.amountCRC / 100;
      const discountVal = (order.amountCRC - order.finalAmountCRC) / 100;
      const totalVal = order.finalAmountCRC / 100;

      doc
        .font("Helvetica")
        .fontSize(10)
        .text("Subtotal:", 350, yTotals, { width: 100, align: "right" })
        .text(`₡${new Intl.NumberFormat("es-CR").format(subtotalVal)}`, 450, yTotals, { width: 95, align: "right" });

      if (discountVal > 0) {
        yTotals += 18;
        doc
          .text(`Descuento (-${order.discountPct}%):`, 350, yTotals, { width: 100, align: "right" })
          .text(`-₡${new Intl.NumberFormat("es-CR").format(discountVal)}`, 450, yTotals, { width: 95, align: "right" });
      }

      yTotals += 22;
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#003366")
        .text("Total pagado:", 350, yTotals, { width: 100, align: "right" })
        .text(`₡${new Intl.NumberFormat("es-CR").format(totalVal)}`, 450, yTotals, { width: 95, align: "right" });

      // Legal processing confirmation
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#059669")
        .text("✓ Pago procesado exitosamente por OnvoPay", 50, 680, { align: "center", width: 495 });

      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#6B7280")
        .text(
          "El cliente declaró haber leído y aceptado expresamente los Términos y Condiciones y la Política de Privacidad de Enyell al momento de confirmar este pago.",
          50,
          700,
          { align: "center", width: 495 }
        );

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#4B5563")
        .text("Gracias por su preferencia · ienyell.com", 50, 750, { align: "center", width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDFBuffer };
