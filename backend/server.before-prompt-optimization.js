const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
console.log('SUPABASE:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'NO');

const express = require('express');
const cors = require('cors');

const ws = require('ws');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


const app = express();


// ===== CONTROL LIMITES FREE =====
async function comprobarLimiteGeneraciones(userId) {

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('Perfil no encontrado');
  }

  // PRO = ilimitado
  if ((profile.plan || '').toLowerCase() === 'pro') {
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];

  // Reiniciar contador nuevo día
  if (profile.last_generation_date !== hoy) {

    await supabase
      .from('profiles')
      .update({
        daily_generations: 0,
        last_generation_date: hoy,
      })
      .eq('id', userId);

    profile.daily_generations = 0;
  }

  // Límite FREE
  if ((profile.daily_generations || 0) >= 3) {
    throw new Error('💎 Has alcanzado el límite diario FREE. Hazte Pro para generaciones ilimitadas.');
  }

  // Incrementar contador
  await supabase
    .from('profiles')
    .update({
      daily_generations: (profile.daily_generations || 0) + 1
    })
    .eq('id', userId);
}



app.use(cors());
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
  res.send('Backend MenuMes funcionando');
});

app.post('/generar-menu', async (req, res) => {
  try {
    const body = req.body;

    await comprobarLimiteGeneraciones(body.userId);
    const comidas = body.plan === 'pro'
      ? body.comidasSeleccionadas
      : ['comida', 'cena'];

    const prompt = `
Responde SOLO con JSON válido. No uses markdown.

Crea un menú semanal de 7 días.
Cada día debe incluir exactamente estas comidas: ${comidas.join(', ')}.

Formato:
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
          "ingredientes": [{"cantidad": "200g", "nombre": "Ingrediente"}],
          "pasos": ["Paso 1", "Paso 2"],
          "consejo": "Consejo"
        }
      ]
    }
  ],
  "ingredientes": [
    {"nombre": "Ingrediente", "cantidad": "1 unidad", "precio": 1.5, "categoria": "General"}
  ]
}

Reglas:
- Devuelve exactamente 7 días.
- Cada día debe tener exactamente estas comidas: ${comidas.join(', ')}.
- Cada comida debe tener máximo 4 ingredientes y 4 pasos.
- La lista global ingredientes debe tener entre 8 y 14 productos.
- Preferencias: ${(body.preferencias || []).join(', ')}
- Restricciones e intolerancias: ${(body.intolerancias || []).join(', ') || 'ninguna'}
- Si hay restricciones, NO incluyas ingredientes incompatibles.
- Si aparece "Sin gluten", evita pan, pasta normal, harina de trigo, couscous y similares salvo que sean sin gluten.
- Si aparece "Sin lactosa", evita leche, queso, yogur y nata salvo versiones sin lactosa.
- Si aparece "Sin frutos secos", evita almendras, nueces, cacahuetes, pistachos y similares.
- Si aparece "Sin marisco", evita gambas, langostinos, mejillones, calamares y similares.
- Si aparece "Sin huevo", no uses huevo ni salsas con huevo.
- Si aparece "Bajo en azúcar", evita postres azucarados, miel, azúcar añadido y bollería.
- Si aparece "Bajo en sal", evita embutidos, conservas saladas y exceso de sal.
- Si aparece "Halal", evita cerdo, jamón, bacon, chorizo y alcohol.
- Personas: ${body.personas}
- Supermercado: ${body.supermercado}
- Presupuesto semanal elegido: ${body.presupuesto || 'libre'} euros.

REGLA CRÍTICA DE PRESUPUESTO:
- Si el presupuesto es 30, crea recetas económicas con ingredientes baratos, básicos y repetibles.
- Si el presupuesto es 50, crea un menú equilibrado entre precio, variedad y calidad.
- Si el presupuesto es 70, permite ingredientes más variados y premium, pero sin excesos.
- Si el presupuesto es libre, prioriza calidad nutricional, variedad y sabor.
- La lista global de ingredientes debe aproximarse al presupuesto semanal elegido.
- Los precios deben ser realistas para supermercado en España.
- Evita ingredientes caros si el presupuesto es bajo.

REGLA CRÍTICA DE CALORÍAS:
- Objetivo diario exacto: ${body.calorias} kcal.
- La suma de calorías de todas las comidas de cada día debe estar entre ${Math.round(Number(body.calorias) * 0.95)} y ${Math.round(Number(body.calorias) * 1.05)} kcal.
- No generes días por debajo de ${Math.round(Number(body.calorias) * 0.95)} kcal.
- No generes días por encima de ${Math.round(Number(body.calorias) * 1.05)} kcal.
- Ajusta raciones, cantidades e ingredientes para acercarte al objetivo.
- Si el objetivo es alto, aumenta raciones, añade frutos secos, arroz, pasta, pan integral, aceite de oliva, aguacate o lácteos.
- Si el objetivo es bajo, reduce raciones y prioriza verduras, proteína magra y platos ligeros.
- Las calorías deben ser realistas y coherentes con los ingredientes.
- Antes de responder, comprueba mentalmente la suma diaria.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Error Gemini' });
    }

    let texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!texto) {
      return res.status(500).json({ error: 'Sin respuesta de Gemini' });
    }

    texto = texto.replace(/```json|```/g, '').trim();

    const resultado = JSON.parse(texto);

    
    // ===== GUARDAR MENU SEMANAL =====
    try {
      const userId = body.userId;

      if (userId && resultado?.dias) {
        await supabase
          .from('weekly_menus')
          .insert({
            user_id: userId,
            title: `Menú ${new Date().toLocaleDateString('es-ES')}`,
            menu: resultado,
          });
      }
    } catch (e) {
      console.log('Error guardando historial:', e.message);
    }

    res.json(resultado);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});



app.post('/escanear-nevera', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta imagen' });
    }

    const prompt = `
Responde SOLO con JSON válido.
Analiza esta foto de nevera/despensa.

Devuelve:
{
  "ingredientesDetectados": ["ingrediente 1", "ingrediente 2"],
  "recetasSugeridas": [
    {
      "nombre": "Nombre receta",
      "emoji": "🍽️",
      "tiempo": 20,
      "dificultad": "Fácil",
      "calorias": 500,
      "ingredientes": ["ingrediente 1", "ingrediente 2"],
      "idea": "Breve explicación"
    }
  ],
  "consejo": "Consejo práctico para aprovechar mejor esos alimentos"
}

Reglas:
- Máximo 10 ingredientes detectados.
- Máximo 3 recetas.
- Recetas saludables, sencillas y realistas.
- Si no reconoces bien la imagen, dilo en el JSON.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        }),
      }
    );

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    res.json(JSON.parse(text));

  } catch (err) {
    console.error('Error escaneando nevera:', err);
    res.status(500).json({ error: err.message });
  }
});



app.post('/regenerar-receta', async (req, res) => {
  try {
    const body = req.body;

    const prompt = `
Responde SOLO con JSON válido. No uses markdown.

Regenera UNA sola receta para sustituir la receta actual.

Tipo de comida: ${body.tipo || 'comida'}
Calorías objetivo aproximadas: ${body.calorias || 500}
Personas: ${body.personas || 1}
Preferencias: ${(body.preferencias || []).join(', ') || 'ninguna'}
Intolerancias: ${(body.intolerancias || []).join(', ') || 'ninguna'}
Supermercado: ${body.supermercado || 'Mercadona'}
Receta anterior a evitar: ${body.nombreAnterior || 'ninguna'}

Formato exacto:
{
  "tipo": "${body.tipo || 'comida'}",
  "nombre": "Nombre del plato",
  "calorias": 500,
  "tiempo": 20,
  "proteinas": 30,
  "carbohidratos": 50,
  "emoji": "🍽️",
  "dificultad": "Fácil",
  "ingredientes": [
    {"cantidad": "200g", "nombre": "Ingrediente"}
  ],
  "pasos": ["Paso 1", "Paso 2", "Paso 3"],
  "consejo": "Consejo útil"
}

Reglas:
- No repitas la receta anterior.
- Máximo 4 ingredientes.
- Máximo 4 pasos.
- Respeta intolerancias.
- Respeta preferencias.
- Mantén calorías lo más cerca posible del objetivo.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    res.json(JSON.parse(text));

  } catch (err) {
    console.error('Error regenerando receta:', err);
    res.status(500).json({ error: err.message });
  }
});


app.post('/crear-checkout', async (req, res) => {
  try {
    const { userId, email } = req.body;

    console.log('🧠 userId recibido:', userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: 'https://google.com',
      cancel_url: 'https://google.com',
      customer_email: email,
      metadata: { userId },
    });

    res.json({ url: session.url });

  } catch (error) {
    console.log('❌ Error creando checkout:', error.message);
    res.status(500).json({ error: error.message });
  }
});



app.get('/success', (req, res) => {
  res.send('Pago completado correctamente 🎉');
});

app.get('/cancel', (req, res) => {
  res.send('Pago cancelado ❌');
});




app.post('/crear-portal', async (req, res) => {
  try {
    const { email } = req.body;

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (!customers.data.length) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
      });
    }

    const customer = customers.data[0];

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: 'https://google.com',
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error('Error portal Stripe:', err);
    res.status(500).json({
      error: err.message,
    });
  }
});


app.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    console.log('🔥 EVENTO:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      console.log('🧠 metadata:', session.metadata);

      const userId = session.metadata?.userId;

      console.log('👤 userId:', userId);

      if (!userId) {
        console.log('❌ NO HAY USERID');
        return res.status(400).send('No userId');
      }

      const { data, error } = await require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws } })
        .from('profiles')
        .upsert({ id: userId, plan: 'pro' })
        .select();

      if (error) {
        console.log('❌ ERROR SUPABASE:', error);
        return res.status(400).send(error.message);
      }

      console.log('🚀 Usuario actualizado a PRO:', data);
    }

    res.json({ received: true });

  } catch (err) {
    console.log('❌ ERROR WEBHOOK:', err.message);
    res.status(400).send('Webhook error');
  }
});


app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
