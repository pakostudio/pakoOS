# PAKO OS v2 — Admin Ready

Sistema personal de favoritos y Command Center listo para GitHub Pages.

## Qué incluye

- Fondo claro estilo Apple / Linear.
- Buscador global.
- Panel Admin.
- Agregar favoritos.
- Editar favoritos.
- Eliminar favoritos.
- Exportar respaldo JSON.
- Importar favoritos de Chrome.
- Datos base en `links.json`.

## Archivos

- `index.html`
- `style.css`
- `app.js`
- `links.json`
- `README.md`

## Subir a GitHub Pages

1. Crea un repositorio llamado `pako-os`.
2. Sube todos los archivos a la raíz del repositorio.
3. En GitHub entra a `Settings`.
4. Entra a `Pages`.
5. En `Build and deployment`, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Guarda.

Tu sitio quedará en:

`https://TU-USUARIO.github.io/pako-os/`

## Cómo agregar, editar o eliminar links

Dentro de PAKO OS:

1. Clic en `Panel Admin`.
2. Agrega, edita o elimina favoritos.
3. Los cambios se guardan en tu navegador con `localStorage`.

## Importante sobre GitHub Pages

Los cambios hechos desde el Panel Admin se guardan localmente en tu navegador.

Para hacerlos permanentes en GitHub:

1. En Panel Admin, clic en `Exportar respaldo JSON`.
2. Descarga el archivo.
3. Renómbralo como `links.json`.
4. Súbelo a GitHub reemplazando el archivo anterior.

## Importar favoritos de Chrome

1. Exporta tus favoritos desde Chrome como `.html`.
2. En PAKO OS, entra a `Panel Admin`.
3. Usa `Importar favoritos de Chrome`.
4. PAKO OS detecta duplicados y agrega solo nuevos enlaces.
