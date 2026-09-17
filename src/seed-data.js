// Datos iniciales de Burger 2324. Generado con `npm run export-seed` el 2026-09-17 13:24.
// Se cargan una sola vez cuando la base de datos está vacía. Después todo se edita desde el panel.

const settings = {
  "brand_name": "Burger 2324",
  "meta_title": "Burger 2324 — Hamburguesas en Mercedes, Buenos Aires | Delivery y Take Away",
  "meta_description": "Hamburguesas artesanales en Mercedes, Buenos Aires. Pan de papa, medallones de 120 g y cheddar. Pedí por WhatsApp para delivery o take away.",
  "eyebrow": "MERCEDES, BUENOS AIRES · HECHAS ACÁ",
  "hero_title": "Hamburguesas",
  "hero_title_em": "en serio.",
  "hero_text": "Carne, cheddar y ese primer mordisco que no se olvida.",
  "hero_image": "/assets/burger-02.jpg",
  "whatsapp": "542324353266",
  "phone_display": "02324 353266",
  "instagram": "burgers2324",
  "address": "20 entre 23 y 25",
  "city": "Mercedes, Buenos Aires",
  "maps_url": "https://www.google.com/maps/search/?api=1&query=20%20entre%2023%20y%2025%2C%20Mercedes%2C%20Buenos%20Aires",
  "maps_embed": "",
  "hours": {
    "mon": {
      "open": false,
      "from": "19:30",
      "to": "23:30"
    },
    "tue": {
      "open": true,
      "from": "19:30",
      "to": "23:30"
    },
    "wed": {
      "open": true,
      "from": "19:30",
      "to": "23:30"
    },
    "thu": {
      "open": true,
      "from": "19:30",
      "to": "23:30"
    },
    "fri": {
      "open": true,
      "from": "19:30",
      "to": "23:30"
    },
    "sat": {
      "open": true,
      "from": "19:30",
      "to": "23:30"
    },
    "sun": {
      "open": true,
      "from": "19:30",
      "to": "23:30"
    }
  },
  "hours_label": "Martes a domingos · 19:30 a 23:30 hs",
  "status_override": "auto",
  "closed_message": "Ahora estamos cerrados. Podés dejar tu pedido y lo preparamos apenas abrimos.",
  "accept_orders_when_closed": true,
  "announcement": {
    "active": false,
    "text": ""
  },
  "delivery": {
    "enabled": true,
    "fee": 1500,
    "min_order": 0,
    "free_from": 0,
    "eta": "30 a 45 min",
    "zones": "Mercedes (zona urbana)"
  },
  "takeaway": {
    "enabled": true,
    "eta": "15 a 20 min"
  },
  "payments": [
    "Efectivo",
    "Transferencia"
  ],
  "about_title": "Una historia",
  "about_title_em": "por contar.",
  "about_text": "Desde Mercedes, Buenos Aires, preparando burgers para delivery y take away. Pan de papa, medallones de 120 g y cheddar de verdad, todos los días.",
  "about_images": [
    "/assets/burger-01.jpg",
    "/assets/burger-03.jpg",
    "/assets/burger-04.jpg"
  ],
  "featured_eyebrow": "LA QUE NO FALLA",
  "featured_title": "¿Cuál es",
  "featured_title_em": "la tuya?",
  "footer_text": "HECHO CON MUCHO HAMBRE.",
  "order_prefix": "B2324"
};

const categories = [
  {
    "name": "Burgers",
    "slug": "burgers",
    "tagline": "LA CARTA",
    "layout": "burger",
    "description": "Elegí tu punto de partida. Después, elegí cuánto hambre tenés.",
    "active": 1,
    "products": [
      {
        "name": "MERCEDES",
        "subtitle": "Cheeseburger",
        "description": "Pan de papa, medallón de carne de 120 g y cheddar x3.",
        "image": "/assets/mercedes.png",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 9900
          },
          {
            "label": "DOBLE",
            "price": 12400
          },
          {
            "label": "TRIPLE",
            "price": 14900
          }
        ],
        "badge": "CLÁSICA",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "AGOTE",
        "subtitle": "Bacon Burger",
        "description": "Pan de papa, medallón de carne de 120 g, cheddar x3 y bacon.",
        "image": "/assets/burger-03.jpg",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 10800
          },
          {
            "label": "DOBLE",
            "price": 13300
          },
          {
            "label": "TRIPLE",
            "price": 15800
          }
        ],
        "badge": "MÁS PEDIDA",
        "featured": 1,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "GARCÍA",
        "subtitle": "Oklahoma",
        "description": "Pan de papa, medallón de carne de 120 g, cheddar x3 y cebolla.",
        "image": "/assets/burger-04.jpg",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 10800
          },
          {
            "label": "DOBLE",
            "price": 13300
          },
          {
            "label": "TRIPLE",
            "price": 15800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "SAN JACINTO",
        "subtitle": "1/4 de libra",
        "description": "Pan de papa, medallón de carne de 120 g, cheddar x3, cebolla, mostaza y ketchup.",
        "image": "/assets/san-jacinto.png",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 10800
          },
          {
            "label": "DOBLE",
            "price": 13300
          },
          {
            "label": "TRIPLE",
            "price": 15800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "GOWLAND",
        "subtitle": "Clásica",
        "description": "Pan de papa, medallón de carne de 120 g, cheddar x3, tomate, lechuga, cebolla y salsa BigMac.",
        "image": "/assets/burger-02.jpg",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 10800
          },
          {
            "label": "DOBLE",
            "price": 13300
          },
          {
            "label": "TRIPLE",
            "price": 15800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "ALTAMIRA",
        "subtitle": "Tasty",
        "description": "Pan de papa, medallón de carne de 120 g, cheddar x3, tomate, lechuga y salsa Tasty.",
        "image": "/assets/burger-01.jpg",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 10800
          },
          {
            "label": "DOBLE",
            "price": 13300
          },
          {
            "label": "TRIPLE",
            "price": 15800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "LA VERDE",
        "subtitle": "Yankee",
        "description": "Pan de papa, medallón de carne de 120 g, cheddar x3, cebolla caramelizada, pepinillos y salsa alioli.",
        "image": "/assets/la-verde.png",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 10800
          },
          {
            "label": "DOBLE",
            "price": 13300
          },
          {
            "label": "TRIPLE",
            "price": 15800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "TOMÁS JOFRÉ",
        "subtitle": "Provoleta",
        "description": "Provoleta, medallón de carne de 120 g, cebolla y morrones asados, tomate y un toque de chimichurri.",
        "image": "/assets/tomas-jofre.png",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 12000
          },
          {
            "label": "DOBLE",
            "price": 14500
          },
          {
            "label": "TRIPLE",
            "price": 17000
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "LA FLORIDA",
        "subtitle": "Completa",
        "description": "Pan de papa, medallón de carne de 120 g, jamón, queso y huevo.",
        "image": "/assets/la-florida.png",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 11000
          },
          {
            "label": "DOBLE",
            "price": 13500
          },
          {
            "label": "TRIPLE",
            "price": 15500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "GOLDNEY",
        "subtitle": "BBQ Crispy",
        "description": "Pan de papa, medallón de carne de 120 g, cebolla crispy, bacon, barbacoa ahumada y base de salsa de ajo.",
        "image": "/assets/goldney.png",
        "variants": [
          {
            "label": "SIMPLE",
            "price": 11000
          },
          {
            "label": "DOBLE",
            "price": 13500
          },
          {
            "label": "TRIPLE",
            "price": 15500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      }
    ]
  },
  {
    "name": "Combos",
    "slug": "combos",
    "tagline": "SOLO EN EFECTIVO",
    "layout": "compact",
    "description": "Los combos se abonan únicamente en efectivo.",
    "active": 1,
    "products": [
      {
        "name": "COMBO SIMPLE",
        "subtitle": "SIMPLE + PAPAS + LATA",
        "description": "Burger simple a elección + papas fritas + bebida en lata. Solo en efectivo.",
        "image": "/assets/burger-01.jpg",
        "variants": [
          {
            "label": "",
            "price": 14000
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 1,
        "active": 1,
        "available": 1
      },
      {
        "name": "COMBO DOBLE",
        "subtitle": "DOBLE + PAPAS + LATA",
        "description": "Burger doble a elección + papas fritas + bebida en lata. Solo en efectivo.",
        "image": "/assets/burger-03.jpg",
        "variants": [
          {
            "label": "",
            "price": 15500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 1,
        "active": 1,
        "available": 1
      },
      {
        "name": "COMBO KIDS",
        "subtitle": "PARA LOS CHICOS",
        "description": "Burger simple + Ricosaurios + papas fritas + bebida en lata. Solo en efectivo.",
        "image": "/assets/ricosaurios.png",
        "variants": [
          {
            "label": "",
            "price": 18000
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 1,
        "active": 1,
        "available": 1
      }
    ]
  },
  {
    "name": "Entradas y papas",
    "slug": "entradas",
    "tagline": "PARA PICAR",
    "layout": "compact",
    "description": "Para completar el pedido.",
    "active": 1,
    "products": [
      {
        "name": "RICOSAURIOS",
        "subtitle": "",
        "description": "Nuggets con forma de dinosaurio.",
        "image": "/assets/ricosaurios.png",
        "variants": [
          {
            "label": "",
            "price": 7000
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "NACHOS CON CHEDDAR",
        "subtitle": "Doritos",
        "description": "",
        "image": "/assets/nachos-cheddar.png",
        "variants": [
          {
            "label": "",
            "price": 7000
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "NACHOS CON GUACAMOLE",
        "subtitle": "Doritos",
        "description": "",
        "image": "/assets/nachos-guacamole.png",
        "variants": [
          {
            "label": "",
            "price": 7000
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "BOCADITOS DE POLLO",
        "subtitle": "",
        "description": "",
        "image": "/assets/bocaditos-pollo.png",
        "variants": [
          {
            "label": "",
            "price": 7000
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "AROS DE CEBOLLA",
        "subtitle": "",
        "description": "",
        "image": "/assets/aros-cebolla.png",
        "variants": [
          {
            "label": "",
            "price": 6500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "BANDEJA DE PAPAS SOLAS",
        "subtitle": "",
        "description": "",
        "image": "/assets/papas-solas.png",
        "variants": [
          {
            "label": "",
            "price": 5500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "PAPAS CON CHEDDAR",
        "subtitle": "",
        "description": "",
        "image": "/assets/papas-cheddar.png",
        "variants": [
          {
            "label": "",
            "price": 6500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "PAPAS CON CHEDDAR Y BACON",
        "subtitle": "",
        "description": "",
        "image": "/assets/papas-cheddar-bacon.png",
        "variants": [
          {
            "label": "",
            "price": 7500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      }
    ]
  },
  {
    "name": "Bebidas",
    "slug": "bebidas",
    "tagline": "BIEN FRÍAS",
    "layout": "compact",
    "description": "Latas de 355 ml y botellas de 600 ml.",
    "active": 1,
    "products": [
      {
        "name": "COCA COLA CLÁSICA",
        "subtitle": "Lata 355 ml",
        "description": "",
        "image": "/assets/lata-coca.png",
        "variants": [
          {
            "label": "",
            "price": 2500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "COCA COLA ZERO",
        "subtitle": "Lata 355 ml",
        "description": "",
        "image": "/assets/lata-coca-zero.png",
        "variants": [
          {
            "label": "",
            "price": 2500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "FANTA",
        "subtitle": "Lata 355 ml",
        "description": "",
        "image": "/assets/lata-fanta.png",
        "variants": [
          {
            "label": "",
            "price": 2500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "SPRITE",
        "subtitle": "Lata 355 ml",
        "description": "",
        "image": "/assets/lata-sprite.png",
        "variants": [
          {
            "label": "",
            "price": 2500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "COCA COLA CLÁSICA",
        "subtitle": "600 ml",
        "description": "",
        "image": "/assets/botella-coca.png",
        "variants": [
          {
            "label": "",
            "price": 2800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "COCA COLA ZERO",
        "subtitle": "600 ml",
        "description": "",
        "image": "/assets/botella-coca-zero.png",
        "variants": [
          {
            "label": "",
            "price": 2800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "FANTA",
        "subtitle": "600 ml",
        "description": "",
        "image": "/assets/botella-fanta.png",
        "variants": [
          {
            "label": "",
            "price": 2800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "SPRITE",
        "subtitle": "600 ml",
        "description": "",
        "image": "/assets/botella-sprite.png",
        "variants": [
          {
            "label": "",
            "price": 2800
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "AQUARIUS PERA",
        "subtitle": "600 ml",
        "description": "",
        "image": "/assets/aquarius-pera.png",
        "variants": [
          {
            "label": "",
            "price": 2500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "AQUARIUS MANZANA",
        "subtitle": "600 ml",
        "description": "",
        "image": "/assets/aquarius-manzana.png",
        "variants": [
          {
            "label": "",
            "price": 2500
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      },
      {
        "name": "AGUA SMARTWATER",
        "subtitle": "Sin gas · 591 ml",
        "description": "",
        "image": "/assets/agua-smartwater.png",
        "variants": [
          {
            "label": "",
            "price": 1600
          }
        ],
        "badge": "",
        "featured": 0,
        "cash_only": 0,
        "active": 1,
        "available": 1
      }
    ]
  }
];

const gallery = [
  {
    "image": "/assets/burger-04.jpg",
    "caption": "HAMBURGUESAS",
    "active": 1
  },
  {
    "image": "/assets/burger-01.jpg",
    "caption": "COCINA",
    "active": 1
  },
  {
    "image": "/assets/burger-03.jpg",
    "caption": "EL LOCAL",
    "active": 1
  },
  {
    "image": "/assets/burger-02.jpg",
    "caption": "MOMENTOS",
    "active": 1
  }
];

const promos = [];

module.exports = { settings, categories, gallery, promos };
