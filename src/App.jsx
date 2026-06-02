import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

const personasCasa = [
  "Paco",
  "P.Alex",
  "Pala",
  "Maik",
  "Chema",
  "P. RobV",
];

const opciones = [
  "Me urge verla",
  "La quiero ver",
  "Puede que sí",
  "No la quiero ver",
];

const plataformas = [
  "Netflix",
  "Prime Video",
  "Disney+",
  "Max",
  "Apple TV",
  "MUBI",
  "YouTube",
  "Cine",
  "Otra",
];

const moods = [
  "Comedia",
  "Acción",
  "Drama",
  "Terror",
  "Familiar",
  "Animada",
  "Para pensar",
  "Clásica",
  "Rara / de culto",
  "Dominguera",
];


function StarRating({ valor, onChange }) {
  const calificacionActual = Number(valor || 0);

  return (
    <div className="estrellas-rating">
      {[1, 2, 3, 4, 5].map((numero) => (
        <button
          key={numero}
          type="button"
          className={numero <= calificacionActual ? "estrella activa" : "estrella"}
          onClick={() => onChange(numero)}
          aria-label={`${numero} estrellas`}
        >
          ★
        </button>
      ))}

      {calificacionActual > 0 && (
        <button
          type="button"
          className="limpiar-estrellas"
          onClick={() => onChange("")}
        >
          quitar
        </button>
      )}
    </div>
  );
}

function App() {
  const [peliculas, setPeliculas] = useState([]);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [persona, setPersona] = useState(personasCasa[0]);
  const [poster, setPoster] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [duracion, setDuracion] = useState("");
  const [mood, setMood] = useState("");

  const [anio, setAnio] = useState("");
  const [generos, setGeneros] = useState("");
  const [reparto, setReparto] = useState("");
  const [tmdbId, setTmdbId] = useState(null);
  const [tmdbScore, setTmdbScore] = useState(null);
  const [trailerKey, setTrailerKey] = useState("");

  const [resultadosTmdb, setResultadosTmdb] = useState([]);
  const [buscandoTmdb, setBuscandoTmdb] = useState(false);
  const [errorTmdb, setErrorTmdb] = useState("");

  const [filtro, setFiltro] = useState("todas");
  const [filtroPlataforma, setFiltroPlataforma] = useState("");
  const [filtroMood, setFiltroMood] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [seleccionHoyAbierta, setSeleccionHoyAbierta] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [peliculaSeleccionadaId, setPeliculaSeleccionadaId] = useState(null);
  const [trailerAbierto, setTrailerAbierto] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [streamingMX, setStreamingMX] = useState([]);
  const [peliculasSimilares, setPeliculasSimilares] = useState([]);

  const peliculaSeleccionada = peliculas.find(
    (pelicula) => pelicula.id === peliculaSeleccionadaId
  );

  useEffect(() => {
    cargarPeliculas();

    const canal = supabase
      .channel("peliculas-cambios")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "peliculas" },
        () => {
          cargarPeliculas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Mejora 3: Películas similares al abrir el modal
  useEffect(() => {
    if (!peliculaSeleccionadaId) {
      setPeliculasSimilares([]);
      return;
    }
    const pelicula = peliculas.find((p) => p.id === peliculaSeleccionadaId);
    if (!pelicula?.tmdb_id) return;

    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    if (!apiKey) return;

    fetch(
      `https://api.themoviedb.org/3/movie/${pelicula.tmdb_id}/similar?api_key=${apiKey}&language=es-MX&page=1`
    )
      .then((r) => r.json())
      .then((datos) => setPeliculasSimilares(datos.results?.slice(0, 4) || []))
      .catch(() => setPeliculasSimilares([]));
  }, [peliculaSeleccionadaId]);

  // Mejora 1: Debounce — busca en TMDb automáticamente al escribir el título
  useEffect(() => {
    if (titulo.trim().length < 3) {
      setResultadosTmdb([]);
      return;
    }
    const timer = setTimeout(() => {
      buscarPeliculasTmdb();
    }, 400);
    return () => clearTimeout(timer);
  }, [titulo]);

  function normalizarPelicula(pelicula) {
    return {
      ...pelicula,
      opiniones:
        pelicula.opiniones && !Array.isArray(pelicula.opiniones)
          ? pelicula.opiniones
          : {},
      calificaciones:
        pelicula.calificaciones && !Array.isArray(pelicula.calificaciones)
          ? pelicula.calificaciones
          : {},
      poster: pelicula.poster || "",
      descripcion: pelicula.descripcion || "",
      plataforma: pelicula.plataforma || "",
      duracion: pelicula.duracion || "",
      mood: pelicula.mood || "",
      anio: pelicula.anio || "",
      generos: pelicula.generos || "",
      reparto: pelicula.reparto || "",
      tmdb_id: pelicula.tmdb_id || null,
      tmdb_score: pelicula.tmdb_score ?? null,
      trailer_key: pelicula.trailer_key || "",
      streaming_mx: Array.isArray(pelicula.streaming_mx)
        ? pelicula.streaming_mx
        : [],
      vista: pelicula.vista || false,
    };
  }

  async function cargarPeliculas() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("peliculas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("No se pudieron cargar las películas.");
      setCargando(false);
      return;
    }

    setPeliculas(data.map(normalizarPelicula));
    setCargando(false);
  }

  function convertirPoster(evento) {
    const archivo = evento.target.files[0];

    if (!archivo) return;

    const lector = new FileReader();

    lector.onloadend = () => {
      setPoster(lector.result);
    };

    lector.readAsDataURL(archivo);
  }

  function limpiarFormulario() {
    setTitulo("");
    setDescripcion("");
    setPersona(personasCasa[0]);
    setPoster("");
    setPlataforma("");
    setDuracion("");
    setMood("");
    setAnio("");
    setGeneros("");
    setReparto("");
    setTmdbId(null);
    setTmdbScore(null);
    setTrailerKey("");
    setResultadosTmdb([]);
    setErrorTmdb("");
    setStreamingMX([]);
    setEditandoId(null);
    setFormularioAbierto(false);
  }

  async function guardarPelicula(evento) {
    evento.preventDefault();

    if (titulo.trim() === "") {
      alert("Escribe el nombre de una película");
      return;
    }

    const datosPelicula = {
      titulo,
      descripcion,
      persona,
      poster,
      plataforma,
      duracion,
      mood,
      anio,
      generos,
      reparto,
      tmdb_id: tmdbId,
      tmdb_score: tmdbScore,
      trailer_key: trailerKey,
      streaming_mx: streamingMX,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("peliculas")
        .update(datosPelicula)
        .eq("id", editandoId);

      if (error) {
        console.error(error);
        alert("No se pudo editar la película.");
        return;
      }

      limpiarFormulario();
      cargarPeliculas();
      return;
    }

    const nuevaPelicula = {
      ...datosPelicula,
      opiniones: {},
      calificaciones: {},
      vista: false,
    };

    const { error } = await supabase.from("peliculas").insert([nuevaPelicula]);

    if (error) {
      console.error(error);
      alert("No se pudo agregar la película.");
      return;
    }

    limpiarFormulario();
    cargarPeliculas();
  }

  function empezarEdicion(pelicula) {
    setEditandoId(pelicula.id);
    setFormularioAbierto(true);
    setPeliculaSeleccionadaId(null);
    setTrailerAbierto(false);

    setTitulo(pelicula.titulo || "");
    setDescripcion(pelicula.descripcion || "");
    setPersona(pelicula.persona || personasCasa[0]);
    setPoster(pelicula.poster || "");
    setPlataforma(pelicula.plataforma || "");
    setDuracion(pelicula.duracion || "");
    setMood(pelicula.mood || "");
    setAnio(pelicula.anio || "");
    setGeneros(pelicula.generos || "");
    setReparto(pelicula.reparto || "");
    setTmdbId(pelicula.tmdb_id || null);
    setTmdbScore(pelicula.tmdb_score ?? null);
    setTrailerKey(pelicula.trailer_key || "");
    setStreamingMX(pelicula.streaming_mx || []);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function buscarPeliculasTmdb() {
    if (titulo.trim() === "") {
      alert("Primero escribe el nombre de una película.");
      return;
    }

    const apiKey = import.meta.env.VITE_TMDB_API_KEY;

    if (!apiKey) {
      alert("No se encontró la API key de TMDb.");
      return;
    }

    setBuscandoTmdb(true);
    setErrorTmdb("");
    setResultadosTmdb([]);

    try {
      const respuesta = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=es-MX&query=${encodeURIComponent(
          titulo
        )}`
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.status_message || "Error buscando películas.");
      }

      setResultadosTmdb(datos.results || []);
    } catch (error) {
      console.error(error);
      setErrorTmdb("No se pudieron buscar películas en TMDb.");
    } finally {
      setBuscandoTmdb(false);
    }
  }

  function encontrarTrailer(videos) {
    if (!videos || !Array.isArray(videos.results)) return "";

    const videosYoutube = videos.results.filter(
      (video) => video.site === "YouTube" && video.key
    );

    const trailerOficial = videosYoutube.find(
      (video) =>
        video.type === "Trailer" &&
        video.official === true &&
        video.name.toLowerCase().includes("trailer")
    );

    if (trailerOficial) return trailerOficial.key;

    const trailerNormal = videosYoutube.find((video) => video.type === "Trailer");

    if (trailerNormal) return trailerNormal.key;

    const cualquierVideo = videosYoutube[0];

    return cualquierVideo ? cualquierVideo.key : "";
  }

  async function seleccionarPeliculaTmdb(peliculaTmdb) {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;

    if (!apiKey) {
      alert("No se encontró la API key de TMDb.");
      return;
    }

    setBuscandoTmdb(true);
    setErrorTmdb("");

    try {
    const [respuestaDetalles, respuestaCreditos, respuestaVideos, respuestaProveedores] =
        await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/movie/${peliculaTmdb.id}?api_key=${apiKey}&language=es-MX`
          ),
          fetch(
            `https://api.themoviedb.org/3/movie/${peliculaTmdb.id}/credits?api_key=${apiKey}&language=es-MX`
          ),
          fetch(
            `https://api.themoviedb.org/3/movie/${peliculaTmdb.id}/videos?api_key=${apiKey}&language=es-MX`
          ),
          fetch(
            `https://api.themoviedb.org/3/movie/${peliculaTmdb.id}/watch/providers?api_key=${apiKey}`
          ),
        ]);

      const detalles = await respuestaDetalles.json();
      const creditos = await respuestaCreditos.json();
      let videos = await respuestaVideos.json();
      const proveedores = await respuestaProveedores.json();

      if (!respuestaDetalles.ok) {
        throw new Error(detalles.status_message || "Error cargando detalles.");
      }

      if (!videos.results || videos.results.length === 0) {
        const respuestaVideosEn = await fetch(
          `https://api.themoviedb.org/3/movie/${peliculaTmdb.id}/videos?api_key=${apiKey}&language=en-US`
        );

        videos = await respuestaVideosEn.json();
      }

      const posterUrl = detalles.poster_path
        ? `https://image.tmdb.org/t/p/w500${detalles.poster_path}`
        : "";

      const anioPelicula = detalles.release_date
        ? detalles.release_date.slice(0, 4)
        : "";

      const generosTexto = detalles.genres
        ? detalles.genres.map((genero) => genero.name).join(", ")
        : "";

      const repartoTexto = creditos.cast
        ? creditos.cast
            .slice(0, 5)
            .map((actor) => actor.name)
            .join(", ")
        : "";

      const trailerEncontrado = encontrarTrailer(videos);

      // Mejora 2: Plataformas de streaming disponibles en México
      const flatrateMX = proveedores?.results?.MX?.flatrate || [];

      const streamingMXLimpio = flatrateMX.map((proveedor) => ({
        provider_id: proveedor.provider_id,
        provider_name: proveedor.provider_name,
        logo_path: proveedor.logo_path,
      }));

      setStreamingMX(streamingMXLimpio);

      setTitulo(detalles.title || peliculaTmdb.title || "");
      setDescripcion(detalles.overview || "");
      setPoster(posterUrl);
      setDuracion(detalles.runtime ? `${detalles.runtime} min` : "");
      setAnio(anioPelicula);
      setGeneros(generosTexto);
      setReparto(repartoTexto);
      setTmdbId(detalles.id);
      setTmdbScore(detalles.vote_average ?? null);
      setTrailerKey(trailerEncontrado);
      setResultadosTmdb([]);
    } catch (error) {
      console.error(error);
      setErrorTmdb("No se pudieron cargar los datos de esta película.");
    } finally {
      setBuscandoTmdb(false);
    }
  }

  async function agregarOpinion(id, personaQueOpina, opinion) {
    const peliculaActual = peliculas.find((pelicula) => pelicula.id === id);

    if (!peliculaActual) return;

    const nuevasOpiniones = {
      ...peliculaActual.opiniones,
      [personaQueOpina]: opinion,
    };

    const { error } = await supabase
      .from("peliculas")
      .update({ opiniones: nuevasOpiniones })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("No se pudo guardar la opinión.");
      return;
    }

    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id
          ? { ...pelicula, opiniones: nuevasOpiniones }
          : pelicula
      )
    );
  }

  async function calificarPelicula(id, personaQueCalifica, calificacion) {
    const peliculaActual = peliculas.find((pelicula) => pelicula.id === id);

    if (!peliculaActual) return;

    const nuevasCalificaciones = {
      ...peliculaActual.calificaciones,
    };

    if (calificacion === "") {
      delete nuevasCalificaciones[personaQueCalifica];
    } else {
      nuevasCalificaciones[personaQueCalifica] = Number(calificacion);
    }

    const { error } = await supabase
      .from("peliculas")
      .update({ calificaciones: nuevasCalificaciones })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("No se pudo guardar la calificación.");
      return;
    }

    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id
          ? { ...pelicula, calificaciones: nuevasCalificaciones }
          : pelicula
      )
    );
  }

  function obtenerClaseOpinion(opinion) {
    if (opinion === "Me urge verla") return "opinion-urge";
    if (opinion === "La quiero ver") return "opinion-quiere";
    if (opinion === "Puede que sí") return "opinion-puede";
    if (opinion === "No la quiero ver") return "opinion-no";
    return "";
  }

  function calcularPuntos(opiniones) {
    return Object.values(opiniones).reduce((total, opinion) => {
      if (opinion === "Me urge verla") return total + 3;
      if (opinion === "La quiero ver") return total + 2;
      if (opinion === "Puede que sí") return total + 1;
      if (opinion === "No la quiero ver") return total - 2;
      return total;
    }, 0);
  }

  function contarOpiniones(opiniones, opcionBuscada) {
    return Object.values(opiniones).filter(
      (opinion) => opinion === opcionBuscada
    ).length;
  }

  function calcularPromedio(calificaciones) {
    const valores = Object.values(calificaciones);

    if (valores.length === 0) return null;

    const suma = valores.reduce((total, valor) => total + Number(valor), 0);
    return (suma / valores.length).toFixed(1);
  }

  function obtenerLinkTmdb(pelicula) {
    if (!pelicula?.tmdb_id) return "";
    return `https://www.themoviedb.org/movie/${pelicula.tmdb_id}`;
  }

  function compartirPelicula(pelicula) {
    const linkTmdb = obtenerLinkTmdb(pelicula);
    const texto = linkTmdb
      ? `¿Qué opinan de ver ${pelicula.titulo}? ${linkTmdb}`
      : `¿Qué opinan de ver ${pelicula.titulo}?`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function marcarVista(id) {
    const { error } = await supabase
      .from("peliculas")
      .update({ vista: true })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("No se pudo marcar como vista.");
      return;
    }

    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id ? { ...pelicula, vista: true } : pelicula
      )
    );
  }

  async function marcarPendiente(id) {
    const { error } = await supabase
      .from("peliculas")
      .update({ vista: false })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("No se pudo marcar como pendiente.");
      return;
    }

    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id ? { ...pelicula, vista: false } : pelicula
      )
    );
  }

  async function borrarPelicula(id) {
    const confirmar = confirm("¿Seguro que quieres borrar esta película?");

    if (!confirmar) return;

    const { error } = await supabase.from("peliculas").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("No se pudo borrar la película.");
      return;
    }

    setPeliculaSeleccionadaId(null);
    setTrailerAbierto(false);
    setPeliculas(peliculas.filter((pelicula) => pelicula.id !== id));
  }

  const peliculasFiltradas = peliculas.filter((pelicula) => {
    const coincideEstado =
      filtro === "pendientes"
        ? pelicula.vista === false
        : filtro === "vistas"
        ? pelicula.vista === true
        : true;

    const coincidePlataforma =
      filtroPlataforma === "" || pelicula.plataforma === filtroPlataforma;

    const coincideMood = filtroMood === "" || pelicula.mood === filtroMood;

    const textoBusqueda = busqueda.toLowerCase().trim();

    const coincideBusqueda =
      textoBusqueda === "" ||
      pelicula.titulo.toLowerCase().includes(textoBusqueda) ||
      pelicula.descripcion.toLowerCase().includes(textoBusqueda) ||
      pelicula.generos.toLowerCase().includes(textoBusqueda) ||
      pelicula.reparto.toLowerCase().includes(textoBusqueda) ||
      pelicula.anio.toLowerCase().includes(textoBusqueda);

    return (
      coincideEstado && coincidePlataforma && coincideMood && coincideBusqueda
    );
  });

  const peliculasOrdenadas = [...peliculasFiltradas].sort((a, b) => {
    if (filtro === "vistas") {
      const promedioA = Number(calcularPromedio(a.calificaciones) || 0);
      const promedioB = Number(calcularPromedio(b.calificaciones) || 0);
      return promedioB - promedioA;
    }

    return calcularPuntos(b.opiniones) - calcularPuntos(a.opiniones);
  });

  const mejorOpcion = [...peliculas]
    .filter((pelicula) => {
      const esPendiente = pelicula.vista === false;

      const coincidePlataforma =
        filtroPlataforma === "" || pelicula.plataforma === filtroPlataforma;

      const coincideMood = filtroMood === "" || pelicula.mood === filtroMood;

      const textoBusqueda = busqueda.toLowerCase().trim();

      const coincideBusqueda =
        textoBusqueda === "" ||
        pelicula.titulo.toLowerCase().includes(textoBusqueda) ||
        pelicula.descripcion.toLowerCase().includes(textoBusqueda) ||
        pelicula.generos.toLowerCase().includes(textoBusqueda) ||
        pelicula.reparto.toLowerCase().includes(textoBusqueda) ||
        pelicula.anio.toLowerCase().includes(textoBusqueda);

      return (
        esPendiente && coincidePlataforma && coincideMood && coincideBusqueda
      );
    })
    .sort((a, b) => calcularPuntos(b.opiniones) - calcularPuntos(a.opiniones))[0];

  return (
    <main className="contenedor">
      <header className="encabezado">
        <h1>🎬 Capricho di Rob</h1>
        <p>Lista familiar para sugerir películas y elegir mejor.</p>
      </header>

      <section className="panel-agregar">
        <button
          className="boton-desplegar-formulario"
          onClick={() => setFormularioAbierto(!formularioAbierto)}
        >
          <span>
            {formularioAbierto
              ? editandoId
                ? "Editando película"
                : "Agregar película"
              : "+ Agregar película"}
          </span>
          <span>{formularioAbierto ? "▲" : "▼"}</span>
        </button>

        {formularioAbierto && (
          <form
            className={editandoId ? "formulario editando" : "formulario"}
            onSubmit={guardarPelicula}
          >
            {editandoId && (
              <div className="aviso-edicion">
                Editando película. Guarda los cambios o cancela la edición.
              </div>
            )}

            <input
              type="text"
              placeholder="Nombre de la película"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />

            {buscandoTmdb && (
              <p className="trailer-detectado" style={{ color: "var(--texto-suave)" }}>
                🔍 Buscando en TMDb...
              </p>
            )}

            <select value={persona} onChange={(e) => setPersona(e.target.value)}>
              {personasCasa.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>

            <select
              value={plataforma}
              onChange={(e) => setPlataforma(e.target.value)}
            >
              <option value="">Plataforma</option>
              {plataformas.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Duración: 1h 45min"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
            />

            <input
              type="text"
              placeholder="Año"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
            />

            <input
              type="text"
              placeholder="Géneros"
              value={generos}
              onChange={(e) => setGeneros(e.target.value)}
            />

            <input
              type="text"
              placeholder="Reparto principal"
              value={reparto}
              onChange={(e) => setReparto(e.target.value)}
            />

            <select value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="">Mood / tipo</option>
              {moods.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>

            <label className="subir-poster">
              {poster ? "✅ Póster cargado" : "Subir póster"}
              <input type="file" accept="image/*" onChange={convertirPoster} />
            </label>

            <button type="submit">
              {editandoId ? "Guardar cambios" : "Agregar"}
            </button>

            {editandoId && (
              <button type="button" onClick={limpiarFormulario}>
                Cancelar
              </button>
            )}

            <textarea
              placeholder="Descripción breve de la película"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />

            {trailerKey && (
              <p className="trailer-detectado">
                ✅ Tráiler detectado automáticamente
              </p>
            )}

            {streamingMX.length > 0 && (
              <div className="streaming-mx">
                <p className="streaming-mx-titulo">📺 Disponible en México:</p>
                <div className="streaming-mx-logos">
                  {streamingMX.map((proveedor) => (
                    <div key={proveedor.provider_id} className="streaming-logo" title={proveedor.provider_name}>
                      {proveedor.logo_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w45${proveedor.logo_path}`}
                          alt={proveedor.provider_name}
                        />
                      ) : (
                        <span>📺</span>
                      )}
                      <span>{proveedor.provider_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorTmdb && <p className="error-tmdb">{errorTmdb}</p>}

            {resultadosTmdb.length > 0 && (
              <div className="resultados-tmdb">
                {resultadosTmdb.slice(0, 6).map((resultado) => (
                  <button
                    key={resultado.id}
                    type="button"
                    className="resultado-tmdb"
                    onClick={() => seleccionarPeliculaTmdb(resultado)}
                  >
                    {resultado.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${resultado.poster_path}`}
                        alt={resultado.title}
                      />
                    ) : (
                      <div className="resultado-sin-poster">🎞️</div>
                    )}

                    <div>
                      <strong>{resultado.title}</strong>
                      <span>
                        {resultado.release_date
                          ? resultado.release_date.slice(0, 4)
                          : "Sin año"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>
        )}
      </section>

      <section className="panel-filtros-mobile">
        <button
          className="boton-desplegar-filtros"
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
        >
          <span>🔎 Filtros y búsqueda</span>
          <span>{filtrosAbiertos ? "▲" : "▼"}</span>
        </button>
      </section>

      <div className={filtrosAbiertos ? "zona-filtros abierta" : "zona-filtros"}>
        <section className="buscador">
          <input
            type="text"
            placeholder="Buscar película..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </section>

        <section className="filtros">
        <button
          className={filtro === "pendientes" ? "filtro-activo" : ""}
          onClick={() => setFiltro("pendientes")}
        >
          Pendientes
        </button>

        <button
          className={filtro === "vistas" ? "filtro-activo" : ""}
          onClick={() => setFiltro("vistas")}
        >
          Vistas
        </button>

        <button
          className={filtro === "todas" ? "filtro-activo" : ""}
          onClick={() => setFiltro("todas")}
        >
          Todas
        </button>

        <select
          className="filtro-select"
          value={filtroPlataforma}
          onChange={(e) => setFiltroPlataforma(e.target.value)}
        >
          <option value="">Todas las plataformas</option>
          {plataformas.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>

        <select
          className="filtro-select"
          value={filtroMood}
          onChange={(e) => setFiltroMood(e.target.value)}
        >
          <option value="">Todos los moods</option>
          {moods.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setFiltroPlataforma("");
            setFiltroMood("");
            setBusqueda("");
          }}
        >
          Limpiar filtros
        </button>

          <button onClick={cargarPeliculas}>Actualizar</button>
        </section>
      </div>

      {mejorOpcion && (
        <section className="panel-seleccion-hoy">
          <button
            className="boton-desplegar-seleccion"
            onClick={() => setSeleccionHoyAbierta(!seleccionHoyAbierta)}
          >
            <span>🏆 Mejor opción para hoy</span>
            <span>{seleccionHoyAbierta ? "▲" : "▼"}</span>
          </button>

          {seleccionHoyAbierta && (
            <div
              className="mejor-opcion"
              onClick={() => setPeliculaSeleccionadaId(mejorOpcion.id)}
            >
              <div>
                <p className="etiqueta-mejor">Selección recomendada</p>
                <h2>{mejorOpcion.titulo}</h2>

                <div className="etiquetas">
                  {mejorOpcion.plataforma && (
                    <span>📺 {mejorOpcion.plataforma}</span>
                  )}
                  {mejorOpcion.duracion && (
                    <span>⏱️ {mejorOpcion.duracion}</span>
                  )}
                  {mejorOpcion.mood && <span>🎭 {mejorOpcion.mood}</span>}
                  {mejorOpcion.anio && <span>📅 {mejorOpcion.anio}</span>}
                  {mejorOpcion.generos && (
                    <span>🎬 {mejorOpcion.generos}</span>
                  )}
                  {mejorOpcion.trailer_key && <span>▶ Tráiler</span>}
                </div>

                {mejorOpcion.descripcion && (
                  <p className="descripcion">{mejorOpcion.descripcion}</p>
                )}

                <p className="abrir-detalle">Abrir ficha</p>
              </div>

              <div className="puntaje-mejor">
                {calcularPuntos(mejorOpcion.opiniones)}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="lista">
        {cargando ? (
          <p className="vacio">Cargando películas...</p>
        ) : error ? (
          <p className="vacio">{error}</p>
        ) : peliculasOrdenadas.length === 0 ? (
          <p className="vacio">No hay películas en este filtro.</p>
        ) : (
          peliculasOrdenadas.map((pelicula) => {
            const promedio = calcularPromedio(pelicula.calificaciones);

            return (
              <article
                key={pelicula.id}
                className={pelicula.vista ? "pelicula vista" : "pelicula"}
                onClick={() => setPeliculaSeleccionadaId(pelicula.id)}
              >
                <div className="poster">
                  {pelicula.poster ? (
                    <img src={pelicula.poster} alt={pelicula.titulo} />
                  ) : (
                    <div className="sin-poster">🎞️</div>
                  )}
                </div>

                {pelicula.vista && <div className="badge-vista">Vista</div>}

                <div className="contenido-pelicula">
                  <div className="datos-pelicula">
                    <div>
                      <h2>{pelicula.titulo}</h2>
                      <p className="info-desktop">Por: {pelicula.persona}</p>

                      <div className="etiquetas info-desktop">
                        {pelicula.plataforma && (
                          <span>📺 {pelicula.plataforma}</span>
                        )}
                        {pelicula.duracion && (
                          <span>⏱️ {pelicula.duracion}</span>
                        )}
                        {pelicula.mood && <span>🎭 {pelicula.mood}</span>}
                        {pelicula.anio && <span>📅 {pelicula.anio}</span>}
                        {pelicula.trailer_key && <span>▶</span>}
                      </div>
                    </div>

                    <div className="puntaje">
                      {pelicula.vista
                        ? promedio || "-"
                        : calcularPuntos(pelicula.opiniones)}
                    </div>
                  </div>

                  <p className="abrir-detalle info-desktop">Abrir ficha</p>
                </div>
              </article>
            );
          })
        )}
      </section>

      {peliculaSeleccionada && (
        <div
          className="modal-fondo"
          onClick={() => {
            setPeliculaSeleccionadaId(null);
            setTrailerAbierto(false);
          }}
        >
          <section
            className="modal-pelicula"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="cerrar-modal"
              onClick={() => {
                setPeliculaSeleccionadaId(null);
                setTrailerAbierto(false);
              }}
            >
              ✕
            </button>

            <div className="modal-poster">
              {peliculaSeleccionada.poster ? (
                <img
                  src={peliculaSeleccionada.poster}
                  alt={peliculaSeleccionada.titulo}
                />
              ) : (
                <div className="sin-poster">🎞️</div>
              )}
            </div>

            <div className="modal-contenido">
              <p className="modal-subtitulo">
                {peliculaSeleccionada.vista ? "Película vista" : "Pendiente"}
              </p>

              <h2>{peliculaSeleccionada.titulo}</h2>

              <p className="modal-propuesta">
                Propuesta por: {peliculaSeleccionada.persona}
              </p>

              <div className="etiquetas">
                {peliculaSeleccionada.plataforma && (
                  <span>📺 {peliculaSeleccionada.plataforma}</span>
                )}
                {peliculaSeleccionada.duracion && (
                  <span>⏱️ {peliculaSeleccionada.duracion}</span>
                )}
                {peliculaSeleccionada.mood && (
                  <span>🎭 {peliculaSeleccionada.mood}</span>
                )}
                {peliculaSeleccionada.anio && (
                  <span>📅 {peliculaSeleccionada.anio}</span>
                )}
                {peliculaSeleccionada.generos && (
                  <span>🎬 {peliculaSeleccionada.generos}</span>
                )}
              </div>

              <div className="scores-pelicula">
                <div>
                  <span>Casa</span>
                  <strong>
                    ⭐ {calcularPromedio(peliculaSeleccionada.calificaciones) || "-"} / 5
                  </strong>
                </div>

                {peliculaSeleccionada.tmdb_score !== null &&
                  peliculaSeleccionada.tmdb_score !== undefined && (
                    <div>
                      <span>TMDb</span>
                      <strong>
                        ⭐ {Number(peliculaSeleccionada.tmdb_score).toFixed(1)} / 10
                      </strong>
                    </div>
                  )}
              </div>

              {peliculaSeleccionada.descripcion && (
                <p className="descripcion modal-descripcion">
                  {peliculaSeleccionada.descripcion}
                </p>
              )}

              {peliculaSeleccionada.streaming_mx?.length > 0 && (
                <div className="streaming-guardado">
                  <p className="streaming-guardado-titulo">
                    📺 Disponible en streaming:
                  </p>

                  <div className="streaming-guardado-logos">
                    {peliculaSeleccionada.streaming_mx.map((proveedor) => (
                      <div
                        key={proveedor.provider_id}
                        className="streaming-guardado-logo"
                        title={proveedor.provider_name}
                      >
                        {proveedor.logo_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w45${proveedor.logo_path}`}
                            alt={proveedor.provider_name}
                          />
                        ) : (
                          <span>📺</span>
                        )}

                        <span>{proveedor.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {peliculaSeleccionada.reparto && (
                <p className="reparto">
                  <strong>Reparto:</strong> {peliculaSeleccionada.reparto}
                </p>
              )}

              <div className="botones-ficha">
                {peliculaSeleccionada.trailer_key && (
                  <button
                    className="boton-trailer"
                    onClick={() => setTrailerAbierto(true)}
                  >
                    ▶ Ver tráiler
                  </button>
                )}

                <button
                  className="boton-compartir"
                  onClick={() => compartirPelicula(peliculaSeleccionada)}
                >
                  📲 Compartir
                </button>
              </div>

              {!peliculaSeleccionada.vista && (
                <>
                  <div className="modal-puntaje">
                    Puntaje actual:{" "}
                    <strong>
                      {calcularPuntos(peliculaSeleccionada.opiniones)}
                    </strong>
                  </div>

                  <div className="opiniones-personas">
                    {personasCasa.map((nombre) => (
                      <div
                        key={nombre}
                        className={`opinion-persona ${obtenerClaseOpinion(
                          peliculaSeleccionada.opiniones[nombre]
                        )}`}
                      >
                        <span>{nombre}</span>

                        <select
                          value={peliculaSeleccionada.opiniones[nombre] || ""}
                          onChange={(e) =>
                            agregarOpinion(
                              peliculaSeleccionada.id,
                              nombre,
                              e.target.value
                            )
                          }
                        >
                          <option value="">Sin opinión</option>

                          {opciones.map((opcion) => (
                            <option key={opcion} value={opcion}>
                              {opcion}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="resumen-opiniones">
                    <span>
                      🔥{" "}
                      {contarOpiniones(
                        peliculaSeleccionada.opiniones,
                        "Me urge verla"
                      )}
                    </span>
                    <span>
                      ✅{" "}
                      {contarOpiniones(
                        peliculaSeleccionada.opiniones,
                        "La quiero ver"
                      )}
                    </span>
                    <span>
                      🤔{" "}
                      {contarOpiniones(
                        peliculaSeleccionada.opiniones,
                        "Puede que sí"
                      )}
                    </span>
                    <span>
                      ❌{" "}
                      {contarOpiniones(
                        peliculaSeleccionada.opiniones,
                        "No la quiero ver"
                      )}
                    </span>
                  </div>
                </>
              )}

              {peliculaSeleccionada.vista && (
                <>
                  <p className="calificacion">
                    Promedio de la casa: ⭐{" "}
                    {calcularPromedio(peliculaSeleccionada.calificaciones) || "-"}{" "}
                    / 5
                  </p>

                  <div className="calificaciones-personas">
                    {personasCasa.map((nombre) => (
                      <div key={nombre} className="calificacion-persona visual">
                        <span>{nombre}</span>

                        <StarRating
                          valor={peliculaSeleccionada.calificaciones[nombre] || ""}
                          onChange={(valor) =>
                            calificarPelicula(
                              peliculaSeleccionada.id,
                              nombre,
                              valor
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {peliculasSimilares.length > 0 && (
                <div className="similares">
                  <p className="similares-titulo">🎬 Puede que también te guste:</p>
                  <div className="similares-grid">
                    {peliculasSimilares.map((sim) => (
                      <div key={sim.id} className="similar-item">
                        {sim.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w154${sim.poster_path}`}
                            alt={sim.title}
                          />
                        ) : (
                          <div className="similar-sin-poster">🎞️</div>
                        )}
                        <span>{sim.title}</span>
                        {sim.release_date && (
                          <span className="similar-anio">{sim.release_date.slice(0, 4)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="acciones acciones-modal">
                {peliculaSeleccionada.vista ? (
                  <button
                    onClick={() => marcarPendiente(peliculaSeleccionada.id)}
                  >
                    Marcar pendiente
                  </button>
                ) : (
                  <button onClick={() => marcarVista(peliculaSeleccionada.id)}>
                    Marcar vista
                  </button>
                )}

                <button onClick={() => empezarEdicion(peliculaSeleccionada)}>
                  Editar
                </button>

                <button onClick={() => borrarPelicula(peliculaSeleccionada.id)}>
                  Borrar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {trailerAbierto && peliculaSeleccionada?.trailer_key && (
        <div className="modal-trailer-fondo" onClick={() => setTrailerAbierto(false)}>
          <section
            className="modal-trailer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="cerrar-modal cerrar-trailer"
              onClick={() => setTrailerAbierto(false)}
            >
              ✕
            </button>

            <div className="video-trailer">
              <iframe
                src={`https://www.youtube.com/embed/${peliculaSeleccionada.trailer_key}?autoplay=1`}
                title={`Tráiler de ${peliculaSeleccionada.titulo}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;