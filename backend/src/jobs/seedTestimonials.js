const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const testimonials = [
  {
    name: "Valeria Rojas",
    role: "Creadora de campañas RPG",
    company: "Crónicas de Aster",
    socialHandle: "@cronicasdeaster",
    socialNetwork: "instagram",
    content: "Encargué el arte de mis personajes para una campaña de mesa y el resultado superó todo lo que imaginaba. Cada expresión y detalle del vestuario cuenta algo de la historia. Mis jugadores quedaron fascinados.",
    stars: 5,
    isActive: true,
    order: 1
  },
  {
    name: "Mateo Salas",
    role: "Autor independiente",
    company: null,
    socialHandle: "@mateoescribe",
    socialNetwork: "instagram",
    content: "La portada de mi novela capturó justo la atmósfera que quería transmitir. El proceso fue claro, atento y lleno de buenas ideas. Ahora siento que mi libro tiene una identidad visual inolvidable.",
    stars: 5,
    isActive: true,
    order: 2
  },
  {
    name: "Nadia Vega",
    role: "Streamer",
    company: "NadiaVegaLive",
    socialHandle: "@nadiavegalive",
    socialNetwork: "twitch",
    content: "Los emotes y el banner hicieron que mi canal se sintiera realmente mío. Enyell entendió mi humor y mi estilo desde el primer boceto. La comunidad no para de usar los emotes en cada transmisión.",
    stars: 5,
    isActive: true,
    order: 3
  },
  {
    name: "Camila y Daniel",
    role: "Regalo de aniversario",
    company: null,
    socialHandle: null,
    socialNetwork: null,
    content: "Pedimos un retrato personalizado para nuestro aniversario y fue un regalo precioso. La ilustración conserva nuestros gestos y pequeños detalles favoritos de una forma muy especial.",
    stars: 5,
    isActive: true,
    order: 4
  },
  {
    name: "Leo Mendez",
    role: "Desarrollador de videojuegos",
    company: "Lumen Fox Studio",
    socialHandle: "@lumenfoxstudio",
    socialNetwork: "x",
    content: "Necesitábamos arte conceptual que pudiera guiar el mundo visual de nuestro juego indie. Recibimos personajes y escenarios con personalidad, coherentes entre sí y llenos de posibilidades para el equipo.",
    stars: 5,
    isActive: true,
    order: 5
  }
];

async function main() {
  for (const testimonial of testimonials) {
    const existing = await prisma.testimonial.findFirst({ where: { name: testimonial.name } });
    if (!existing) {
      await prisma.testimonial.create({ data: testimonial });
      console.log("Creado:", testimonial.name);
    } else {
      console.log("Ya existe:", testimonial.name);
    }
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main, testimonials };
