# PAKO OS

Command Center personal listo para GitHub Pages.

## Archivos

- `index.html`
- `style.css`
- `app.js`
- `links.json`

## Subir a GitHub Pages

1. Crea un repositorio en GitHub llamado `pako-os`.
2. Sube estos 4 archivos a la raíz del repositorio.
3. Entra a `Settings`.
4. Entra a `Pages`.
5. En `Build and deployment`, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Guarda.

Tu sitio quedará en:

`https://TU-USUARIO.github.io/pako-os/`

## Editar o agregar links

Abre `links.json`.

Cada acceso tiene esta estructura:

```json
{
  "name": "Nombre del acceso",
  "url": "https://ejemplo.com",
  "category": "Marketing & contenido",
  "tag": "Descripción corta",
  "favorite": false
}
```

Categorías recomendadas:

- Operación diaria
- Clientes & proyectos
- IA & productividad
- Marketing & contenido
- Webs & tecnología
- Administración
- Archivo inteligente

Guarda el cambio y GitHub Pages lo actualizará automáticamente.
