#!/bin/bash

echo "🚀 Instalando Comelo..."

# FRONTEND
echo ""
echo "📦 Instalando frontend..."
npm install

# BACKEND
echo ""
echo "📦 Instalando backend..."
cd backend
npm install
cd ..

echo ""
echo "✅ Instalación completada"

echo ""
echo "👉 PASOS SIGUIENTES:"
echo ""
echo "1. Crear backend/.env"
echo "2. Añadir claves:"
echo "   - GEMINI_API_KEY"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - STRIPE_SECRET_KEY"
echo ""
echo "3. Arrancar backend:"
echo "   cd backend && node server.js"
echo ""
echo "4. Arrancar app:"
echo "   EXPO_NO_DOCTOR=1 npx expo start"
