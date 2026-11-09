// ============================================================
// 1) CONFIGURACIÓN DE FIREBASE (Realtime Database)
//    Reemplazá los valores por los de tu proyecto:
//    Firebase Console > Configuración del proyecto > Tus apps > Web
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getDatabase, ref, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://sitio-de-carga-de-videojuegos-default-rtdb.firebaseio.com",
  projectId: "sitio-de-carga-de-videojuegos"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const videojuegosRef = ref(db, "videojuegos");

// ============================================================
// 2) ELEMENTOS DEL DOM
// ============================================================
const formularioVideojuego = document.getElementById("formulario-videojuego");
const botonGuardar = document.getElementById("boton-guardar");
const mensaje = document.getElementById("mensaje");
const inputTitulo = document.getElementById("input-titulo");
const inputPlataforma = document.getElementById("input-plataforma");
const inputGenero = document.getElementById("input-genero");
const inputPrecio = document.getElementById("input-precio");
const inputStock = document.getElementById("input-stock");
const inputDescripcion = document.getElementById("input-descripcion");
const inputImagen = document.getElementById("input-imagen");
const inputBusqueda = document.getElementById("input-busqueda");
const botonLimpiar = document.getElementById("boton-limpiar");
const listaVideojuegos = document.getElementById("lista-videojuegos");
const mensajeVacio = document.getElementById("mensaje-vacio");

// Acá se guardan todos los registros leídos de Firebase.
// Cada elemento tiene la forma { clave, titulo, plataforma, ... }
let videojuegos = [];

// ============================================================
// 3) UTILIDADES
// ============================================================
function mostrarMensaje(texto, tipo = "ok") {
  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo;
  if (texto) setTimeout(() => (mensaje.textContent = ""), 4000);
}

function escaparHTML(texto = "") {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS"
});

// ============================================================
// 4) GUARDAR VIDEOJUEGO con push() (clave generada por Firebase)
// ============================================================
formularioVideojuego.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  botonGuardar.disabled = true;
  botonGuardar.textContent = "Guardando...";

  try {
    const guardado = push(videojuegosRef, {
      titulo: inputTitulo.value.trim(),
      plataforma: inputPlataforma.value,
      genero: inputGenero.value,
      precio: parseFloat(inputPrecio.value),
      stock: parseInt(inputStock.value, 10),
      descripcion: inputDescripcion.value.trim(),
      imagenURL: inputImagen.value.trim()
    });

    // Si Firebase no responde en 8 segundos, se muestra un error en vez de quedar colgado
    const tiempoAgotado = new Promise((_, rechazar) =>
      setTimeout(() => rechazar(new Error("tiempo agotado")), 8000)
    );

    await Promise.race([guardado, tiempoAgotado]);

    formularioVideojuego.reset();
    mostrarMensaje("✅ Videojuego guardado correctamente");
  } catch (error) {
    console.error(error);
    mostrarMensaje("❌ No se pudo guardar. Revisá la configuración y las reglas.", "error");
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar videojuego";
  }
});

// ============================================================
// 5) LEER DATOS con onValue() y datos.val()
// ============================================================
onValue(videojuegosRef, (datos) => {
  const contenido = datos.val(); // objeto { claveGenerada: {...}, ... } o null
  videojuegos = [];

  if (contenido) {
    for (const clave in contenido) {
      videojuegos.push({ clave: clave, ...contenido[clave] });
    }
    videojuegos.reverse(); // los más nuevos primero
  }

  mostrarVideojuegos();
}, (error) => {
  console.error(error);
  mostrarMensaje("❌ No se pudo leer la base de datos.", "error");
});

// ============================================================
// 6) MOSTRAR (aplicando el filtro de búsqueda por título)
// ============================================================
function mostrarVideojuegos() {
  const textoBusqueda = inputBusqueda.value.trim().toLowerCase();

  const videojuegosFiltrados = videojuegos.filter((videojuego) =>
    videojuego.titulo.toLowerCase().includes(textoBusqueda)
  );

  listaVideojuegos.innerHTML = "";
  mensajeVacio.classList.toggle("oculto", videojuegosFiltrados.length > 0);

  videojuegosFiltrados.forEach((videojuego) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "videojuego";
    tarjeta.innerHTML = `
      ${videojuego.imagenURL
        ? `<img src="${escaparHTML(videojuego.imagenURL)}" alt="${escaparHTML(videojuego.titulo)}" loading="lazy" />`
        : `<div class="sin-imagen">🎮</div>`}
      <div class="videojuego-cuerpo">
        <h3>${escaparHTML(videojuego.titulo)}</h3>
        <div class="etiquetas">
          <span class="etiqueta">${escaparHTML(videojuego.plataforma)}</span>
          <span class="etiqueta">${escaparHTML(videojuego.genero)}</span>
        </div>
        <p class="descripcion">${escaparHTML(videojuego.descripcion || "Sin descripción")}</p>
        <span class="precio">${formatoPrecio.format(videojuego.precio)}</span>
        <span class="stock ${videojuego.stock <= 3 ? "bajo" : ""}">Stock: ${videojuego.stock}</span>
        <button class="boton-eliminar" data-clave="${videojuego.clave}">Eliminar</button>
      </div>
    `;
    listaVideojuegos.appendChild(tarjeta);
  });
}

// Filtrar mientras se escribe
inputBusqueda.addEventListener("input", mostrarVideojuegos);

// Botón para limpiar la búsqueda y volver a ver todos
botonLimpiar.addEventListener("click", () => {
  inputBusqueda.value = "";
  mostrarVideojuegos();
});

// ============================================================
// 7) ELIMINAR VIDEOJUEGO
// ============================================================
listaVideojuegos.addEventListener("click", async (evento) => {
  const boton = evento.target.closest(".boton-eliminar");
  if (!boton) return;

  const clave = boton.dataset.clave;
  const videojuego = videojuegos.find((v) => v.clave === clave);
  if (!videojuego || !confirm(`¿Eliminar "${videojuego.titulo}"?`)) return;

  try {
    await remove(ref(db, "videojuegos/" + clave));
  } catch (error) {
    console.error(error);
    mostrarMensaje("❌ No se pudo eliminar", "error");
  }
});