import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, ImageBackground,
  ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { supabase } from './supabase';

export default function AuthScreen({ onLogin }) {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { alert('Rellena todos los campos'); return; }
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Error: ' + error.message);
    setCargando(false);
  };

  const handleRegistro = async () => {
    if (!email || !password || !nombre) { alert('Rellena todos los campos'); return; }
    setCargando(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert('Error: ' + error.message);
      setCargando(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        nombre,
        plan: 'free',
        generaciones_hoy: 0,
        ultima_generacion: null,
        pro_until: null,
      });
    }

    alert('Cuenta creada. Revisa tu email para confirmar.');
    setCargando(false);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Image
                source={require('./assets/logo-comelo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.brand}>Comelo</Text>
            <Text style={styles.subtitle}>Planifica mejor. Compra fácil. Come sano.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <TouchableOpacity
                onPress={() => setModo('login')}
                style={[styles.tab, modo === 'login' && styles.tabActive]}
              >
                <Text style={[styles.tabText, modo === 'login' && styles.tabTextActive]}>Entrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModo('registro')}
                style={[styles.tab, modo === 'registro' && styles.tabActive]}
              >
                <Text style={[styles.tabText, modo === 'registro' && styles.tabTextActive]}>Crear cuenta</Text>
              </TouchableOpacity>
            </View>

            {modo === 'registro' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor="#9CA3AF"
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={modo === 'login' ? handleLogin : handleRegistro}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {modo === 'login' ? 'Entrar' : 'Crear cuenta'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerText}>
              {modo === 'login'
                ? 'Tu menú semanal, más inteligente que nunca.'
                : 'Empieza gratis y desbloquea funciones PRO cuando quieras.'}
            </Text>
          </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 52,
  },

  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  brand: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: 'rgba(255,255,255,0.86)',
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 30,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 12,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 5,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#FF7A1A',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#FF7A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  footerText: {
    marginTop: 18,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
