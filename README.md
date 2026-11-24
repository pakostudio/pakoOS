# PAKO OS — Command Center & Favoritos

Sistema personal de favoritos y centro de comando productivo de alto rendimiento, optimizado para alojarse directamente en **GitHub Pages** con persistencia local en tu navegador.

---

## ✨ Características

- **Diseño limpio y moderno**: Estilo Apple / Linear con paleta en azul profundo, acentos dorados y fondo suave.
- **Favicons automáticos**: Integración con el servicio oficial de Google Favicons para mostrar el icono real y nítido de cada sitio web.
- **Organización por categorías**: Agrupación inteligente en *Operación diaria*, *Clientes & proyectos*, *IA & productividad*, *Marketing & contenido*, *Webs & tecnología*, *Administración* y *Archivo inteligente*.
- **Acciones rápidas superiores**: Acceso instantáneo con un clic a herramientas frecuentes (ChatGPT, Gmail, Calendar, Drive).
- **Reloj en vivo**: Fecha y hora local actualizadas en tiempo real en formato en español.
- **Búsqueda global instantánea**: Filtra por nombre, URL, categoría o tag en tiempo real, con atajo de teclado rápido `⌘K` o `Ctrl+K`.
- **Edición y borrado directo**: Botones de acción en cada tarjeta para abrir (`↗`), editar (`✏️`) o eliminar (`✕`).
- **Panel de Control (Admin)**:
  - Formulario intuitivo para agregar y editar favoritos con asignación de categoría y tag.
  - Buscador y listado completo de favoritos para gestión ágil.
  - **Exportar respaldo JSON**: Descarga un archivo listo para reemplazar `links.json` y actualizar permanentemente tu GitHub Pages.
  - **Importar favoritos de Chrome**: Sube tu archivo `.html` exportado de Chrome/Edge/Brave; el sistema categoriza automáticamente y omite duplicados.
  - **Restaurar valores originales**: Borra los datos locales y restablece el estado inicial desde `links.json`.

---

## 📁 Estructura del proyecto

```text
pakoOS/
├── index.html     # Estructura semántica del Command Center y modal de administración
├── style.css      # Hoja de estilos responsiva (Desktop, Tablet, Mobile)
├── app.js         # Lógica, render reactivo, favicons, reloj, persistencia y respaldos
├── links.json     # Base de datos inicial con metadata y lista de favoritos
└── README.md      # Documentación y guía de despliegue
```

---

## 🚀 Publicar en GitHub Pages

1. Sube los archivos a la raíz de tu repositorio en GitHub (ej. `pako-os`).
2. En GitHub, entra a **Settings** > **Pages**.
3. En la sección **Build and deployment**, selecciona:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/(root)`
4. Haz clic en **Save**. En un par de minutos tu sitio estará en vivo en:
   `https://TU-USUARIO.github.io/pako-os/`

---

## 💾 Cómo sincronizar cambios locales con GitHub

Los cambios que realizas en el sitio web (agregar, editar o eliminar favoritos) se guardan al instante en tu navegador mediante `localStorage`.

Para hacer que esos cambios sean permanentes para cualquier dispositivo o navegador en tu GitHub Pages:

1. Abre el **Panel Admin** (⚙️).
2. En la sección *Respaldos & Sincronización*, haz clic en **Descargar links.json**.
3. Renombra el archivo descargado como `links.json` (si tu navegador le agregó un sufijo).
4. Sube este nuevo `links.json` a tu repositorio en GitHub reemplazando el anterior.
5. ¡Listo! Tu sitio en GitHub Pages se actualizará automáticamente con tu nueva lista.


## ☁️ Sincronización automática (vigente)

**Producción:** https://pako-os.vercel.app/  
**Repositorio:** https://github.com/pakostudio/pakoOS  
**Base de datos:** Supabase, proyecto PAKO; tabla privada \`public.pako_os_workspaces\`.

- La aplicación conserva su catálogo inicial de 56 enlaces en \`links.json\`.
- Para modificar favoritos, inicia sesión **una sola vez por dispositivo** con tu cuenta PAKO (Supabase Auth).
- Agregar, editar, importar, eliminar o restaurar favoritos envía los cambios automáticamente a Supabase.
- Los cambios se recuperan en Mac y iPhone al abrir el sitio; si ambos están abiertos, se comprueban nuevas versiones cada 30 segundos mientras la página esté visible.
- Un borrador local mantiene cambios pendientes si la conexión falla; se reintenta al volver a estar disponible.
- La columna \`revision\` impide sobrescrituras silenciosas: se reconcilian cambios por identificador de favorito.
- La base de datos protege cada registro con RLS \`auth.uid() = owner_id\`. Las claves secretas o de \`service_role\` nunca se usan en el navegador.
- Los archivos en GitHub definen **el código** y Vercel lo despliega; los **favoritos** se guardan en Supabase, no como commits en GitHub.
- El botón "Descargar respaldo JSON" ofrece una copia manual adicional.
- La migración de estructura se versiona en \`supabase/migrations/\` y ya se aplicó al proyecto PAKO.

### Comprobaciones

Validar que la tabla solo sea visible para su propietario, que el catálogo tenga 56 enlaces, que el Panel Admin exija autenticación, que la búsqueda funcione y que se recuperen los cambios guardados tras recargar.
