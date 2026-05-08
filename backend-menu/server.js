require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('STRIPE KEY:', process.env.STRIPE_SECRET_KEY);


const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODELOS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash'
];

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function llamarGeminiConFallback(prompt) {
  const bodyGemini = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 7000,
      responseMimeType: 'application/json'
    }
  };

  for (const modelo of MODELOS) {
    const start = Date.now();

    try {
      console.log(`🧠 Probando modelo: ${modelo}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyGemini),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      const text = await response.text();

      if (!response.ok || text.includes('high demand')) {
        console.log(`❌ ${modelo} falló (${Date.now() - start}ms)`);
        console.log(text);
        continue;
      }

      console.log(`✅ ${modelo} OK (${Date.now() - start}ms)`);
      return text;

    } catch (error) {
      console.log(`🚫 Error con ${modelo}: ${error.message}`);
      continue;
    }
  }

  throw new Error('Todos los modelos fallaron');
}
  for (const modelo of MODELOS) {
    try {
      console.log(`Probando modelo: ${modelo}`);

      const controller = new AbortController();
setTimeout(() => controller.abort(), 15000); // 15s timeout

const start = Date.now();

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyGemini),
    signal: controller.signal
  }
);

clearTimeout(timeout);

const text = await response.text();

if (!response.ok || text.includes('high demand')) {
  console.log(`❌ ${modelo} FALLÓ (${Date.now() - start}ms)`);
  continue;
}

console.log(`✅ ${modelo} OK (${Date.now() - start}ms)`);

return text;
}

      const data = JSON.parse(text);
      const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!respuesta) {
        console.log(`Sin texto con ${modelo}`);
        continue;
      }

      console.log(`Modelo usado: ${modelo}`);
      return respuesta;

    } catch (error) {
      console.log(`Fallo con ${modelo}:`, error.message);
    }
  }

  throw new Error('Todos los modelos fallaron');
}

function crearPrompt(body) {
  const esPro = body.plan === 'pro';
  const comidas = esPro && Array.isArray(body.comidasSeleccionadas)
    ? body.comidasSeleccionadas
    : ['comida', 'cena'];

  const preferencias = Array.isArray(body.preferencias)
    ? body.preferencias.join(', ')
    : 'mediterranea';

  return `
Responde SOLO con JSON válido. No uses markdown. No escribas explicaciones.

Crea un menú semanal COMPLETO de 7 días.

Comidas que debe incluir cada día:
${comidas.join(', ')}

Datos:
- Preferencias: ${preferencias}
- Personas: ${body.personas || 2}
- Supermercado: ${body.supermercado || 'Mercadona'}
- Calorías aproximadas por día: ${body.calorias || 2000}
- Plan: ${body.plan || 'free'}

${esPro ? `
Objetivos por receta:
- Proteínas aproximadas: ${body.proteinasObjetivo || 30}g
- Carbohidratos aproximados: ${body.carbohidratosObjetivo || 50}g
` : ''}

Formato obligatorio:
{
  "dias": [
    {
      "dia": 1,
      "comidas": [
        {
          "tipo": "comida",
          "nombre": "Nombre del plato",
          "calorias": 500,
          "tiempo": 20,
          "proteinas": 30,
          "carbohidratos": 50,
          "emoji": "🍝",
          "dificultad": "Fácil",
          "ingredientes": [
            {"cantidad": "200g", "nombre": "Pasta"}
          ],
          "pasos": [
            "Paso 1",
            "Paso 2"
          ],
          "consejo": "Consejo"
        }
      ]
    }
  ],
  "ingredientes": [
    {
      "nombre": "Pasta",
      "cantidad": "1 paquete",
      "precio": 1.20,
      "categoria": "Pasta"
    }
  ]
}

Reglas estrictas:
- Devuelve exactamente 7 días, del día 1 al día 7.
- Cada día debe tener exactamente estas comidas: ${comidas.join(', ')}.
- Usa siempre la clave "dias".
- Dentro de cada día usa siempre la clave "comidas".
- Cada comida debe incluir receta completa.
- Cada comida debe tener: tipo, nombre, calorias, tiempo, proteinas, carbohidratos, emoji, dificultad, ingredientes, pasos y consejo.
- Cada receta debe tener máximo 4 ingredientes.
- Cada receta debe tener máximo 4 pasos.
- La lista global "ingredientes" debe tener entre 8 y 14 productos.
- Los precios deben ser numéricos.
- No añadas texto fuera del JSON.
`;
}

function limpiarTextoJSON(texto) {
  return texto
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}

app.get('/', (req, res) => {
  res.send('Backend MenuMes funcionando');
});

app.post('/generar-menu', async (req, res) => {
  try {
    const body = req.body;

    if (!body.userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Falta GEMINI_API_KEY en .env' });
    }

    const prompt = crearPrompt(body);

    let texto = await llamarGeminiConFallback(prompt);
    texto = limpiarTextoJSON(texto);

    let resultado;

    try {
      resultado = JSON.parse(texto);
    } catch (error) {
      console.log('JSON inválido recibido:', texto);
      return res.status(500).json({ error: 'Gemini devolvió JSON inválido' });
    }

    if (!resultado?.dias || resultado.dias.length !== 7) {
      return res.status(500).json({ error: 'Gemini no generó los 7 días correctamente' });
    }

    const { error: errorInsert } = await supabaseAdmin
      .from('menus')
      .insert({
        user_id: body.userId,
        preferencias: body.preferencias || [],
        personas: body.personas || 2,
        supermercado: body.supermercado || 'Mercadona',
        calorias: body.calorias || 2000,
        plan: body.plan || 'free',
        dias: resultado.dias,
        ingredientes: resultado.ingredientes || [],
      });

    if (errorInsert) {
      console.log('Error guardando en Supabase:', errorInsert);
    }

    return res.json(resultado);

  } catch (error) {
    console.log('Error backend:', error);
    return res.status(500).json({ error: error.message });
  }
});

  try {
    const { userId, email } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
     success_url: 'http://192.168.0.16:3000/success',
     cancel_url: 'http://192.168.0.16:3000/cancel',
      customer_email: email,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.log('Error Stripe completo:', error);
res.status(500).json({
  error: error.message,
  type: error.type || null,
  code: error.code || null
});
  }
});
app.get('/success', (req, res) => {
  res.send('Pago completado correctamente 🎉');
});

app.get('/cancel', (req, res) => {
  res.send('Pago cancelado ❌');
});
app.get('/success', (req, res) => {
  res.send('Pago completado correctamente 🎉');
});

app.get('/cancel', (req, res) => {
  res.send('Pago cancelado ❌');
});

app.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    console.log('🔥 EVENTO:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;

      console.log('✅ Activando PRO para:', userId);

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('id', userId);

      if (error) {
        console.log('❌ Error actualizando PRO:', error);
      } else {
        console.log('🚀 Usuario actualizado a PRO');
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.log('❌ Error webhook:', err.message);
    res.status(400).send('Webhook error');
  }
});
    res.json({ received: true });
  } catch (err) {
    console.log('❌ Error webhook:', err.message);
    res.status(400).sendapp.post('/crear-checkout', async (req, res) => {('Webhook error');
  }
});
  console.log(`Servidor en http://localhost:${PORT}`);
});