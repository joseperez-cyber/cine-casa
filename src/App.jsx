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

function App() {
  const [peliculas, setPeliculas] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [persona, setPersona] = useState(personasCasa[0]);
  const [poster, setPoster] = useState("");
  const [filtro, setFiltro] = useState("pendientes");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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
      poster: pelicula.poster || "",
      descripcion: pelicula.descripcion || "",
      calificacion: pelicula.calificacion || "",
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

  async function agregarPelicula(evento) {
    evento.preventDefault();

    if (titulo.trim() === "") {
      alert("Escribe el nombre de una película");
      return;
    }

    const nuevaPelicula = {
      titulo: titulo,
      descripcion: descripcion,
      persona: persona,
      poster: poster,
      opiniones: {},
      vista: false,
      calificacion: null,
    };

    const { error } = await supabase.from("peliculas").insert([nuevaPelicula]);

    if (error) {
      console.error(error);
      alert("No se pudo agregar la película.");
      return;
    }

    setTitulo("");
    setDescripcion("");
    setPersona(personasCasa[0]);
    setPoster("");
    cargarPeliculas();
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
      .update({ vista: false, calificacion: null })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("No se pudo marcar como pendiente.");
      return;
    }

    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id
          ? { ...pelicula, vista: false, calificacion: "" }
          : pelicula
      )
    );
  }

  async function calificarPelicula(id, calificacion) {
    const valor = calificacion === "" ? null : Number(calificacion);

    const { error } = await supabase
      .from("peliculas")
      .update({ calificacion: valor })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("No se pudo guardar la calificación.");
      return;
    }

    setPeliculas(
      peliculas.map((pelicula) =>
        pelicula.id === id
          ? { ...pelicula, calificacion: valor || "" }
          : pelicula
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

    setPeliculas(peliculas.filter((pelicula) => pelicula.id !== id));
  }

  const peliculasFiltradas = peliculas.filter((pelicula) => {
    if (filtro === "pendientes") return pelicula.vista === false;
    if (filtro === "vistas") return pelicula.vista === true;
    return true;
  });

  const peliculasOrdenadas = [...peliculasFiltradas].sort((a, b) => {
    return calcularPuntos(b.opiniones) - calcularPuntos(a.opiniones);
  });

  return (
    <main className="contenedor">
      <header className="encabezado">
        <h1>🎬 Películas Cauda</h1>
        <p>Lista de películas para ver.</p>
      </header>

      <form className="formulario" onSubmit={agregarPelicula}>
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

        <label className="subir-poster">
          {poster ? "✅ Póster cargado" : "Subir póster"}
          <input type="file" accept="image/*" onChange={convertirPoster} />
        </label>

        <button type="submit">Agregar</button>

        <textarea
          placeholder="Descripción breve de la película"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </form>

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

        <button onClick={cargarPeliculas}>Actualizar</button>
      </section>

      <section className="lista">
        {cargando ? (
          <p className="vacio">Cargando películas...</p>
        ) : error ? (
          <p className="vacio">{error}</p>
        ) : peliculasOrdenadas.length === 0 ? (
          <p className="vacio">No hay películas en este filtro.</p>
        ) : (
          peliculasOrdenadas.map((pelicula) => (
            <article
              key={pelicula.id}
              className={pelicula.vista ? "pelicula vista" : "pelicula"}
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

                    {pelicula.descripcion && (
                      <p className="descripcion">{pelicula.descripcion}</p>
                    )}

                    {pelicula.vista && pelicula.calificacion && (
                      <p className="calificacion">
                        Calificación: {"⭐".repeat(pelicula.calificacion)}
                      </p>
                    )}
                  </div>

                  <div className="puntaje">
                    {calcularPuntos(pelicula.opiniones)}
                  </div>
                </div>

                {!pelicula.vista && (
                  <div className="opiniones-personas">
                    {personasCasa.map((nombre) => (
                      <div key={nombre} className="opinion-persona">
                        <span>{nombre}</span>

                        <select
                          value={pelicula.opiniones[nombre] || ""}
                          onChange={(e) =>
                            agregarOpinion(pelicula.id, nombre, e.target.value)
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
                )}

                {!pelicula.vista && (
                  <div className="resumen-opiniones">
                    <span>
                      🔥 {contarOpiniones(pelicula.opiniones, "Me urge verla")}
                    </span>
                    <span>
                      ✅ {contarOpiniones(pelicula.opiniones, "La quiero ver")}
                    </span>
                    <span>
                      🤔 {contarOpiniones(pelicula.opiniones, "Puede que sí")}
                    </span>
                    <span>
                      ❌{" "}
                      {contarOpiniones(pelicula.opiniones, "No la quiero ver")}
                    </span>
                  </div>
                )}

                {pelicula.vista && (
                  <div className="calificar">
                    <span>Calificar:</span>

                    <select
                      value={pelicula.calificacion || ""}
                      onChange={(e) =>
                        calificarPelicula(pelicula.id, e.target.value)
                      }
                    >
                      <option value="">Sin calificación</option>
                      <option value="1">⭐ 1</option>
                      <option value="2">⭐⭐ 2</option>
                      <option value="3">⭐⭐⭐ 3</option>
                      <option value="4">⭐⭐⭐⭐ 4</option>
                      <option value="5">⭐⭐⭐⭐⭐ 5</option>
                    </select>
                  </div>
                )}

                <div className="acciones">
                  {pelicula.vista ? (
                    <button onClick={() => marcarPendiente(pelicula.id)}>
                      Marcar pendiente
                    </button>
                  ) : (
                    <button onClick={() => marcarVista(pelicula.id)}>
                      Marcar vista
                    </button>
                  )}

                  <button onClick={() => borrarPelicula(pelicula.id)}>
                    Borrar
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default App;