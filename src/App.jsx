import { useEffect, useState } from "react";
import "./App.css";

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
  const [peliculas, setPeliculas] = useState(() => {
    const peliculasGuardadas = localStorage.getItem("peliculas-casa");

    if (peliculasGuardadas) {
      return JSON.parse(peliculasGuardadas).map((pelicula) => ({
        ...pelicula,
        opiniones:
          pelicula.opiniones && !Array.isArray(pelicula.opiniones)
            ? pelicula.opiniones
            : {},
        poster: pelicula.poster || "",
      }));
    }

    return [];
  });

  const [titulo, setTitulo] = useState("");
  const [persona, setPersona] = useState(personasCasa[0]);
  const [poster, setPoster] = useState("");
  const [filtro, setFiltro] = useState("pendientes");

  useEffect(() => {
    localStorage.setItem("peliculas-casa", JSON.stringify(peliculas));
  }, [peliculas]);

  function convertirPoster(evento) {
    const archivo = evento.target.files[0];

    if (!archivo) return;

    const lector = new FileReader();

    lector.onloadend = () => {
      setPoster(lector.result);
    };

    lector.readAsDataURL(archivo);
  }

  function agregarPelicula(evento) {
    evento.preventDefault();

    if (titulo.trim() === "") {
      alert("Escribe el nombre de una película");
      return;
    }

    const nuevaPelicula = {
      id: Date.now(),
      titulo: titulo,
      persona: persona,
      poster: poster,
      opiniones: {},
      vista: false,
    };

    setPeliculas([...peliculas, nuevaPelicula]);

    setTitulo("");
    setPersona(personasCasa[0]);
    setPoster("");
  }

  function agregarOpinion(id, personaQueOpina, opinion) {
    const nuevasPeliculas = peliculas.map((pelicula) => {
      if (pelicula.id === id) {
        return {
          ...pelicula,
          opiniones: {
            ...pelicula.opiniones,
            [personaQueOpina]: opinion,
          },
        };
      }

      return pelicula;
    });

    setPeliculas(nuevasPeliculas);
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

  function marcarVista(id) {
    const nuevasPeliculas = peliculas.map((pelicula) => {
      if (pelicula.id === id) {
        return {
          ...pelicula,
          vista: true,
        };
      }

      return pelicula;
    });

    setPeliculas(nuevasPeliculas);
  }

  function marcarPendiente(id) {
    const nuevasPeliculas = peliculas.map((pelicula) => {
      if (pelicula.id === id) {
        return {
          ...pelicula,
          vista: false,
        };
      }

      return pelicula;
    });

    setPeliculas(nuevasPeliculas);
  }

  function borrarPelicula(id) {
    const confirmar = confirm("¿Seguro que quieres borrar esta película?");

    if (!confirmar) return;

    const nuevasPeliculas = peliculas.filter((pelicula) => pelicula.id !== id);
    setPeliculas(nuevasPeliculas);
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
        <h1>🎬 Capricho di Rob</h1>
        <p>Lista de Películas Cauda.</p>
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
      </section>

      <section className="lista">
        {peliculasOrdenadas.length === 0 ? (
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
                  </div>

                  <div className="puntaje">
                    {calcularPuntos(pelicula.opiniones)}
                  </div>
                </div>

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
                    ❌ {contarOpiniones(pelicula.opiniones, "No la quiero ver")}
                  </span>
                </div>

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