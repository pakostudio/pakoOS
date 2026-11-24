# PAKO OS — Command Center

Centro personal de favoritos y accesos, accesible desde Mac y iPhone.

**Sitio de producción:** https://pako-os.vercel.app/  
**Código fuente:** https://github.com/pakostudio/pakoOS  
**Base de datos:** proyecto **PAKO** en Supabase, tabla privada \`public.pako_os_workspaces\`.

## Arquitectura

| Servicio | Función |
| --- | --- |
| GitHub | Código fuente e historial de cambios |
| Vercel | Publicación automática desde la rama \`main\` |
| Supabase | Datos de favoritos sincronizados entre dispositivos |
| localStorage | Copia local de cambios pendientes, para poder recuperarlos si falla la conexión |

La edición de un favorito **no crea un commit** en GitHub: se guarda directamente en Supabase. GitHub y Vercel se usan para cambios de programación.

## Uso

1. Entra a https://pako-os.vercel.app/.
2. Pulsa **Activar nube** y utiliza la cuenta PAKO vinculada a Supabase Auth. La sesión permanece guardada en cada dispositivo hasta que expire o se cierre.
3. Utiliza **Agregar**, **Panel Admin**, importar favoritos de Chrome o editar/eliminar desde las tarjetas.
4. El indicador superior confirma **Guardado en nube** después de cada escritura. Si no hay conexión, muestra **guardado pendiente**; al recuperarse internet se reintenta.
5. Al abrir PAKO OS en otro dispositivo con la misma cuenta, carga los datos más recientes. Cuando la página está visible comprueba nuevas revisiones aproximadamente cada 30 segundos.

La primera vez se toma el catálogo inicial de 56 favoritos. Ya existe una copia de esos 56 en la cuenta PAKO de Supabase. El botón **Descargar respaldo JSON** permite exportar una copia adicional.

## Organización del código

- \`index.html\`: estructura accesible, Panel Admin y diálogo de acceso seguro.
- \`style.css\`: diseño responsive (escritorio, tablet y móvil).
- \`app.js\`: UI, formularios, búsqueda, importación de Chrome y edición.
- \`cloud.js\`: autenticación Supabase, sincronización, borradores locales y conciliación de versiones.
- \`links.json\`: catálogo de respaldo de fábrica.
- \`supabase/migrations/\`: esquema de base de datos y políticas RLS.

## Seguridad y persistencia

- La tabla \`pako_os_workspaces\` aplica Row Level Security (RLS): **\`auth.uid() = owner_id\`**. Otra cuenta autenticada no puede leer ni modificar los datos de PAKO.
- El cliente utiliza exclusivamente una clave publicable de Supabase. No se almacenan contraseñas, llaves secretas ni credenciales de servicio en el repositorio o en el frontend.
- Las operaciones sobre la nube usan la \`revision\` de la fila para detectar cambios concurrentes. Las modificaciones independientes se reconcilian por identificador de favorito antes de guardar.
- Si una escritura no termina, el borrador queda guardado en el navegador y se reintenta. El indicador nunca debe mostrar **Guardado en nube** antes de la confirmación del servidor.
- Para recuperar el catálogo de fábrica, utiliza **Restaurar original** con cuidado: la restauración también se aplica en la nube.

## Validación

La implementación se comprobó en Vercel con HTTPS: carga de HTML/JS/CSS/JSON, 56 favoritos, búsqueda, apertura/cierre del cuadro de inicio de sesión y denegación de acceso de escritura sin autenticación. En Supabase se validó la visibilidad RLS (propietario: una fila; otro usuario: cero) y el bloqueo de lectura anónima. El guardado autenticado desde navegador requiere iniciar sesión con la cuenta PAKO.
