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

function App() {
  const [peliculas, setPeliculas] = useState([]);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [persona, setPersona] = useState(personasCasa[0]);
  const [poster, setPoster] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [duracion, setDuracion] = useState("");
  const [mood, setMood] = useState("");

  const [filtro, setFiltro] = useState("pendientes");
  const [filtroPlataforma, setFiltroPlataforma] = useState("");
  const [filtroMood, setFiltroMood] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [peliculaSeleccionadaId, setPeliculaSeleccionadaId] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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

    setTitulo(pelicula.titulo || "");
    setDescripcion(pelicula.descripcion || "");
    setPersona(pelicula.persona || personasCasa[0]);
    setPoster(pelicula.poster || "");
    setPlataforma(pelicula.plataforma || "");
    setDuracion(pelicula.duracion || "");
    setMood(pelicula.mood || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
      pelicula.descripcion.toLowerCase().includes(textoBusqueda);

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
        pelicula.descripcion.toLowerCase().includes(textoBusqueda);

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
          </form>
        )}
      </section>

      <section className="buscador">
        <input
          type="text"
          placeholder="Buscar por título o descripción..."
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

      {mejorOpcion && (
        <section className="mejor-opcion">
          <div>
            <p className="etiqueta-mejor">🏆 Mejor opción para hoy</p>
            <h2>{mejorOpcion.titulo}</h2>

            <div className="etiquetas">
              {mejorOpcion.plataforma && (
                <span>📺 {mejorOpcion.plataforma}</span>
              )}
              {mejorOpcion.duracion && <span>⏱️ {mejorOpcion.duracion}</span>}
              {mejorOpcion.mood && <span>🎭 {mejorOpcion.mood}</span>}
            </div>

            {mejorOpcion.descripcion && (
              <p className="descripcion">{mejorOpcion.descripcion}</p>
            )}
          </div>

          <div className="puntaje-mejor">
            {calcularPuntos(mejorOpcion.opiniones)}
          </div>
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

                <div className="contenido-pelicula">
                  <div className="datos-pelicula">
                    <div>
                      <h2>{pelicula.titulo}</h2>
                      <p>Por: {pelicula.persona}</p>

                      <div className="etiquetas">
                        {pelicula.plataforma && (
                          <span>📺 {pelicula.plataforma}</span>
                        )}
                        {pelicula.duracion && (
                          <span>⏱️ {pelicula.duracion}</span>
                        )}
                        {pelicula.mood && <span>🎭 {pelicula.mood}</span>}
                      </div>
                    </div>

                    <div className="puntaje">
                      {pelicula.vista
                        ? promedio || "-"
                        : calcularPuntos(pelicula.opiniones)}
                    </div>
                  </div>

                  <p className="abrir-detalle">Abrir ficha</p>
                </div>
              </article>
            );
          })
        )}
      </section>

      {peliculaSeleccionada && (
        <div
          className="modal-fondo"
          onClick={() => setPeliculaSeleccionadaId(null)}
        >
          <section
            className="modal-pelicula"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="cerrar-modal"
              onClick={() => setPeliculaSeleccionadaId(null)}
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
              </div>

              {peliculaSeleccionada.descripcion && (
                <p className="descripcion modal-descripcion">
                  {peliculaSeleccionada.descripcion}
                </p>
              )}

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
                      <div key={nombre} className="opinion-persona">
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
                    Promedio: ⭐{" "}
                    {calcularPromedio(peliculaSeleccionada.calificaciones) ||
                      "-"}{" "}
                    / 5
                  </p>

                  <div className="calificaciones-personas">
                    {personasCasa.map((nombre) => (
                      <div key={nombre} className="calificacion-persona">
                        <span>{nombre}</span>

                        <select
                          value={
                            peliculaSeleccionada.calificaciones[nombre] || ""
                          }
                          onChange={(e) =>
                            calificarPelicula(
                              peliculaSeleccionada.id,
                              nombre,
                              e.target.value
                            )
                          }
                        >
                          <option value="">Sin calificar</option>
                          <option value="1">⭐ 1</option>
                          <option value="2">⭐⭐ 2</option>
                          <option value="3">⭐⭐⭐ 3</option>
                          <option value="4">⭐⭐⭐⭐ 4</option>
                          <option value="5">⭐⭐⭐⭐⭐ 5</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="acciones acciones-modal">
                {peliculaSeleccionada.vista ? (
                  <button onClick={() => marcarPendiente(peliculaSeleccionada.id)}>
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
    </main>
  );
}

export default App;