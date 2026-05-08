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


// ===== CONTROL LIMITES IA FREE / PRO =====
async function comprobarLimiteGeneraciones(userId, coste = 1) {
  if (!userId) {
    throw new Error('Usuario no identificado');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, plan, daily_generations, last_generation_date')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('Perfil no encontrado');
  }

  const hoy = new Date().toISOString().slice(0, 10);
  let usados = Number(profile.daily_generations || 0);

  if (profile.last_generation_date !== hoy) {
    usados = 0;

    await supabase
      .from('profiles')
      .update({
        daily_generations: 0,
        last_generation_date: hoy,
      })
      .eq('id', userId);
  }

  const esPro = String(profile.plan || '').toLowerCase() === 'pro';
  const limite = esPro ? 30 : 3;

  if (usados + coste > limite) {
    throw new Error(
      esPro
        ? 'Has agotado tus 30 créditos IA de hoy. Vuelve mañana.'
        : '💎 Has agotado tus 3 créditos FREE de hoy. Hazte Pro para más créditos.'
    );
  }

  const nuevosUsados = usados + coste;

  await supabase
    .from('profiles')
    .update({
      daily_generations: nuevosUsados,
      last_generation_date: hoy,
    })
    .eq('id', userId);

  return {
    usados: nuevosUsados,
    limite,
    disponibles: Math.max(limite - nuevosUsados, 0),
  };
}



app.use(cors());
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
  res.send('Backend MenuMes funcionando');
});


app.post('/uso-ia', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Usuario no identificado' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    const hoy = new Date().toISOString().split('T')[0];
    let usados = Number(profile.daily_generations || 0);

    if (profile.last_generation_date !== hoy) {
      usados = 0;

      await supabase
        .from('profiles')
        .update({
          daily_generations: 0,
          last_generation_date: hoy,
        })
        .eq('id', userId);
    }

    const esPro = (profile.plan || '').toLowerCase() === 'pro';
    const limite = esPro ? 30 : 3;

    res.json({
      plan: esPro ? 'pro' : 'free',
      usados,
      limite,
      disponibles: Math.max(limite - usados, 0),
      costes: {
        generarMenu: 3,
        cambiarReceta: 1,
        escanerNevera: 2,
      },
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/generar-menu', async (req, res) => {
  try {
    const body = req.body;

    await comprobarLimiteGeneraciones(body.userId, 3);
    const comidas = body.plan === 'pro'
      ? body.comidasSeleccionadas
      : ['comida', 'cena'];

    const kcal = Number(body.calorias || 2000);
const kcalMin = Math.round(kcal * 0.95);
const kcalMax = Math.round(kcal * 1.05);

const prompt = `
SOLO JSON válido. Sin markdown.

Genera menú semanal.
Días: 7.
Comidas por día: ${comidas.join(', ')}.
Personas: ${body.personas || 1}.
Kcal/día: ${kcal} rango ${kcalMin}-${kcalMax}.
Preferencias: ${(body.preferencias || []).join(', ') || 'ninguna'}.
Restricciones: ${(body.intolerancias || []).join(', ') || 'ninguna'}.
Supermercado: ${body.supermercado || 'Mercadona'}.
Presupuesto semanal: ${body.presupuesto || 'libre'}.

JSON exacto:
{
 "dias":[
  {
   "dia":1,
   "comidas":[
    {
     "tipo":"comida",
     "nombre":"Plato",
     "calorias":500,
     "tiempo":20,
     "proteinas":30,
     "carbohidratos":50,
     "emoji":"🍽️",
     "dificultad":"Fácil",
     "ingredientes":[{"cantidad":"200g","nombre":"Ingrediente"}],
     "pasos":["Paso breve 1","Paso breve 2"],
     "consejo":"Consejo breve"
    }
   ]
  }
 ],
 "ingredientes":[
  {"nombre":"Ingrediente","cantidad":"1 unidad","precio":1.5,"categoria":"General"}
 ]
}

Reglas:
- Exactamente 7 días.
- Cada día incluye exactamente: ${comidas.join(', ')}.
- Total kcal diario entre ${kcalMin} y ${kcalMax}.
- Máx 4 ingredientes y 4 pasos por receta.
- Pasos de máx 12 palabras.
- Lista compra: 8-14 productos, precios realistas España.
- Si presupuesto=30: barato y repetible.
- Si presupuesto=50: equilibrado.
- Si presupuesto=70: más variedad.
- Si restricciones no son "ninguna", evita ingredientes incompatibles.
- Halal: sin cerdo, jamón, bacon, chorizo ni alcohol.
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
    const { imageBase64, userId } = req.body;

    await comprobarLimiteGeneraciones(userId, 2);

    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta imagen' });
    }

    const prompt = `
SOLO JSON válido. Sin markdown.
Analiza imagen de nevera/despensa.

JSON exacto:
{
 "ingredientesDetectados":["ingrediente"],
 "recetasSugeridas":[
  {
   "nombre":"Receta",
   "emoji":"🍽️",
   "tiempo":20,
   "dificultad":"Fácil",
   "calorias":500,
   "ingredientes":["ingrediente"],
   "idea":"Idea breve"
  }
 ],
 "consejo":"Consejo breve"
}

Reglas:
- Máx 10 ingredientes.
- Máx 3 recetas.
- Recetas saludables y realistas.
- Si la imagen no es clara, devuelve ingredientesDetectados vacío y consejo explicativo.
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

    await comprobarLimiteGeneraciones(body.userId, 1);

    const prompt = `
SOLO JSON válido. Sin markdown.
Genera 1 receta nueva.

Datos:
tipo=${body.tipo || 'comida'}
kcal=${body.calorias || 500}
personas=${body.personas || 1}
preferencias=${(body.preferencias || []).join(', ') || 'ninguna'}
restricciones=${(body.intolerancias || []).join(', ') || 'ninguna'}
supermercado=${body.supermercado || 'Mercadona'}
evitar=${body.nombreAnterior || 'ninguna'}

JSON exacto:
{
 "tipo":"${body.tipo || 'comida'}",
 "nombre":"Plato",
 "calorias":500,
 "tiempo":20,
 "proteinas":30,
 "carbohidratos":50,
 "emoji":"🍽️",
 "dificultad":"Fácil",
 "ingredientes":[{"cantidad":"200g","nombre":"Ingrediente"}],
 "pasos":["Paso breve 1","Paso breve 2"],
 "consejo":"Consejo breve"
}

Reglas:
- No repetir evitar.
- Máx 4 ingredientes y 4 pasos.
- Pasos máx 12 palabras.
- Respetar preferencias y restricciones.
- Kcal cercana al objetivo.
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
