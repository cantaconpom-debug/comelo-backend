require('dotenv').config();
console.log('SUPABASE:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'NO');

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
  res.send('Backend MenuMes funcionando');
});

app.post('/generar-menu', async (req, res) => {
  try {
    const body = req.body;
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
- Personas: ${body.personas}
- Supermercado: ${body.supermercado}
- Calorías por día: ${body.calorias}
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

    res.json(resultado);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
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
      success_url: 'http://172.20.10.6:3000/success',
      cancel_url: 'http://172.20.10.6:3000/cancel',
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


app.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    console.log('🔥 EVENTO:', event.type);

    if (event.type === 'checkout.session.completed') {
      console.log('🔥 checkout completado');

      const session = event.data.object;

      console.log('🧠 metadata:', session.metadata);

      const userId = session.metadata?.userId;

      console.log('👤 userId:', userId);

      if (!userId) {
        console.log('❌ NO HAY USERID');
        return res.status(400).send('No userId');
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('id', userId)
        .select();

      console.log('📦 resultado update:', data);

      if (error) {
        console.log('❌ ERROR SUPABASE:', error);
        return res.status(400).send(error.message);
      }

      console.log('🚀 USUARIO ACTUALIZADO A PRO');
    }

    res.json({ received: true });
  } catch (err) {
    console.log('❌ Error webhook:', err.message);
    res.status(400).send('Webhook error');
  }
});



app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
