const { Client, APIErrorCode } = require("@notionhq/client");

const notionApiKey = String(process.env.NOTION_API_KEY || "").trim();
const notion = notionApiKey
  ? new Client({
    auth: notionApiKey,
    notionVersion: "2026-03-11"
  })
  : null;

const resolvedDataSourceIds = new Map();
const warnedMissingConfig = new Set();

function warnOnce(key, message) {
  if (warnedMissingConfig.has(key)) {
    return;
  }

  warnedMissingConfig.add(key);
  console.warn(message);
}

function getConfiguredId(envName, { optional = false } = {}) {
  if (!notion) {
    warnOnce("NOTION_API_KEY", "NOTION_API_KEY no esta configurado. Se omite la sincronizacion con Notion.");
    return null;
  }

  const configuredId = String(process.env[envName] || "").trim();
  if (!configuredId) {
    if (!optional) {
      warnOnce(envName, `${envName} no esta configurado. Se omite la sincronizacion correspondiente.`);
    }
    return null;
  }

  return configuredId;
}

async function resolveDataSourceId(configuredId) {
  if (resolvedDataSourceIds.has(configuredId)) {
    return resolvedDataSourceIds.get(configuredId);
  }

  try {
    await notion.dataSources.retrieve({ data_source_id: configuredId });
    resolvedDataSourceIds.set(configuredId, configuredId);
    return configuredId;
  } catch (error) {
    if (![APIErrorCode.ObjectNotFound, APIErrorCode.ValidationError].includes(error?.code)) {
      throw error;
    }
  }

  const database = await notion.databases.retrieve({ database_id: configuredId });
  const dataSourceId = database.data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error(`La base de datos ${configuredId} no contiene un data source accesible.`);
  }

  resolvedDataSourceIds.set(configuredId, dataSourceId);
  return dataSourceId;
}

function richText(content) {
  const safeContent = String(content || "").trim();
  return safeContent
    ? [{ type: "text", text: { content: safeContent } }]
    : [];
}

function buildClientProperties(client) {
  return {
    Nombre: {
      title: richText(client.name)
    },
    Email: {
      email: client.email || null
    },
    Empresa: {
      rich_text: richText(client.company)
    },
    "Teléfono": {
      phone_number: client.phone || null
    },
    Activo: {
      checkbox: client.active !== false
    }
  };
}

async function syncClientToNotion(client) {
  const configuredId = getConfiguredId("NOTION_CLIENTS_DB_ID");
  if (!configuredId || !client?.email) {
    return null;
  }

  try {
    const dataSourceId = await resolveDataSourceId(configuredId);
    const normalizedEmail = String(client.email).trim().toLowerCase();
    const existing = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: "Email",
        email: {
          equals: normalizedEmail
        }
      },
      page_size: 1,
      result_type: "page"
    });

    const properties = buildClientProperties({
      ...client,
      email: normalizedEmail
    });

    if (existing.results[0]?.id) {
      return notion.pages.update({
        page_id: existing.results[0].id,
        properties
      });
    }

    return notion.pages.create({
      parent: {
        type: "data_source_id",
        data_source_id: dataSourceId
      },
      properties
    });
  } catch (error) {
    console.warn("Notion client sync failed:", error.message);
    return null;
  }
}

async function logHoursToNotion(hourEntry, clientName, productName) {
  const configuredId = getConfiguredId("NOTION_REPORTS_DB_ID", { optional: true });
  if (!configuredId || !hourEntry) {
    return null;
  }

  try {
    const dataSourceId = await resolveDataSourceId(configuredId);
    return notion.pages.create({
      parent: {
        type: "data_source_id",
        data_source_id: dataSourceId
      },
      properties: {
        Cliente: {
          rich_text: richText(clientName)
        },
        Producto: {
          rich_text: richText(productName)
        },
        Fecha: {
          date: {
            start: new Date(hourEntry.date).toISOString()
          }
        },
        Tarea: {
          rich_text: richText(hourEntry.task)
        },
        Horas: {
          number: Number(hourEntry.hours)
        }
      }
    });
  } catch (error) {
    console.warn("Notion hours sync failed:", error.message);
    return null;
  }
}

async function createAppointmentInNotion(appointment) {
  const configuredId = getConfiguredId("NOTION_APPOINTMENTS_DB_ID");
  if (!configuredId || !appointment) {
    return null;
  }

  try {
    const dataSourceId = await resolveDataSourceId(configuredId);
    return notion.pages.create({
      parent: {
        type: "data_source_id",
        data_source_id: dataSourceId
      },
      properties: {
        Nombre: {
          title: richText(appointment.name)
        },
        Email: {
          email: appointment.email || null
        },
        "Teléfono": {
          rich_text: richText(appointment.phone)
        },
        Fecha: {
          date: {
            start: new Date(appointment.date).toISOString()
          }
        },
        Estado: {
          select: {
            name: appointment.status || "Pendiente"
          }
        }
      }
    });
  } catch (error) {
    console.warn("Notion appointment sync failed:", error.message);
    return null;
  }
}

module.exports = {
  syncClientToNotion,
  logHoursToNotion,
  createAppointmentInNotion
};
