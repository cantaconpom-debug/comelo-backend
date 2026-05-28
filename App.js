import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useState, useEffect, useRef} from 'react';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './supabase';
import AuthScreen from './AuthScreen';
import { iniciarRevenueCat, comprarProMensual, restaurarCompras } from './revenuecat';
import {
  AppState,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
  Image,
  ImageBackground,
  Modal,
  TextInput,
  Linking,
  useWindowDimensions
} from 'react-native';

const BASE_URL = 'https://name-comelo-backend.onrender.com';
const BACKEND_URL = `${BASE_URL}/generar-menu`;

const PREFERENCIAS = [
  { id: 'mediterranea', label: 'Mediterránea', emoji: '🫒', color: '#2d6a4f', bg: '#d8f3dc' },
  { id: 'espanola', label: 'Española', emoji: '🥘', color: '#e76f51', bg: '#fde8e0' },
  { id: 'asiatica', label: 'Asiática', emoji: '🍜', color: '#c1121f', bg: '#fde8e8' },
  { id: 'italiana', label: 'Italiana', emoji: '🍝', color: '#d4742a', bg: '#fef0e0' },
  { id: 'vegetariana', label: 'Vegetariana', emoji: '🥗', color: '#2d6a4f', bg: '#d8f3dc' },
  { id: 'fitness', label: 'Fitness', emoji: '💪', color: '#3a86ff', bg: '#dbeafe' },
  { id: 'rapida', label: 'Rápida', emoji: '⚡', color: '#f4a600', bg: '#fef3c7' },
  { id: 'tradicional', label: 'Tradicional', emoji: '🍲', color: '#bc6c25', bg: '#fde8d0' },
];

const COMIDAS_DIA = [
  { id: 'desayuno', label: 'Desayuno', emoji: '☕' },
  { id: 'almuerzo', label: 'Almuerzo', emoji: '🥪' },
  { id: 'comida', label: 'Comida', emoji: '🍽️' },
  { id: 'merienda', label: 'Merienda', emoji: '🍎' },
  { id: 'cena', label: 'Cena', emoji: '🌙' },
];

const SUPERMERCADOS = [
  { id: 'Mercadona', color: '#00853e', bg: '#e8f8f0', textColor: '#00853e', logo: require('./assets/mercadona.png') },
  { id: 'Carrefour', color: '#004E9A', bg: '#e8f0fa', textColor: '#004E9A', logo: require('./assets/carrefour.png') },
  { id: 'Lidl', color: '#f5c800', bg: '#fffbe8', textColor: '#8a6f00', logo: require('./assets/lidl.svg.png') },
  { id: 'Alcampo', color: '#e63946', bg: '#fde8ea', textColor: '#c1121f', logo: require('./assets/alcampo.jpeg') },
];




const PopIn = ({ children, delay = 0, style }) => {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
};


const FadeSlide = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};


const imagenReceta = (tipo = '', nombre = '') => {
  const texto = `${tipo} ${nombre}`.toLowerCase();

  if (texto.includes('desayuno') || texto.includes('tostada') || texto.includes('huevo')) {
    return 'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=900&q=80';
  }

  if (texto.includes('merienda') || texto.includes('yogur') || texto.includes('frutos')) {
    return 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80';
  }

  if (texto.includes('pasta') || texto.includes('atun') || texto.includes('atún')) {
    return 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80';
  }

  if (texto.includes('pollo') || texto.includes('arroz')) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80';
  }

  if (texto.includes('ensalada') || texto.includes('vegetariana')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80';
  }

  if (texto.includes('cena') || texto.includes('sopa')) {
    return 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80';
  }

  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80';
};


export default function App() {
  const { width } = useWindowDimensions();
  const esTablet = width > 900;
  const [sesion, setSesion] = useState(null);
  const [inicializandoAuth, setInicializandoAuth] = useState(true);
  const [pantalla, setPantalla] = useState('config');
  const [prefs, setPrefs] = useState(['mediterranea']);
  const [personas, setPersonas] = useState('2');
  const [supermercado, setSupermercado] = useState('Mercadona');
  const [calorias, setCalorias] = useState('2000');
  const [presupuesto, setPresupuesto] = useState('50');

const [intolerancias, setIntolerancias] = useState([]);
const [mostrarIntolerancias, setMostrarIntolerancias] = useState(false);
const [mostrarEstilos, setMostrarEstilos] = useState(false);
const [mostrarPersonas, setMostrarPersonas] = useState(false);
const [mostrarSuper, setMostrarSuper] = useState(false);
const [mostrarPresupuesto, setMostrarPresupuesto] = useState(false);
const [mostrarCalorias, setMostrarCalorias] = useState(false);
const [mostrarAvanzada, setMostrarAvanzada] = useState(false);

const intoleranciasOpciones = [
  { id: 'Sin gluten', emoji: '🌾' },
  { id: 'Sin lactosa', emoji: '🥛' },
  { id: 'Sin frutos secos', emoji: '🥜' },
  { id: 'Sin marisco', emoji: '🦐' },
  { id: 'Sin huevo', emoji: '🥚' },
  { id: 'Bajo en azúcar', emoji: '🍭' },
  { id: 'Bajo en sal', emoji: '🧂' },
  { id: 'Halal', emoji: '🥩' },
];

  const [menu, setMenu] = useState(null);
const [remainingGenerations, setRemainingGenerations] = useState(3);
const [usoIA, setUsoIA] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [menuCreadoOk, setMenuCreadoOk] = useState(false);
  const [mostrarCuenta, setMostrarCuenta] = useState(false);

const [escaneandoNevera, setEscaneandoNevera] = useState(false);
const [resultadoNevera, setResultadoNevera] = useState(null);
const [regenerandoRecetaId, setRegenerandoRecetaId] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [comprados, setComprados] = useState({});
  const [recetaModal, setRecetaModal] = useState(null);
  const [recetaDetalle, setRecetaDetalle] = useState(null);
  const [profile, setProfile] = useState(null);
  const [comidasSeleccionadas, setComidasSeleccionadas] = useState(['comida', 'cena']);
  const [proteinasObjetivo, setProteinasObjetivo] = useState('30');
  const [carbohidratosObjetivo, setCarbohidratosObjetivo] = useState('50');

  const esPro = String(profile?.plan || '').trim().toLowerCase() === 'pro';

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSesion(session);
      iniciarRevenueCat(session?.user?.id);

        if (session?.user) {
          cargarPerfil(session.user.id);
          cargarUltimoMenu(session.user.id);
        }
      })
      .catch((error) => {
        console.log('Error obteniendo sesión inicial:', error?.message || error);
        setSesion(null);
      })
      .finally(() => {
        setInicializandoAuth(false);
      });

    const authTimeout = setTimeout(() => {
      console.log('Auth timeout: mostrando login por seguridad');
      setInicializandoAuth(false);
    }, 4000);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      iniciarRevenueCat(session?.user?.id);

      if (session?.user) {
        cargarPerfil(session.user.id);
        cargarUltimoMenu(session.user.id);
      } else {
        setProfile(null);
        setMenu(null);
        setPantalla('config');
      }
    });

    return () => {
      clearTimeout(authTimeout);
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const cargarPerfil = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('Error cargando perfil:', error.message);
      return;
    }

    setProfile(data);
  };

  const cargarUltimoMenu = async (userId) => {
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log('Error cargando último menú:', error.message);
      return;
    }

    if (data && data.length > 0) {
      setMenu({
        dias: data[0].dias || [],
        ingredientes: data[0].ingredientes || [],
      });
    }
  };

  const togglePref = (id) => {
    if (prefs.includes(id)) {
      if (prefs.length === 1) return;
      setPrefs(prefs.filter(p => p !== id));
    } else {
      setPrefs([...prefs, id]);
    }
  };

  const toggleComidaDia = (id) => {
    if (comidasSeleccionadas.includes(id)) {
      if (comidasSeleccionadas.length === 1) return;
      setComidasSeleccionadas(comidasSeleccionadas.filter(c => c !== id));
    } else {
      setComidasSeleccionadas([...comidasSeleccionadas, id]);
    }
  };

  const getSuperData = () => {
    return SUPERMERCADOS.find(s => s.id === supermercado) || SUPERMERCADOS[0];
  };

useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && sesion?.user?.id) {
      cargarPerfil(sesion.user.id);
    }
  });

  return () => sub.remove();
}, [sesion]);

const refrescarPerfil = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    } catch (e) {}
  };

  const hacerPro = async () => {
  try {
    if (!sesion?.user) {
      alert('Debes iniciar sesión');
      return;
    }

    const res = await fetch(`${BASE_URL}/crear-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: sesion.user.id,
        email: sesion.user.email,
      }),
    });

    const data = await res.json();

    console.log('Respuesta backend:', data);

    if (data.url) {
      Linking.openURL(data.url);
    } else {
      alert('Error backend: ' + JSON.stringify(data));
    }
  } catch (error) {
  alert('Error al iniciar pago: ' + error.message);
}
}
  
  const gestionarSuscripcion = async () => {
    try {
      if (!sesion?.user?.email) {
        alert('Debes iniciar sesión');
        return;
      }

      const res = await fetch(`${BASE_URL}/crear-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sesion.user.email }),
      });

      const data = await res.json();

      if (data.url) {
        Linking.openURL(data.url);
      } else {
        alert('No se pudo abrir la gestión de suscripción');
      }
    } catch (e) {
      alert('Error al abrir la suscripción: ' + e.message);
    }
  };


  
  const eliminarCuenta = async () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción eliminará tu cuenta y tus datos asociados. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const userId = data?.session?.user?.id;

              if (!userId) {
                Alert.alert('Error', 'No se ha encontrado una sesión activa.');
                return;
              }

              await supabase.from('menus').delete().eq('user_id', userId);
              await supabase.from('profiles').delete().eq('id', userId);

              await supabase.auth.signOut();

              Alert.alert(
                'Solicitud recibida',
                'Hemos eliminado tus datos de la app. Si necesitas eliminar definitivamente el usuario de autenticación, contacta con soporte.'
              );

              setSesion(null);
              setProfile(null);
              setPantalla('config');
            } catch (error) {
              console.log('Error eliminando cuenta:', error);
              Alert.alert('Error', 'No se ha podido eliminar la cuenta.');
            }
          },
        },
      ]
    );
  };

const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setMenu(null);
    setPantalla('config');
  };

  const analizarImagenNevera = async (imageBase64) => {
    try {
      setEscaneandoNevera(true);

      const res = await fetch(`${BASE_URL}/escanear-nevera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          userId: sesion?.user?.id,
        }),
      });

      const data = await res.json();
      setResultadoNevera(data);
      cargarUsoIA();

    } catch (e) {
      alert('Error escaneando nevera: ' + e.message);
    } finally {
      setEscaneandoNevera(false);
    }
  };

  const escanearNevera = async () => {
    if (!esPro) {
      alert('💎 El escáner de nevera es exclusivo del Plan Pro');
      return;
    }

    Alert.alert(
      'Escáner IA de nevera',
      'Elige cómo quieres añadir la imagen',
      [
        {
          text: '📷 Hacer foto',
          onPress: async () => {
            const permiso = await ImagePicker.requestCameraPermissionsAsync();

            if (!permiso.granted) {
              alert('Necesitamos acceso a la cámara');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              base64: true,
            });

            if (!result.canceled) {
              analizarImagenNevera(result.assets[0].base64);
            }
          },
        },
        {
          text: '🖼️ Galería',
          onPress: async () => {
            const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permiso.granted) {
              alert('Necesitamos acceso a tus fotos');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              base64: true,
            });

            if (!result.canceled) {
              analizarImagenNevera(result.assets[0].base64);
            }
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };



  const cargarUsoIA = async () => {
    try {
      if (!sesion?.user?.id) return;

      const res = await fetch(`${BASE_URL}/uso-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: sesion.user.id }),
      });

      const data = await res.json();

      if (data && typeof data.limite !== 'undefined') {
        setUsoIA(data);
        setRemainingGenerations(data.disponibles);
      }
    } catch (e) {
      console.log('Error cargando créditos IA:', e.message);
    }
  };




  async function activarPlanPro() {
    try {

      const acceso = await comprarProMensual();

      if (!acceso) {
        alert('No se pudo activar Comelo Pro');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ plan: 'pro' })
          .eq('id', user.id);

        setProfile(prev => ({
          ...prev,
          plan: 'pro'
        }));

        alert('🎉 ¡Comelo Pro activado!');
      }

    } catch (e) {
      console.log(e);
      alert('Error activando Pro');
    }
  }

const generarMenu = async () => {
    if (!sesion?.user) return;

    setCargando(true);

    try {
      const comidasParaEnviar = esPro ? comidasSeleccionadas : ['comida', 'cena'];

      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sesion.user.id,
          preferencias: prefs,
          personas: parseInt(personas),
          supermercado,
          calorias: parseInt(calorias),
          presupuesto: esPro ? presupuesto : 'libre',
          intolerancias: esPro ? intolerancias : [],
          plan: esPro ? 'pro' : 'free',
          comidasSeleccionadas: comidasParaEnviar,
          proteinasObjetivo: parseInt(proteinasObjetivo),
          carbohidratosObjetivo: parseInt(carbohidratosObjetivo),
        }),
      });

      const resultado = await res.json();

      if (!res.ok) {
        throw new Error(resultado.error || 'Error generando menú');
      }

      if (!resultado?.dias || !resultado?.ingredientes) {
        throw new Error('El backend no devolvió un menú válido');
      }

      setMenu(resultado);
      cargarUsoIA();
      setPantalla('calendario');

    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };


  const regenerarReceta = async (diaIndex, index, tipo, recetaActual) => {
    try {
      const recetaLoadingId = `${diaIndex}-${index}`;
      setRegenerandoRecetaId(recetaLoadingId);

      if (!esPro) {
        alert('💎 Cambiar una receta concreta es exclusivo del Plan Pro');
        return;
      }

      const res = await fetch(`${BASE_URL}/regenerar-receta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sesion?.user?.id,
          tipo,
          nombreAnterior: recetaActual.nombre,
          calorias: recetaActual.calorias,
          personas: parseInt(personas),
          preferencias: prefs,
          intolerancias,
          supermercado,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error regenerando receta');
      }

      const nuevaReceta = data?.nombre ? data : data?.receta;

      if (!nuevaReceta || !nuevaReceta.nombre) {
        throw new Error('La IA no devolvió una receta válida. Inténtalo de nuevo.');
      }

      const recetaFinal = {
        tipo: nuevaReceta.tipo || tipo,
        nombre: nuevaReceta.nombre || 'Nueva receta',
        calorias: Number(nuevaReceta.calorias || recetaActual.calorias || 500),
        tiempo: Number(nuevaReceta.tiempo || recetaActual.tiempo || 20),
        proteinas: Number(nuevaReceta.proteinas || 0),
        carbohidratos: Number(nuevaReceta.carbohidratos || 0),
        emoji: nuevaReceta.emoji || '🍽️',
        dificultad: nuevaReceta.dificultad || 'Fácil',
        ingredientes: Array.isArray(nuevaReceta.ingredientes) ? nuevaReceta.ingredientes : [],
        pasos: Array.isArray(nuevaReceta.pasos) ? nuevaReceta.pasos : [],
        consejo: nuevaReceta.consejo || 'Receta generada automáticamente.',
      };

      const nuevoMenu = JSON.parse(JSON.stringify(menu));

      nuevoMenu.dias[diaIndex].comidas = nuevoMenu.dias[diaIndex].comidas.map((c, idx) =>
        idx === index ? recetaFinal : c
      );

      setMenu(nuevoMenu);
      cargarUsoIA();
      alert('✅ Receta cambiada correctamente');

    } catch (err) {
      alert('Error regenerando receta: ' + err.message);
    } finally {
      setRegenerandoRecetaId(null);
    }
  };


  const abrirReceta = (receta, tipo) => {
    setRecetaModal({ nombre: receta.nombre, tipo });

    setRecetaDetalle({
      nombre: receta.nombre || 'Receta',
      emoji: receta.emoji || '🍽️',
      tiempo: receta.tiempo || 0,
      calorias: receta.calorias || 0,
      proteinas: receta.proteinas || 0,
      carbohidratos: receta.carbohidratos || 0,
      dificultad: receta.dificultad || 'Fácil',
      ingredientes: receta.ingredientes || [],
      pasos: receta.pasos || [],
      consejo: receta.consejo || '',
    });
  };

  const cerrarReceta = () => {
    setRecetaModal(null);
    setRecetaDetalle(null);
  };

  const emojiComida = (tipo) => {
    if (tipo === 'desayuno') return '☕';
    if (tipo === 'almuerzo') return '🥪';
    if (tipo === 'comida') return '🍽️';
    if (tipo === 'merienda') return '🍎';
    if (tipo === 'cena') return '🌙';
    return '🍽️';
  };

  const totalRecetas = menu?.dias?.reduce((total, d) => {
    return total + (d.comidas?.length || 0);
  }, 0) || 0;


  useEffect(() => {
    cargarFavoritos();
    cargarUsoIA();
  }, [sesion]);

  const cargarFavoritos = async () => {
    try {
      const raw = await AsyncStorage.getItem('comelo_favoritos');
      if (raw) setFavoritos(JSON.parse(raw));
    } catch (e) {}
  };

  const recetaKey = (r) => `${r?.tipo || ''}-${r?.nombre || ''}`.toLowerCase();

  const recetaGuardada = (receta) => {
    return favoritos.some(f => recetaKey(f) === recetaKey(receta));
  };

  const guardarRecetaFavorita = async (receta) => {
    if (!esPro) {
      alert('⭐ Guardar recetas es una función Pro');
      return;
    }

    try {
      const existe = recetaGuardada(receta);
      let nuevos;

      if (existe) {
        nuevos = favoritos.filter(f => recetaKey(f) !== recetaKey(receta));
      } else {
        nuevos = [{ ...receta, guardadaEn: Date.now() }, ...favoritos];
      }

      setFavoritos(nuevos);
      await AsyncStorage.setItem('comelo_favoritos', JSON.stringify(nuevos));
    } catch (e) {
      alert('No se pudo guardar la receta');
    }
  };



  const toggleComprado = (index) => {
    setComprados(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };


  if (inicializandoAuth) {
    return (
      <View style={styles.authLoadingScreen}>
        <Image source={require('./assets/logo-comelo.png')} style={styles.authLoadingLogo} resizeMode="contain" />
        <Text style={styles.authLoadingText}>Preparando Comelo...</Text>
      </View>
    );
  }

  if (!sesion) return <AuthScreen />;

  const superData = getSuperData();

  return (
    <ImageBackground source={require('./assets/fondo.jpg')} style={styles.bgImage} blurRadius={0}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <StatusBar style="dark" />

          <View style={styles.header}>
            <Image
              source={require('./assets/logo-comelo.png')}
              style={{ width: 58, height: 58, borderRadius: 16 }}
              resizeMode="contain"
            />

            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.accountBtn}
              onPress={() => setMostrarCuenta(true)}
            >
              <Text style={styles.accountBtnIcon}>👤</Text>
            </TouchableOpacity>
          </View>

          {mostrarCuenta && (
            <View style={styles.accountOverlay}>
              <View style={styles.accountModal}>
                <View style={styles.accountModalHeader}>
                  <Text style={styles.accountTitle}>Mi cuenta</Text>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => setMostrarCuenta(false)}
                    style={styles.accountCloseBtn}
                  >
                    <Text style={styles.accountCloseTxt}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.accountPlanCard}>
                  <Text style={styles.accountPlanLabel}>Plan actual</Text>
                  <Text style={styles.accountPlanValue}>
                    {(profile?.plan || 'FREE').toUpperCase()}
                  </Text>
                </View>


                <View style={styles.accountProFeatures}>
                  <Text style={styles.accountProTitle}>Funciones Pro incluidas</Text>
                  <Text style={styles.accountProItem}>🍳 Más comidas al día</Text>
                  <Text style={styles.accountProItem}>📊 Macros personalizados</Text>
                  <Text style={styles.accountProItem}>💸 Presupuesto semanal</Text>
                  <Text style={styles.accountProItem}>🚫 Intolerancias avanzadas</Text>
                  <Text style={styles.accountProItem}>📸 Escáner IA de nevera</Text>
                </View>

                {esPro ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.accountMainBtn}
                    onPress={gestionarSuscripcion}
                  >
                    <Text style={styles.accountMainBtnTxt}>
                      ⚙️ Gestionar suscripción
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.accountMainBtn}
                    onPress={hacerPro}
                  >
                    <Text style={styles.accountMainBtnTxt}>
                      💎 Activar Plan Pro
                    </Text>
                  </TouchableOpacity>
                )}

                
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={eliminarCuenta}>
          <Text style={styles.deleteAccountBtnText}>Eliminar cuenta</Text>
        </TouchableOpacity>

<TouchableOpacity
                  activeOpacity={0.82}
                  style={styles.accountLogoutBtn}
                  onPress={cerrarSesion}
                >
                  <Text style={styles.accountLogoutTxt}>Salir de la cuenta</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {pantalla === 'config' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <FadeSlide delay={0} style={styles.heroCard}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroTitle}>Hola 👋</Text>
                  <Text style={styles.heroSub}>Genera tu menú semanal personalizado con IA</Text>
                </View>
                <Text style={styles.heroEmoji}>🥗</Text>
              </FadeSlide>


              
              {!esPro && (
                <View style={styles.limitCard}>
                  <Text style={styles.limitTitle}>⚡ {esPro ? 'Plan PRO' : 'PLAN FREE'}</Text>

                  <Text style={styles.limitText}>
                    Generaciones restantes hoy: {remainingGenerations}/3
                  </Text>

                  {remainingGenerations <= 0 && (
                    <TouchableOpacity
                      activeOpacity={0.82}
                      style={styles.limitBtn}
                      onPress={hacerPro}
                    >
                      <Text style={styles.limitBtnTxt}>
                        Desbloquear ilimitado 🚀
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}


              
              <View style={styles.creditCard}>
                <View style={styles.creditTop}>
                  <View>
                    <Text style={styles.creditTitle}>⚡ Créditos IA</Text>
                    <Text style={styles.creditSub}>
                      {`${usoIA?.disponibles ?? (esPro ? 30 : 3)}/${usoIA?.limite ?? (esPro ? 30 : 3)} disponibles hoy`}
                    </Text>
                  </View>

                  <View style={styles.creditBadge}>
                    <Text style={styles.creditBadgeTxt}>
                      {(profile?.plan || 'free').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.creditBarBg}>
                  <View
                    style={[
                      styles.creditBarFill,
                      {
                        width: `${Math.max(((usoIA?.disponibles ?? (esPro ? 30 : 3)) / (usoIA?.limite ?? (esPro ? 30 : 3))) * 100, 4)}%`
                      }
                    ]}
                  />
                </View>

                <View style={styles.creditCosts}>
                  <Text style={styles.creditCost}>🍽️ Menú: 3</Text>
                  <Text style={styles.creditCost}>🔄 Receta: 1</Text>
                  <Text style={styles.creditCost}>📸 Nevera: 2</Text>
                </View>

                {!esPro && usoIA?.disponibles <= 0 && (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.creditBtn}
                    onPress={hacerPro}
                  >
                    <Text style={styles.creditBtnTxt}>
                      Conseguir más créditos con Pro 🚀
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dashboardWrap}>
                <View style={styles.dashboardHeader}>
                  <View>
                    <Text style={styles.dashboardTitle}>Tu plan de hoy</Text>
                    <Text style={styles.dashboardSub}>Resumen rápido de tu objetivo semanal</Text>
                  </View>
                  <View style={styles.dashboardBadge}>
                    <Text style={styles.dashboardBadgeTxt}>IA</Text>
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🔥</Text>
                    <Text style={styles.statNum}>{calorias}</Text>
                    <Text style={styles.statLbl}>kcal/día</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>👥</Text>
                    <Text style={styles.statNum}>{personas}</Text>
                    <Text style={styles.statLbl}>personas</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🥗</Text>
                    <Text style={styles.statNum}>{prefs.length || 0}</Text>
                    <Text style={styles.statLbl}>estilos</Text>
                  </View>
                </View>

                <View style={styles.todayCard}>
                  <View style={styles.todayIconBox}>
                    <Text style={styles.todayIcon}>🍽️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.todayTitle}>Menú inteligente</Text>
                    <Text style={styles.todayText}>
                      Comelo ajustará recetas, compra y calorías según tus preferencias.
                    </Text>
                  </View>
                </View>
              </View>





              <View style={styles.mealsHero}>

                <View style={styles.mealsHeroTop}>
                  <View>
                    <Text style={styles.mealsHeroTitle}>
                      🍽️ Tus comidas del día
                    </Text>

                    <Text style={styles.mealsHeroSub}>
                      Personaliza qué comidas quieres incluir en tu menú semanal.
                    </Text>
                  </View>

                  {esPro && (
                    <View style={styles.mealsProBadge}>
                      <Text style={styles.mealsProBadgeTxt}>PRO</Text>
                    </View>
                  )}
                </View>

                <View style={styles.chipRow}>
                  {COMIDAS_DIA.map(c => {
                    const permitidoFree = ['comida', 'cena'].includes(c.id);
                    const bloqueado = !esPro && !permitidoFree;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        key={c.id}
                        onPress={() => {
                          if (bloqueado) {
                            alert('💎 Desayuno, almuerzo y merienda son funciones Pro');
                            return;
                          }
                          toggleComidaDia(c.id);
                        }}
                        style={[
                          styles.chip,
                          comidasSeleccionadas.includes(c.id) && styles.chipActivo,
                          bloqueado && styles.chipBloqueado
                        ]}
                      >
                        <Text style={styles.chipEmoji}>{c.emoji}</Text>

                        <Text style={[
                          styles.chipTxt,
                          comidasSeleccionadas.includes(c.id) && styles.chipTxtActivo,
                          bloqueado && styles.chipTxtBloqueado
                        ]}>
                          {c.label}
                        </Text>

                        {bloqueado && (
                          <Text style={styles.chipProMini}>PRO</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!esPro && (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.mealsLocked}
                    onPress={hacerPro}
                  >
                    <Text style={styles.mealsLockedTitle}>
                      🔒 Desbloquea más comidas
                    </Text>

                    <Text style={styles.mealsLockedSub}>
                      Con Pro podrás añadir desayuno, almuerzo y merienda.
                    </Text>
                  </TouchableOpacity>
                )}

              </View>


              
              {!esPro && (
                <View style={styles.limitCard}>
                  <Text style={styles.limitTitle}>⚡ {esPro ? 'Plan PRO' : 'PLAN FREE'}</Text>

                  <Text style={styles.limitText}>
                    Generaciones restantes hoy: {remainingGenerations}/3
                  </Text>

                  {remainingGenerations <= 0 && (
                    <TouchableOpacity
                      activeOpacity={0.82}
                      style={styles.limitBtn}
                      onPress={hacerPro}
                    >
                      <Text style={styles.limitBtnTxt}>
                        Desbloquear ilimitado 🚀
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}


              <View style={styles.dashboardWrap}>
                <View style={styles.dashboardHeader}>
                  <View>
                    <Text style={styles.dashboardTitle}>Tu plan de hoy</Text>
                    <Text style={styles.dashboardSub}>Resumen rápido de tu objetivo semanal</Text>
                  </View>
                  <View style={styles.dashboardBadge}>
                    <Text style={styles.dashboardBadgeTxt}>IA</Text>
                  </View>
                </View>
              <TouchableOpacity activeOpacity={0.82} style={styles.accordionHeader} onPress={() => setMostrarEstilos(!mostrarEstilos)}>
                <View>
                  <Text style={styles.accordionTitle}>🍽️ Estilo de cocina</Text>
                  <Text style={styles.accordionSub}>{prefs.length ? `${prefs.length} seleccionados` : 'Toca para elegir'}</Text>
                </View>
                <Text style={styles.accordionArrow}>{mostrarEstilos ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {mostrarEstilos && (
              <View style={styles.prefGrid}>
                {PREFERENCIAS.map(p => (
                  <TouchableOpacity activeOpacity={0.82}
                    key={p.id}
                    onPress={() => togglePref(p.id)}
                    style={[
                      styles.prefCard,
                      prefs.includes(p.id) && { borderColor: p.color, backgroundColor: p.bg }
                    ]}
                  >
                    <Text style={styles.prefEmoji}>{p.emoji}</Text>
                    <Text style={[
                      styles.prefLabel,
                      prefs.includes(p.id) && { color: p.color, fontWeight: '600' }
                    ]}>
                      {p.label}
                    </Text>

                    {prefs.includes(p.id) && (
                      <View style={[styles.prefCheck, { backgroundColor: p.color }]}>
                        <Text style={styles.prefCheckTxt}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              )}

              <TouchableOpacity activeOpacity={0.82} style={styles.accordionHeader} onPress={() => setMostrarPersonas(!mostrarPersonas)}>
                <View>
                  <Text style={styles.accordionTitle}>👥 Número de personas</Text>
                  <Text style={styles.accordionSub}>{personas} persona{personas === '1' ? '' : 's'}</Text>
                </View>
                <Text style={styles.accordionArrow}>{mostrarPersonas ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {mostrarPersonas && (
              <View style={styles.chipRow}>
                {[
                  { val: '1', emoji: '👤', label: '1 persona' },
                  { val: '2', emoji: '👥', label: '2 personas' },
                  { val: '3', emoji: '👨‍👩‍👦', label: '3 personas' },
                  { val: '4', emoji: '👨‍👩‍👧‍👦', label: '4 personas' },
                ].map(n => (
                  <TouchableOpacity activeOpacity={0.82}
                    key={n.val}
                    onPress={() => setPersonas(n.val)}
                    style={[styles.chip, personas === n.val && styles.chipActivo]}
                  >
                    <Text style={styles.chipEmoji}>{n.emoji}</Text>
                    <Text style={[styles.chipTxt, personas === n.val && styles.chipTxtActivo]}>
                      {n.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              )}

              <TouchableOpacity activeOpacity={0.82} style={styles.accordionHeader} onPress={() => setMostrarSuper(!mostrarSuper)}>
                <View>
                  <Text style={styles.accordionTitle}>🛒 Supermercado</Text>
                  <Text style={styles.accordionSub}>{supermercado}</Text>
                </View>
                <Text style={styles.accordionArrow}>{mostrarSuper ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {mostrarSuper && (
              <View style={styles.superGrid}>
                {SUPERMERCADOS.map(s => (
                  <TouchableOpacity activeOpacity={0.82}
                    key={s.id}
                    onPress={() => setSupermercado(s.id)}
                    style={[
                      styles.superCard,
                      supermercado === s.id && { borderColor: s.color, backgroundColor: s.bg }
                    ]}
                  >
                    <Image source={s.logo} style={styles.superLogo} resizeMode="contain" />
                    <Text style={[
                      styles.superNombre,
                      supermercado === s.id && { color: s.textColor, fontWeight: '700' }
                    ]}>
                      {s.id}
                    </Text>

                    {supermercado === s.id && (
                      <View style={[styles.superCheck, { backgroundColor: s.color }]}>
                        <Text style={styles.superCheckTxt}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              )}

              
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.advancedHeader}
                onPress={() => setMostrarAvanzada(!mostrarAvanzada)}
              >
                <View>
                  <Text style={styles.advancedTitle}>⚙️ Configuración avanzada</Text>
                  <Text style={styles.advancedSub}>
                    Estilos, personas, supermercado, macros, presupuesto e intolerancias
                  </Text>
                </View>
                <Text style={styles.advancedArrow}>{mostrarAvanzada ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {mostrarAvanzada && (
              <View style={styles.advancedBox}>

              <TouchableOpacity activeOpacity={0.82} style={styles.accordionHeader} onPress={() => setMostrarPresupuesto(!mostrarPresupuesto)}>
                <View>
                  <Text style={styles.accordionTitle}>💸 Presupuesto semanal</Text>
                  <Text style={styles.accordionSub}>{esPro ? `${presupuesto}€ semanales` : 'Función Pro'}</Text>
                </View>
                <Text style={styles.accordionArrow}>{mostrarPresupuesto ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {mostrarPresupuesto && (
              <View>

              {!esPro && (
                <View style={styles.budgetLockedInfo}>
                  <Text style={styles.budgetLockedTitle}>💎 Función Pro</Text>
                  <Text style={styles.budgetLockedText}>
                    Elige presupuesto semanal y la IA ajustará recetas y lista de compra a tu bolsillo.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.budgetLockedBtn}
                    onPress={hacerPro}
                  >
                    <Text style={styles.budgetLockedBtnTxt}>Activar Pro</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[
                styles.budgetGrid,
                !esPro && styles.budgetGridLocked
              ]}>
                {[
                  { val: '30', emoji: '💸', label: '30€', sub: 'Económico' },
                  { val: '50', emoji: '🛒', label: '50€', sub: 'Equilibrado' },
                  { val: '70', emoji: '🥩', label: '70€', sub: 'Premium' },
                  { val: 'libre', emoji: '✨', label: 'Libre', sub: 'Sin límite' },
                ].map(b => (
                  <TouchableOpacity
                    key={b.val}
                    activeOpacity={0.82}
                    onPress={() => {
                      if (!esPro) {
                        alert('💎 El modo presupuesto es exclusivo del Plan Pro');
                        return;
                      }
                      setPresupuesto(b.val);
                    }}
                    style={[
                      styles.budgetCard,
                      presupuesto === b.val && styles.budgetCardActivo,
                      !esPro && styles.budgetCardLocked
                    ]}
                  >
                    <Text style={styles.budgetEmoji}>{b.emoji}</Text>
                    <Text style={[
                      styles.budgetLabel,
                      presupuesto === b.val && styles.budgetLabelActivo
                    ]}>
                      {b.label}
                    </Text>
                    <Text style={styles.budgetSub}>{b.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              
              <Text style={styles.seccionLabel}>Restricciones alimentarias</Text>

              <View style={styles.intoleranciasBox}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  style={styles.intoleranciasHeader}
                  onPress={() => {
                    if (!esPro) {
                      alert('💎 Las restricciones alimentarias son exclusivas del Plan Pro');
                      return;
                    }
                    setMostrarIntolerancias(!mostrarIntolerancias);
                  }}
                >
                  <View>
                    <Text style={styles.intoleranciasTitle}>🚫 Intolerancias y preferencias</Text>
                    <Text style={styles.intoleranciasSub}>
                      {esPro
                        ? intolerancias.length > 0
                          ? `${intolerancias.length} seleccionadas`
                          : 'Toca para elegir restricciones'
                        : 'Disponible en Plan Pro'}
                    </Text>
                  </View>

                  <Text style={styles.intoleranciasArrow}>
                    {mostrarIntolerancias ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {!esPro && (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.intoleranciasProBtn}
                    onPress={hacerPro}
                  >
                    <Text style={styles.intoleranciasProBtnTxt}>Activar Pro</Text>
                  </TouchableOpacity>
                )}

                {esPro && mostrarIntolerancias && (
                  <View style={styles.intoleranciasGrid}>
                    {intoleranciasOpciones.map(op => {
                      const active = intolerancias.includes(op.id);

                      return (
                        <TouchableOpacity
                          key={op.id}
                          activeOpacity={0.82}
                          style={[
                            styles.intoleranciaChip,
                            active && styles.intoleranciaChipActivo
                          ]}
                          onPress={() => {
                            if (active) {
                              setIntolerancias(intolerancias.filter(i => i !== op.id));
                            } else {
                              setIntolerancias([...intolerancias, op.id]);
                            }
                          }}
                        >
                          <Text style={styles.intoleranciaEmoji}>{op.emoji}</Text>
                          <Text style={[
                            styles.intoleranciaTxt,
                            active && styles.intoleranciaTxtActivo
                          ]}>
                            {op.id}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              </View>
              )}


              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.accordionHeader}
                onPress={() => {
                  if (!esPro) {
                    alert('💎 Las intolerancias son exclusivas del Plan Pro');
                    return;
                  }
                  setMostrarIntolerancias(!mostrarIntolerancias);
                }}
              >
                <View>
                  <Text style={styles.accordionTitle}>🚫 Intolerancias</Text>
                  <Text style={styles.accordionSub}>
                    {esPro
                      ? intolerancias.length
                        ? `${intolerancias.length} seleccionadas`
                        : 'Toca para elegir'
                      : 'Función Pro'}
                  </Text>
                </View>

                <Text style={styles.accordionArrow}>
                  {mostrarIntolerancias ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {!esPro && (
                <View style={styles.budgetLockedInfo}>
                  <Text style={styles.budgetLockedTitle}>💎 Función Pro</Text>

                  <Text style={styles.budgetLockedText}>
                    Personaliza intolerancias y restricciones alimentarias avanzadas.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.budgetLockedBtn}
                    onPress={hacerPro}
                  >
                    <Text style={styles.budgetLockedBtnTxt}>
                      Activar Pro
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {esPro && mostrarIntolerancias && (
                <View style={styles.intoleranciasGrid}>
                  {intoleranciasOpciones.map(op => {
                    const active = intolerancias.includes(op.id);

                    return (
                      <TouchableOpacity
                        key={op.id}
                        activeOpacity={0.82}
                        style={[
                          styles.intoleranciaChip,
                          active && styles.intoleranciaChipActivo
                        ]}
                        onPress={() => {
                          if (active) {
                            setIntolerancias(intolerancias.filter(i => i !== op.id));
                          } else {
                            setIntolerancias([...intolerancias, op.id]);
                          }
                        }}
                      >
                        <Text style={styles.intoleranciaEmoji}>{op.emoji}</Text>
                        <Text style={[
                          styles.intoleranciaTxt,
                          active && styles.intoleranciaTxtActivo
                        ]}>
                          {op.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

<TouchableOpacity activeOpacity={0.82} style={styles.accordionHeader} onPress={() => setMostrarCalorias(!mostrarCalorias)}>
                <View>
                  <Text style={styles.accordionTitle}>🔥 Calorías diarias</Text>
                  <Text style={styles.accordionSub}>{calorias} kcal/día</Text>
                </View>
                <Text style={styles.accordionArrow}>{mostrarCalorias ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {mostrarCalorias && (
              <View style={styles.chipRow}>
                {[
                  { val: '1200', emoji: '🥗', label: '1200 kcal' },
                  { val: '1500', emoji: '🥙', label: '1500 kcal' },
                  { val: '1800', emoji: '🍲', label: '1800 kcal' },
                  { val: '2000', emoji: '🍱', label: '2000 kcal' },
                  { val: '2200', emoji: '🍛', label: '2200 kcal' },
                  { val: '2500', emoji: '🍖', label: '2500 kcal' },
                  { val: '2800', emoji: '🥘', label: '2800 kcal' },
                  { val: '3000', emoji: '🏋️', label: '3000 kcal' },
                ].map(c => (
                  <TouchableOpacity activeOpacity={0.82}
                    key={c.val}
                    onPress={() => setCalorias(c.val)}
                    style={[styles.chip, calorias === c.val && styles.chipActivo]}
                  >
                    <Text style={styles.chipEmoji}>{c.emoji}</Text>
                    <Text style={[styles.chipTxt, calorias === c.val && styles.chipTxtActivo]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              )}

              </View>
              )}

<PopIn delay={260} style={{ width: '100%' }}><TouchableOpacity activeOpacity={0.82} style={styles.btnGenerar} onPress={generarMenu} disabled={cargando}>
                {cargando ? (
                  <View style={styles.btnGenerarInner}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.btnGenerarTxt}>Generando tu menú...</Text>
                  </View>
                ) : (
                  <View style={styles.btnGenerarInner}>
                    <Text style={styles.btnGenerarIcon}>✦</Text>
                    <Text style={styles.btnGenerarTxt}>Generar menú semanal</Text>
                  </View>
                )}
              </TouchableOpacity></PopIn>

              <View style={{ height: 50 }} />
              </View>
            </ScrollView>
          )}


          {pantalla === 'ia' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.iaHero}>
                <Text style={styles.iaHeroEmoji}>🤖</Text>
                <Text style={styles.iaHeroTitle}>Herramientas IA</Text>
                <Text style={styles.iaHeroSub}>
                  Funciones inteligentes para cocinar mejor, ahorrar tiempo y aprovechar lo que ya tienes en casa.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                style={styles.scanCard}
                onPress={escanearNevera}
              >
                <View style={styles.scanLeft}>
                  <Text style={styles.scanEmoji}>📸</Text>

                  <View>
                    <Text style={styles.scanTitle}>
                      Escáner IA de nevera
                    </Text>

                    <Text style={styles.scanSub}>
                      Haz una foto y Comelo detectará ingredientes para sugerirte recetas.
                    </Text>
                  </View>
                </View>

                <Text style={styles.scanArrow}>→</Text>
              </TouchableOpacity>

              {escaneandoNevera && (
                <View style={styles.scanLoading}>
                  <ActivityIndicator size="large" color="#FF8A1F" />
                  <Text style={styles.scanLoadingTxt}>
                    Analizando ingredientes...
                  </Text>
                </View>
              )}

              {resultadoNevera && (
                <View style={styles.scanResultBox}>

                  <Text style={styles.scanResultTitle}>
                    🥦 Ingredientes detectados
                  </Text>

                  <View style={styles.scanIngredientsWrap}>
                    {(resultadoNevera.ingredientesDetectados || []).map((ing, i) => (
                      <View key={i} style={styles.scanIngredientChip}>
                        <Text style={styles.scanIngredientTxt}>
                          {ing}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.scanResultTitle, { marginTop: 18 }]}>
                    🍽️ Recetas sugeridas
                  </Text>

                  {(resultadoNevera.recetasSugeridas || []).map((r, i) => (
                    <View key={i} style={styles.scanRecipeCard}>
                      <Text style={styles.scanRecipeName}>
                        {r.emoji || '🍽️'} {r.nombre}
                      </Text>

                      <Text style={styles.scanRecipeMeta}>
                        🔥 {r.calorias} kcal · ⏱ {r.tiempo} min
                      </Text>

                      <Text style={styles.scanRecipeIdea}>
                        {r.idea}
                      </Text>
                    </View>
                  ))}

                </View>
              )}

              

              <View style={{ height: 50 }} />
            </ScrollView>
          )}



          {pantalla === 'calendario' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

              <View style={styles.menuTopSection}>



              <View style={styles.favBox}>
                <View style={styles.favHeader}>
                  <View>
                    <Text style={styles.favTitle}>⭐ Recetas guardadas</Text>
                    <Text style={styles.favSub}>
                      {esPro ? `${favoritos.length} recetas favoritas` : 'Disponible en Plan Pro'}
                    </Text>
                  </View>
                  {!esPro && (
                    <TouchableOpacity style={styles.favProBtn} onPress={hacerPro}>
                      <Text style={styles.favProBtnTxt}>Pro</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {esPro && favoritos.length > 0 ? (
                  favoritos.slice(0, 3).map((receta, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.favItem}
                      onPress={() => abrirReceta(receta, receta.tipo)}
                    >
                      <Text style={styles.favEmoji}>{receta.emoji || '🍽️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.favName}>{receta.nombre}</Text>
                        <Text style={styles.favMeta}>🔥 {receta.calorias} kcal · ⏱ {receta.tiempo}m</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.favEmpty}>
                    {esPro ? 'Guarda tus recetas favoritas desde el menú semanal.' : 'Hazte Pro para guardar recetas y repetir tus favoritas.'}
                  </Text>
                )}
              </View>


              </View>


              {!menu ? (
                <View style={styles.vacio}>
                  <Text style={styles.vacioEmoji}>📅</Text>
                  <Text style={styles.vacioTitulo}>Sin menú todavía</Text>
                  <Text style={styles.vacioSub}>Ve a Inicio y genera tu plan semanal</Text>
                  <TouchableOpacity activeOpacity={0.82} style={styles.vacioBtn} onPress={() => setPantalla('config')}>
                    <Text style={styles.vacioBtnTxt}>Ir a configurar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.resumenCard}>
                    <View style={styles.resumenItem}>
                      <Text style={styles.resumenEmoji}>📅</Text>
                      <Text style={styles.resumenNum}>7</Text>
                      <Text style={styles.resumenLbl}>días</Text>
                    </View>

                    <View style={styles.resumenDivider} />

                    <View style={styles.resumenItem}>
                      <Text style={styles.resumenEmoji}>🍽️</Text>
                      <Text style={styles.resumenNum}>{totalRecetas}</Text>
                      <Text style={styles.resumenLbl}>recetas</Text>
                    </View>

                    <View style={styles.resumenDivider} />

                    <View style={styles.resumenItem}>
                      <Text style={styles.resumenEmoji}>🔥</Text>
                      <Text style={styles.resumenNum}>{calorias}</Text>
                      <Text style={styles.resumenLbl}>kcal/día</Text>
                    </View>
                  </View>

                  <Text style={styles.tapHint}>Toca cualquier comida para ver la receta</Text>

                  {menu.dias?.map((d, diaIndex) => {
                    const comidasDelDia = d.comidas || [];

                    const totalCalorias = comidasDelDia.reduce(
                      (suma, item) => suma + Number(item.calorias || 0),
                      0
                    );

                    return (
                      <View key={diaIndex} style={styles.diaCard}>
                        <View style={styles.diaHeader}>
                          <View style={styles.diaBadge}>
                            <Text style={styles.diaBadgeTxt}>DÍA {d.dia}</Text>
                          </View>
                          <Text style={styles.diaTotal}>🔥 {totalCalorias} kcal</Text>
                        </View>

                        <View style={styles.comidasWrap}>
                          {comidasDelDia.map((item, index) => (
                            <TouchableOpacity activeOpacity={0.82}
                              key={index}
                              style={styles.comidaProCard}
                              onPress={() => abrirReceta(item, item.tipo)}
                            >
                              <Image
                                source={{ uri: imagenReceta(item.tipo, item.nombre) }}
                                style={styles.comidaImg}
                                resizeMode="cover"
                              />
                              <Text style={styles.diaTipoEmoji}>{emojiComida(item.tipo)}</Text>
                              <Text style={styles.diaTipo}>{String(item.tipo).toUpperCase()}</Text>
                              <Text style={styles.diaNombre}>{item.nombre}</Text>

                              <Text style={styles.diaMeta}>
                                🔥 {item.calorias} · ⏱ {item.tiempo}m
                              </Text>

                              {esPro && (
                                <Text style={styles.diaMeta}>
                                  💪 {item.proteinas || 0}g · 🍚 {item.carbohidratos || 0}g
                                </Text>
                              )}

                              {esPro && (
                                <TouchableOpacity
                                  activeOpacity={0.82}
                                  style={[
                                    styles.regenBtn,
                                    regenerandoRecetaId === `${diaIndex}-${index}` && styles.regenBtnLoading
                                  ]}
                                  disabled={regenerandoRecetaId === `${diaIndex}-${index}`}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    regenerarReceta(diaIndex, index, item.tipo, item);
                                  }}
                                >
                                  {regenerandoRecetaId === `${diaIndex}-${index}` ? (
                                    <View style={styles.regenLoadingRow}>
                                      <ActivityIndicator size="small" color="#FFFFFF" />
                                      <Text style={styles.regenBtnTxt}>Cambiando receta...</Text>
                                    </View>
                                  ) : (
                                    <Text style={styles.regenBtnTxt}>🔄 Cambiar receta</Text>
                                  )}
                                </TouchableOpacity>
                              )}

                              <Text style={styles.verReceta}>Ver receta →</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              <View style={{ height: 50 }} />
            </ScrollView>
          )}

          {pantalla === 'compra' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {!menu ? (
                <View style={styles.vacio}>
                  <Text style={styles.vacioEmoji}>🛒</Text>
                  <Text style={styles.vacioTitulo}>Lista vacía</Text>
                  <Text style={styles.vacioSub}>Genera tu menú para ver la lista de la compra</Text>
                  <TouchableOpacity activeOpacity={0.82} style={styles.vacioBtn} onPress={() => setPantalla('config')}>
                    <Text style={styles.vacioBtnTxt}>Ir a configurar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={[styles.totalBanner, { backgroundColor: superData.bg, borderColor: superData.color }]}>
                    <View>
                      <Text style={styles.totalBannerLbl}>Total estimado</Text>
                      <Text style={[styles.totalBannerNum, { color: superData.textColor }]}>
                        {(menu.ingredientes || []).reduce((s, i) => s + Number(i.precio || 0), 0).toFixed(2)}€
                      </Text>
                      <Text style={styles.totalBannerItems}>
                        {(menu.ingredientes || []).length} productos
                      </Text>
                    </View>
                    <Image source={superData.logo} style={styles.superLogoBanner} resizeMode="contain" />
                  </View>

                  {(menu.ingredientes || []).map((ing, i) => (
                    <TouchableOpacity
                    key={i}
                    style={[
                      styles.ingCard,
                      comprados[i] && styles.ingCardChecked
                    ]}
                    activeOpacity={0.82}
                    onPress={() => toggleComprado(i)}
                  >
                      <View style={styles.ingLeft}>
                        <View style={[
                          styles.checkCompra,
                          comprados[i] && styles.checkCompraActivo
                        ]}>
                          <Text style={styles.checkCompraTxt}>
                            {comprados[i] ? '✓' : ''}
                          </Text>
                        </View>
                        <View style={[styles.ingDot, { backgroundColor: superData.color }]} />
                        <View>
                          <Text style={styles.ingNombre}>{ing.nombre}</Text>
                          <Text style={styles.ingCantidad}>{ing.cantidad} · {ing.categoria}</Text>
                        </View>
                      </View>
                      <Text style={[styles.ingPrecio, { color: superData.textColor }]}>
                        {Number(ing.precio || 0).toFixed(2)}€
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <View style={{ height: 50 }} />
            </ScrollView>
          )}


          {cargando && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingCard}>
                <View style={styles.loadingIconWrap}>
                  <ActivityIndicator size="large" color="#FF8A1F" />
                </View>

                <Text style={styles.loadingTitle}>🤖 Creando tu menú</Text>

                <Text style={styles.loadingSub}>
                  La IA está preparando tus recetas, calorías y lista de compra.
                  Puede tardar unos segundos.
                </Text>

                <View style={styles.loadingSteps}>
                  <Text style={styles.loadingStep}>🥗 Buscando recetas equilibradas</Text>
                  <Text style={styles.loadingStep}>🔥 Calculando calorías y macros</Text>
                  <Text style={styles.loadingStep}>🛒 Preparando lista de compra</Text>
                  <Text style={styles.loadingStep}>✨ Personalizando tu plan semanal</Text>
                </View>
              </View>
            </View>
          )}


          {menuCreadoOk && (
            <View style={styles.successOverlay}>
              <View style={styles.successCard}>

                <Text style={styles.successEmoji}>✅</Text>

                <Text style={styles.successTitle}>
                  Menú creado correctamente
                </Text>

                <Text style={styles.successSub}>
                  7 días · lista de compra lista
                </Text>

                <TouchableOpacity activeOpacity={0.82}
                  style={styles.successBtn}
                  onPress={() => {
                    setMenuCreadoOk(false);
                    setPantalla('calendario');
                  }}
                >
                  <Text style={styles.successBtnTxt}>
                    Ver menú
                  </Text>
                </TouchableOpacity>

              </View>
            </View>
          )}

          <PopIn delay={180} style={styles.bottomNav}>
            {[
              { id: 'config', label: 'Inicio', emoji: '🏠' },
              { id: 'ia', label: 'IA', emoji: '🤖' },
              { id: 'calendario', label: 'Menú', emoji: '📅' },
              { id: 'compra', label: 'Compra', emoji: '🛒' },
            ].map(p => (
              <TouchableOpacity activeOpacity={0.82}
                key={p.id}
                onPress={() => setPantalla(p.id)}
                style={styles.bottomNavBtn}
              >
                <View style={[styles.bottomNavIcon, pantalla === p.id && styles.bottomNavIconActivo]}>
                  <Text style={styles.bottomNavEmoji}>{p.emoji}</Text>
                </View>
                <Text style={[styles.bottomNavLbl, pantalla === p.id && styles.bottomNavLblActivo]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </PopIn>
        </SafeAreaView>
      </View>

      <Modal visible={!!recetaModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity activeOpacity={0.82} onPress={cerrarReceta} style={styles.modalCerrar}>
              <Text style={styles.modalCerrarTxt}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>

          {recetaDetalle ? (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.recetaHero}>
                <Image
                  source={{ uri: imagenReceta(recetaDetalle.tipo, recetaDetalle.nombre) }}
                  style={styles.recetaHeroImg}
                  resizeMode="cover"
                />
                <Text style={styles.recetaEmoji}>{recetaDetalle.emoji || '🍽️'}</Text>
                <Text style={styles.recetaNombre}>{recetaDetalle.nombre}</Text>

                <View style={styles.recetaMetas}>
                  {esPro && (
                    <>
                      <View style={styles.recetaMeta}>
                        <Text style={styles.recetaMetaEmoji}>💪</Text>
                        <Text style={styles.recetaMetaTxt}>{recetaDetalle.proteinas || 0}g prot</Text>
                      </View>

                      <View style={styles.recetaMeta}>
                        <Text style={styles.recetaMetaEmoji}>🍚</Text>
                        <Text style={styles.recetaMetaTxt}>{recetaDetalle.carbohidratos || 0}g carb</Text>
                      </View>
                    </>
                  )}

                  <View style={styles.recetaMeta}>
                    <Text style={styles.recetaMetaEmoji}>⏱</Text>
                    <Text style={styles.recetaMetaTxt}>{recetaDetalle.tiempo} min</Text>
                  </View>

                  <View style={styles.recetaMeta}>
                    <Text style={styles.recetaMetaEmoji}>🔥</Text>
                    <Text style={styles.recetaMetaTxt}>{recetaDetalle.calorias} kcal</Text>
                  </View>

                  <View style={styles.recetaMeta}>
                    <Text style={styles.recetaMetaEmoji}>👨‍🍳</Text>
                    <Text style={styles.recetaMetaTxt}>{recetaDetalle.dificultad}</Text>
                  </View>
                </View>
              </View>


              <TouchableOpacity
                style={[
                  styles.saveRecipeBtn,
                  recetaGuardada(recetaDetalle) && styles.saveRecipeBtnActive
                ]}
                onPress={() => guardarRecetaFavorita(recetaDetalle)}
              >
                <Text style={[
                  styles.saveRecipeBtnTxt,
                  recetaGuardada(recetaDetalle) && styles.saveRecipeBtnTxtActive
                ]}>
                  {recetaGuardada(recetaDetalle) ? '⭐ Receta guardada' : '⭐ Guardar receta'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.recetaSeccion}>🛒 Ingredientes</Text>
              <View style={styles.recetaIngBox}>
                {recetaDetalle.ingredientes?.map((ing, i) => (
                  <View key={i} style={styles.recetaIng}>
                    <View style={styles.recetaIngDot} />
                    <Text style={styles.recetaIngTxt}>
                      <Text style={styles.recetaIngCant}>{ing.cantidad}</Text> {ing.nombre}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.recetaSeccion}>👨‍🍳 Preparación</Text>
              {recetaDetalle.pasos?.map((paso, i) => (
                <View key={i} style={styles.pasoCard}>
                  <View style={styles.pasoNum}>
                    <Text style={styles.pasoNumTxt}>{i + 1}</Text>
                  </View>
                  <Text style={styles.pasoTxt}>{paso}</Text>
                </View>
              ))}

              {recetaDetalle.consejo ? (
                <View style={styles.consejoCard}>
                  <Text style={styles.consejoEmoji}>💡</Text>
                  <Text style={styles.consejoTxt}>{recetaDetalle.consejo}</Text>
                </View>
              ) : null}

              <View style={{ height: 40 }} />
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  authLoadingScreen: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  authLoadingLogo: {
    width: 150,
    height: 150,
    borderRadius: 36,
    marginBottom: 18,
  },
  authLoadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2A26',
    textAlign: 'center',
  },
  bgImage: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  container: { flex: 1 },

  header: {
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  planText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E8E93',
  },

  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F2F6',
  },

  

  planBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 2,
  },

  planBadgePro: {
    backgroundColor: '#FFF1E4',
    borderColor: '#FF8A1F',
  },

  planBadgeFree: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4E6CF5',
  },

  planBadgeTxt: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#111827',
  },


  logoutTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },

  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 120,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  heroCard: {
    marginTop: 0,
    marginBottom: 54,
    backgroundColor: '#FF8A1F',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  heroLeft: { flex: 1 },
  heroTitle: { display: 'none' },
  heroSub: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 31,
  },
  heroEmoji: {
    fontSize: 42,
    marginLeft: 12,
  },

  seccionLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,138,31,0.92)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#FF8A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  prefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  prefCard: {
    width: '48%',
    minHeight: 82,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },

  prefEmoji: {
    fontSize: 20,
    marginRight: 6,
  },

  prefLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '900',
    color: '#8A8A8A',
    lineHeight: 14,
    paddingRight: 2,
    includeFontPadding: false,
  },

  prefCheck: {
    position: 'absolute',
    right: 14,
    top: 27,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  prefCheckTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  chip: {
    width: '48%',
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EFEFEF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },

  chipActivo: {
    borderColor: '#FF8A1F',
    backgroundColor: '#FFF1E4',
  },

  chipEmoji: { fontSize: 22, marginRight: 10 },

  chipTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8A8A8A',
  },

  chipTxtActivo: {
    color: '#FF8A1F',
    fontWeight: '900',
  },

  superGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  superCard: {
    width: '48%',
    minHeight: 105,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EFEFEF',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  superLogo: {
    width: 52,
    height: 52,
    marginBottom: 8,
  },

  superNombre: {
    fontSize: 14,
    fontWeight: '900',
    color: '#8A8A8A',
    textAlign: 'center',
  },

  superCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  superCheckTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  proBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },

  proTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },

  proSub: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
  },

  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 6,
  },

  input: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  proLockedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },

  proLockedTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },

  proLockedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    lineHeight: 23,
    marginBottom: 16,
  },

  proButton: {
    backgroundColor: '#FF8A1F',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },

  proButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  btnGenerar: {
    marginTop: 26,
    marginBottom: 20,
    backgroundColor: '#FF8A1F',
    borderRadius: 24,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnGenerarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnGenerarIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginRight: 8,
  },

  btnGenerarTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },

  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },

  bottomNavBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomNavIcon: {
    width: 58,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  bottomNavIconActivo: {
    backgroundColor: '#FFF1E4',
  },

  bottomNavEmoji: { fontSize: 22 },

  bottomNavLbl: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B5B5B5',
  },

  bottomNavLblActivo: {
    color: '#FF8A1F',
    fontWeight: '900',
  },
});



// ===== ESTILO FINAL MENU Y COMPRA =====
Object.assign(styles, {
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)' },

  resumenCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    marginTop: 18,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenEmoji: { fontSize: 22 },
  resumenNum: { fontSize: 20, fontWeight: '900', color: '#FF8A1F' },
  resumenLbl: { fontSize: 12, fontWeight: '800', color: '#777' },
  resumenDivider: { width: 1, backgroundColor: '#EEE' },

  tapHint: {
    color: '#fff',
    backgroundColor: '#FF8A1F',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: '900',
    marginVertical: 14,
    overflow: 'hidden',
  },

  diaCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },
  diaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diaBadge: {
    backgroundColor: '#FFF1E4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  diaBadgeTxt: { color: '#FF8A1F', fontSize: 12, fontWeight: '900' },
  diaTotal: { color: '#FF8A1F', fontSize: 13, fontWeight: '900' },
  comidasWrap: { marginTop: 14, gap: 12 },

  comidaProCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  diaTipoEmoji: { fontSize: 24 },
  diaTipo: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF8A1F',
    marginTop: 4,
    letterSpacing: 1,
  },
  diaNombre: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginTop: 4,
    lineHeight: 20,
  },
  diaMeta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 6,
  },
  verReceta: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF8A1F',
    marginTop: 10,
  },

  totalBanner: {
    marginTop: 18,
    marginHorizontal: 10,
    marginBottom: 16,
    borderRadius: 26,
    padding: 20,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalBannerLbl: {
    fontSize: 13,
    fontWeight: '900',
    color: '#777',
    textTransform: 'uppercase',
  },
  totalBannerNum: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF8A1F',
  },
  totalBannerItems: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
  },
  superLogoBanner: {
    width: 76,
    height: 76,
  },

  ingCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },
  ingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#FF8A1F',
  },
  ingNombre: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    maxWidth: 220,
  },
  ingCantidad: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 3,
  },
  ingPrecio: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF8A1F',
  },
});


// ===== ESTILO FINAL RECETAS PREMIUM =====
Object.assign(styles, {
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  modalHeader: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 6,
    alignItems: 'flex-end',
    backgroundColor: '#FAFAFA',
  },

  modalCerrar: {
    backgroundColor: '#FFF1E4',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  modalCerrarTxt: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FF8A1F',
  },

  modalBody: {
    flex: 1,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
  },

  recetaHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  recetaEmoji: {
    fontSize: 46,
    marginBottom: 8,
  },

  recetaNombre: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 29,
  },

  recetaMetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },

  recetaMeta: {
    backgroundColor: '#FFF1E4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD7B0',
  },

  recetaMetaEmoji: {
    fontSize: 17,
    marginRight: 6,
  },

  recetaMetaTxt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#C76612',
  },

  recetaSeccion: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: '#FF8A1F',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 22,
    marginBottom: 12,
  },

  recetaIngBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },

  recetaIng: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  recetaIngDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF8A1F',
    marginRight: 11,
  },

  recetaIngTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
    lineHeight: 21,
  },

  recetaIngCant: {
    fontWeight: '900',
    color: '#111827',
  },

  pasoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },

  pasoNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF8A1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  pasoNumTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  pasoTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
    lineHeight: 22,
  },

  consejoCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#FFE0B8',
  },

  consejoEmoji: {
    fontSize: 24,
    marginRight: 10,
  },

  consejoTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#8A4B08',
    lineHeight: 22,
  },
});


// ===== DASHBOARD PREMIUM INICIO =====
Object.assign(styles, {
  dashboardWrap: {
    marginHorizontal: 2,
    marginTop: 0,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 26,
    padding: 18,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },

  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  dashboardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },

  dashboardSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8A8A',
    marginTop: 3,
  },

  dashboardBadge: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FFF1E4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  dashboardBadgeTxt: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FF8A1F',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFF8F1',
    borderRadius: 20,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE1BF',
  },

  statEmoji: {
    fontSize: 23,
    marginBottom: 4,
  },

  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF8A1F',
  },

  statLbl: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A8A8A',
    marginTop: 2,
  },

  todayCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  todayIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#FF8A1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  todayIcon: {
    fontSize: 25,
  },

  todayTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  todayText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 17,
    marginTop: 3,
  },
});


// ===== IMAGENES PREMIUM RECETAS =====
Object.assign(styles, {
  comidaImg: {
    width: '100%',
    height: 118,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: '#FFF1E4',
  },

  comidaProCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  recetaHeroImg: {
    width: '100%',
    height: 190,
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: '#FFF1E4',
  },

  recetaHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});


// ===== LOADING PREMIUM =====
Object.assign(styles, {
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,15,15,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 24,
  },

  loadingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F3F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  loadingIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: '#FFF3E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD5AA',
  },

  loadingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },

  loadingSub: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    color: '#777',
    textAlign: 'center',
    marginBottom: 22,
  },

  loadingSteps: {
    width: '100%',
    gap: 12,
  },

  loadingStep: {
    backgroundColor: '#FFF8F1',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '800',
    color: '#444',
    borderWidth: 1,
    borderColor: '#FFE3C2',
  },
});


// ===== LOADING PREMIUM GENERAR MENU =====
Object.assign(styles, {
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 96,
    backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 22,
  },

  loadingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFEFEF',
    elevation: 12,
  },

  loadingIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: '#FFF1E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#FFD4A3',
  },

  loadingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },

  loadingSub: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },

  loadingSteps: {
    width: '100%',
    gap: 10,
  },

  loadingStep: {
    backgroundColor: '#FFF8F1',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    borderWidth: 1,
    borderColor: '#FFE0BC',
  },
});


// ===== SUCCESS PREMIUM =====
Object.assign(styles, {
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 96,
    backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 24,
  },

  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFEFEF',
    elevation: 12,
  },

  successEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },

  successSub: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },

  successBtn: {
    width: '100%',
    backgroundColor: '#FF8A1F',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },

  successBtnTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});


// ===== ANIMACIONES PREMIUM =====
Object.assign(styles, {
  prefCard: {
    ...styles.prefCard,
    transform: [{ scale: 1 }],
  },

  chip: {
    ...styles.chip,
    transform: [{ scale: 1 }],
  },

  superCard: {
    ...styles.superCard,
    transform: [{ scale: 1 }],
  },

  btnGenerar: {
    ...styles.btnGenerar,
    shadowColor: '#FF8A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },

  bottomNavIconActivo: {
    ...styles.bottomNavIconActivo,
    transform: [{ scale: 1.06 }],
  },
});


// ===== FAVORITOS PRO =====
Object.assign(styles, {
  favBox: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 26,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    elevation: 4,
  },

  favHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  favTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },

  favSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8A8A',
    marginTop: 3,
  },

  favProBtn: {
    backgroundColor: '#FF8A1F',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  favProBtnTxt: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  favItem: {
    backgroundColor: '#FFF8F1',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFE0BC',
  },

  favEmoji: {
    fontSize: 28,
    marginRight: 12,
  },

  favName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  favMeta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 3,
  },

  favEmpty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    lineHeight: 20,
  },

  saveRecipeBtn: {
    width: '100%',
    backgroundColor: '#FFF1E4',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  saveRecipeBtnActive: {
    backgroundColor: '#FF8A1F',
  },

  saveRecipeBtnTxt: {
    color: '#FF8A1F',
    fontSize: 16,
    fontWeight: '900',
  },

  saveRecipeBtnTxtActive: {
    color: '#FFFFFF',
  },
});


// ===== CHECKBOXES LISTA COMPRA =====
Object.assign(styles, {
  ingCardChecked: {
    opacity: 0.55,
    backgroundColor: '#F3F4F6',
  },

  checkCompra: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF8A1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },

  checkCompraActivo: {
    backgroundColor: '#FF8A1F',
  },

  checkCompraTxt: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});


// ===== PRESUPUESTO PREMIUM =====
Object.assign(styles, {
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 8,
  },

  budgetCard: {
    width: '48%',
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  budgetCardActivo: {
    backgroundColor: '#FFF1E4',
    borderColor: '#FF8A1F',
  },

  budgetEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },

  budgetLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },

  budgetLabelActivo: {
    color: '#FF8A1F',
  },

  budgetSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8A8A',
    marginTop: 2,
  },
});


// ===== BLOQUEO PRESUPUESTO PRO =====
Object.assign(styles, {
  budgetLockedInfo: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  budgetLockedTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },

  budgetLockedText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
    marginBottom: 14,
  },

  budgetLockedBtn: {
    backgroundColor: '#FF8A1F',
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
  },

  budgetLockedBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  budgetGridLocked: {
    opacity: 0.45,
  },

  budgetCardLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
});


// ===== INTOLERANCIAS DESPLEGABLE PRO =====
Object.assign(styles, {
  intoleranciasBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    elevation: 3,
  },

  intoleranciasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  intoleranciasTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  intoleranciasSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8A8A',
    marginTop: 3,
  },

  intoleranciasArrow: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF8A1F',
  },

  intoleranciasProBtn: {
    marginTop: 14,
    backgroundColor: '#FF8A1F',
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
  },

  intoleranciasProBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  intoleranciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },

  intoleranciaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  intoleranciaChipActivo: {
    backgroundColor: '#FF8A1F',
    borderColor: '#FF8A1F',
  },

  intoleranciaEmoji: {
    fontSize: 16,
    marginRight: 6,
  },

  intoleranciaTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
  },

  intoleranciaTxtActivo: {
    color: '#FFFFFF',
  },
});


// ===== ACORDEONES PREMIUM CONFIG =====
Object.assign(styles, {
  accordionHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
  },

  accordionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  accordionSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8A8A',
    marginTop: 3,
  },

  accordionArrow: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF8A1F',
  },
});


// ===== INTOLERANCIAS CHIPS =====
Object.assign(styles, {
  intoleranciasProBtn: {
    backgroundColor: '#FF8A1F',
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 14,
  },

  intoleranciasProBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  intoleranciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  intoleranciaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  intoleranciaChipActivo: {
    backgroundColor: '#FF8A1F',
    borderColor: '#FF8A1F',
  },

  intoleranciaEmoji: {
    fontSize: 16,
    marginRight: 6,
  },

  intoleranciaTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
  },

  intoleranciaTxtActivo: {
    color: '#FFFFFF',
  },
});


// ===== BOTON GESTIONAR SUSCRIPCION =====
Object.assign(styles, {
  manageSubBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(17,24,39,0.92)',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  manageSubBtnTxt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});


// ===== NUEVO HEADER PRO =====
Object.assign(styles, {

  proHeaderCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 28,
    padding: 18,
    borderWidth: 2,
    borderColor: '#FF8C1A',
  },

  proHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  proPlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  proBadge: {
    backgroundColor: '#0B1530',
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },

  proCenterInfo: {
    marginLeft: 14,
  },

  proMiniLabel: {
    color: '#7B7B7B',
    fontSize: 13,
    fontWeight: '700',
  },

  proMainLabel: {
    color: '#0B1530',
    fontSize: 28,
    fontWeight: '900',
  },

  proSalirBtn: {
    backgroundColor: '#0B1530',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 20,
  },

  proSalirTxt: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },

  manageSubModernBtn: {
    marginTop: 18,
    borderWidth: 2,
    borderColor: '#FF8C1A',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  manageSubModernTxt: {
    color: '#0B1530',
    fontSize: 20,
    fontWeight: '900',
  },

});


// ===== HEADER PRO LIMPIO =====
Object.assign(styles, {
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    marginBottom: 16,
  },

  proHeaderCard: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 24,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  proHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  proMiniLabel: {
    color: '#7B7B7B',
    fontSize: 12,
    fontWeight: '800',
  },

  proMainLabel: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },

  proSalirBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },

  proSalirTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  manageSubModernBtn: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#FF8A1F',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  manageSubModernTxt: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
});


// ===== MI CUENTA PREMIUM =====
Object.assign(styles, {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    marginBottom: 18,
  },

  accountBtn: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  accountBtnIcon: {
    fontSize: 26,
  },

  accountOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.58)',
    zIndex: 9999,
    justifyContent: 'center',
    padding: 24,
  },

  accountModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 22,
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },

  accountModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  accountTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },

  accountCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountCloseTxt: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginTop: -3,
  },

  accountPlanCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  accountPlanLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A8A8A',
    marginBottom: 4,
  },

  accountPlanValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FF8A1F',
  },

  accountMainBtn: {
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  accountMainBtnTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  accountLogoutBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },

  accountLogoutTxt: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '900',
  },
});


// ===== ESCANER NEVERA IA =====
Object.assign(styles, {

  scanCard: {
    backgroundColor: '#111827',
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  scanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  scanEmoji: {
    fontSize: 38,
    marginRight: 16,
  },

  scanTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  scanSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 18,
    paddingRight: 10,
  },

  scanArrow: {
    color: '#FF8A1F',
    fontSize: 28,
    fontWeight: '900',
  },

  scanLoading: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },

  scanLoadingTxt: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
  },

  scanResultBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginBottom: 18,
  },

  scanResultTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },

  scanIngredientsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  scanIngredientChip: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  scanIngredientTxt: {
    color: '#92400E',
    fontWeight: '900',
    fontSize: 12,
  },

  scanRecipeCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },

  scanRecipeName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  scanRecipeMeta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 6,
  },

  scanRecipeIdea: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
    marginTop: 10,
    fontWeight: '700',
  },

});


// ===== PANTALLA IA PREMIUM =====
Object.assign(styles, {
  iaHero: {
    backgroundColor: '#111827',
    borderRadius: 30,
    padding: 24,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  iaHeroEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },

  iaHeroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  iaHeroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
  },

  iaComingSoon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginTop: 2,
    marginBottom: 18,
  },

  iaComingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },

  iaComingItem: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    paddingVertical: 7,
  },
});


// ===== MENU PREMIUM =====
Object.assign(styles, {

  menuTopSection: {
    marginBottom: 10,
  },

  menuHero: {
    backgroundColor: '#111827',
    borderRadius: 30,
    padding: 24,
    marginBottom: 18,
  },

  menuHeroEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },

  menuHeroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  menuHeroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
  },

});


// ===== CONFIGURACION AVANZADA LIMPIA =====
Object.assign(styles, {
  advancedHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
  },

  advancedTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
  },

  advancedSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8A8A',
    marginTop: 4,
    maxWidth: 260,
    lineHeight: 17,
  },

  advancedArrow: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF8A1F',
  },

  advancedBox: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 26,
    padding: 4,
    marginBottom: 16,
  },
});


// ===== FUNCIONES PRO EN MI CUENTA =====
Object.assign(styles, {
  accountProFeatures: {
    backgroundColor: '#FFF7ED',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  accountProTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },

  accountProItem: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    paddingVertical: 4,
  },
});


// ===== COMIDAS HERO =====
Object.assign(styles, {

  mealsHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },

  mealsHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  mealsHeroTitle: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
  },

  mealsHeroSub: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 260,
  },

  mealsProBadge: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  mealsProBadgeTxt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  mealsLocked: {
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  mealsLockedTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },

  mealsLockedSub: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
  },

});


// ===== COMIDAS FREE/PRO =====
Object.assign(styles, {
  chipBloqueado: {
    opacity: 0.55,
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },

  chipTxtBloqueado: {
    color: '#9CA3AF',
  },

  chipProMini: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 9,
    fontWeight: '900',
    color: '#FF8A1F',
  },
});


// ===== BOTON CAMBIAR RECETA =====
Object.assign(styles, {
  regenBtn: {
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8A1F',
  },

  regenBtnTxt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});


// ===== LOADING CAMBIAR RECETA =====
Object.assign(styles, {
  regenBtnLoading: {
    opacity: 0.9,
  },

  regenLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});


// ===== TARJETA LIMITE FREE =====
Object.assign(styles, {
  limitCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#222',
  },

  limitTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },

  limitText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '700',
  },

  limitBtn: {
    backgroundColor: '#FF8A1F',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },

  limitBtnTxt: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
});


// ===== CREDITOS IA =====
Object.assign(styles, {
  creditCard: {
    backgroundColor: '#111827',
    borderRadius: 26,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#FF8A1F',
  },

  creditTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  creditTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  creditSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },

  creditBadge: {
    backgroundColor: '#FF8A1F',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  creditBadgeTxt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  creditBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    marginTop: 16,
    overflow: 'hidden',
  },

  creditBarFill: {
    height: 10,
    backgroundColor: '#FF8A1F',
    borderRadius: 999,
  },

  creditCosts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  creditCost: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  creditBtn: {
    backgroundColor: '#FF8A1F',
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },

  creditBtnTxt: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '900',
},

logoImage: {
  width: '100%',
  height: '100%',
},


  deleteAccountBtn: {
    backgroundColor: '#FFE8E8',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },

  deleteAccountBtnText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '900',
  },

});