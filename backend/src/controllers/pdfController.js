const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const sharp = require("sharp");
const { ProjectStatus, Role, TaskColumn } = require("@prisma/client");
const prisma = require("../lib/prisma");

function parseMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthValue] = month.split("-").map(Number);
  if (monthValue < 1 || monthValue > 12) {
    return null;
  }

  return {
    start: new Date(Date.UTC(year, monthValue - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, monthValue, 1, 0, 0, 0, 0))
  };
}

function formatMonthHeading(month) {
  const [year, monthValue] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthValue - 1, 1));
  return date.toLocaleDateString("es-CR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).toUpperCase();
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("es-CR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC"
  });
}

function sanitizeFilenamePart(value) {
  return String(value || "cliente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function drawTableRow(doc, values, widths, startX, y, options = {}) {
  const rowHeight = options.rowHeight || 22;
  const fontSize = options.fontSize || 9;
  const fillColor = options.fillColor || null;
  const textColor = options.textColor || "#1a1a2e";
  const borderColor = options.borderColor || "#D1D5DB";
  const isBold = Boolean(options.bold);
  let x = startX;

  if (fillColor) {
    doc.save();
    doc.rect(startX, y, widths.reduce((sum, width) => sum + width, 0), rowHeight).fill(fillColor);
    doc.restore();
  }

  values.forEach((value, index) => {
    const width = widths[index];
    doc
      .strokeColor(borderColor)
      .lineWidth(1)
      .rect(x, y, width, rowHeight)
      .stroke();
    doc
      .fillColor(textColor)
      .font(isBold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(fontSize)
      .text(String(value || ""), x + 4, y + 6, {
        width: width - 8,
        height: rowHeight - 8,
        ellipsis: true
      });
    x += width;
  });

  return y + rowHeight;
}

async function loadLogo() {
  // Place the Enyell logo at this path when the asset is available.
  const logoPath = path.resolve(__dirname, "../../../assets/logotipo_ienyell.svg");
  try {
    const logoSvgBuffer = fs.readFileSync(logoPath);
    return await sharp(logoSvgBuffer).resize({ height: 60 }).png().toBuffer();
  } catch (_error) {
    return null;
  }
}

async function generateClientReportPDF(req, res, next) {
  try {
    const { month, clientId } = req.query;
    if (!month) {
      return res.status(400).json({ error: "month es requerido" });
    }

    const range = parseMonthRange(month);
    if (!range) {
      return res.status(400).json({ error: "month debe tener formato YYYY-MM" });
    }

    let targetClientId = req.user.id;
    if (req.user.role === Role.ADMIN && clientId !== undefined) {
      const parsedClientId = Number.parseInt(clientId, 10);
      if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
        return res.status(400).json({ error: "clientId debe ser un entero valido" });
      }
      targetClientId = parsedClientId;
    }

    const client = await prisma.user.findUnique({
      where: { id: targetClientId },
      select: { id: true, name: true, company: true, role: true }
    });

    if (!client || client.role !== Role.CLIENT) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    if (req.user.role !== Role.ADMIN && req.user.id !== client.id) {
      return res.status(403).json({ error: "No tienes permiso para esta accion" });
    }

    const [tasks, activeProjects, logoBuffer] = await Promise.all([
      prisma.projectTask.findMany({
        where: {
          column: TaskColumn.DONE,
          createdAt: { gte: range.start, lt: range.end },
          project: { clientId: client.id }
        },
        include: {
          project: { select: { name: true } },
          subtasks: { select: { done: true } }
        },
        orderBy: { createdAt: "asc" }
      }),
      prisma.project.count({
        where: {
          clientId: client.id,
          status: ProjectStatus.IN_PROGRESS
        }
      }),
      loadLogo()
    ]);

    const closedSubtasks = tasks.reduce(
      (sum, task) => sum + task.subtasks.filter((subtask) => subtask.done).length,
      0
    );

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const filename = `reporte-${month}-${sanitizeFilenamePart(client.name)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    if (logoBuffer) {
      doc.image(logoBuffer, 50, 40, { height: 60 });
    }
    const textX = logoBuffer ? 180 : 50;
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#1a1a2e")
      .text(`Reporte mensual - ${formatMonthHeading(month)}`, textX, 48);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#1a1a2e")
      .text(`Cliente: ${client.name}`, textX, 82)
      .text(`Empresa: ${client.company || "Sin empresa"}`, textX, 98)
      .text(`Generado el: ${new Date().toLocaleDateString("es-CR")}`, textX, 114);

    let y = 150;
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#1a1a2e").text("Resumen", 50, y);
    y += 22;

    const summaryWidths = [165, 165, 165];
    y = drawTableRow(doc, ["Tareas completadas", "Proyectos activos", "Subtareas cerradas"], summaryWidths, 50, y, {
      bold: true,
      fillColor: "#e94560",
      textColor: "#FFFFFF"
    });
    y = drawTableRow(doc, [tasks.length, activeProjects, closedSubtasks], summaryWidths, 50, y);

    y += 26;
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#1a1a2e").text("Detalle de tareas", 50, y);
    y += 22;

    const detailWidths = [70, 120, 155, 75, 75];
    const detailHeader = ["Fecha", "Proyecto", "Tarea", "Prioridad", "Subtareas"];
    y = drawTableRow(doc, detailHeader, detailWidths, 50, y, {
      bold: true,
      fillColor: "#e94560",
      textColor: "#FFFFFF"
    });

    tasks.forEach((task) => {
      if (y > 710) {
        doc.addPage();
        y = 50;
        y = drawTableRow(doc, detailHeader, detailWidths, 50, y, {
          bold: true,
          fillColor: "#e94560",
          textColor: "#FFFFFF"
        });
      }
      const doneCount = task.subtasks.filter((subtask) => subtask.done).length;
      y = drawTableRow(doc, [
        formatDate(task.createdAt),
        task.project?.name || "-",
        task.title,
        task.priority,
        `${doneCount}/${task.subtasks.length}`
      ], detailWidths, 50, y, { rowHeight: 28 });
    });

    if (y > 710) {
      doc.addPage();
      y = 50;
    }
    drawTableRow(doc, ["", "", `Total del mes: ${tasks.length} tareas`, "", ""], detailWidths, 50, y, {
      bold: true,
      fillColor: "#e94560",
      textColor: "#FFFFFF",
      rowHeight: 28
    });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#4B5563")
      .text("Gracias por confiar en Enyell · ienyell.com", 50, 790, {
        align: "center",
        width: 495
      });

    doc.end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateClientReportPDF
};
