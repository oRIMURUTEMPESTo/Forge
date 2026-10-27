# Fable Forge — Taller de D&D 5e

Aplicación web estática para crear cartas de monstruos, conjuros, objetos mágicos,
PNJ y encuentros; organizarlas en mazos y exportarlas como JSON, WebP o PDF.

## Ejecutar la aplicación

No requiere Node.js, dependencias ni proceso de compilación. Se recomienda servir
la carpeta por HTTP para que el navegador gestione de forma consistente las
imágenes y la impresión:

```bash
python3 -m http.server 8000
```

Después abre <http://localhost:8000>. También puedes usar cualquier servidor
estático que sirva esta carpeta. No abras únicamente `index.html` si el navegador
restringe el acceso a los archivos locales.

## Cómo está organizada

Los scripts se cargan en este orden al final de `index.html`. Son scripts clásicos
(no módulos ES), no usan paquetes externos y comparten el ámbito global de la
página. Mantén ese orden si añades o mueves archivos:

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura y controles de la interfaz; también define el orden de carga. |
| `styles.css` | Diseño, vista previa, editor, temas y estilos adaptables. |
| `data.js` | Catálogos de modos, campos, tamaños y temas; creación y normalización de datos guardados. |
| `app.js` | Estado de la aplicación, renderizado, edición de cartas, temas y mazos. |
| `assets.js` | Carga y procesamiento de ilustraciones, iconos y marcos. |
| `exports.js` | Exportaciones JSON/WebP, generación de páginas para PDF y menú de exportación. |
| `backup.js` | Copia completa, importación de datos y cierre con Escape. |
| `main.js` | Punto de inicio: dibuja la interfaz una vez cargados todos los scripts. |

`data.js` debe cargarse primero porque los otros archivos usan sus catálogos y
funciones. `main.js` va al final: inicializa la interfaz después de registrar los
eventos de todos los controles.

## Datos y copias de seguridad

Los mazos, cartas, temas e iconos se guardan en el almacenamiento local del
navegador con la clave `fable-forge-data-v1`. Los datos permanecen en ese navegador
y dispositivo; no se envían a un servidor. Usa **Copia de seguridad** antes de
probar cambios importantes o trasladar tus datos a otro dispositivo. La opción
**Importar datos** restaura una copia completa.

Al añadir o cambiar campos guardados, actualiza `DEFAULT_DETAILS` y
`normalizeCard` en `data.js` para que las cartas existentes sigan abriendo. No
cambies `STORAGE_KEY` salvo que quieras separar intencionadamente los datos de
esta versión o implementar una migración.

## Añadir un tipo de carta

1. Añade el tipo y sus opciones en el selector `#card-mode` de `index.html`.
2. Declara sus campos, metadatos, estadísticas y destacados en `MODES` dentro de
   `data.js`.
3. Añade sus valores vacíos a `DEFAULT_DETAILS` en `data.js`.
4. Comprueba los usos específicos del tipo en `renderPreview` (`app.js`) y en
   `printCardHTML` y `exportWebP` (`exports.js`), si necesita un sello o diseño
   distinto.
5. Si ese tipo tiene una interacción o control nuevo, añade el marcado en
   `index.html`, los estilos en `styles.css` y el comportamiento en el archivo
   que corresponda a esa responsabilidad.

Los campos estándar se generan desde `MODES`: normalmente basta con declarar el
campo allí y añadir su valor inicial a `DEFAULT_DETAILS`.

## Añadir un tamaño de carta

1. Añade una entrada en `CARD_SIZES` en `data.js`, con nombre, ancho y alto en
   milímetros, orientación de papel, columnas, cartas por hoja y la clase CSS de
   la vista previa.
2. Añade la opción correspondiente al selector `#deck-card-size` de `index.html`.
3. Define la clase de vista previa en `styles.css` usando las proporciones del
   nuevo tamaño.
4. Prueba la impresión individual y la de un mazo. `exports.js` toma las
   dimensiones y la disposición de hojas de `CARD_SIZES`.

El tamaño pertenece al mazo. Las copias de seguridad conservan esa opción y los
mazos anteriores se normalizan al tamaño Póker predeterminado.

## Añadir temas, iconos o recursos

- **Temas integrados:** modifica `BUILTIN_THEMES` en `data.js`; si el tema
  requiere reglas CSS específicas, añádelas en `styles.css`.
- **Iconos integrados:** agrega el símbolo a `ICONS` en `data.js`.
- **Subida de recursos:** los flujos de iconos, ilustraciones y marcos están en
  `assets.js`; las imágenes se procesan antes de guardarse en el navegador.
- **Estilos de la carta:** ajusta las reglas en `styles.css`. La vista previa y la
  impresión tienen estilos propios, así que valida ambas al cambiar la
  presentación.

## Comprobar cambios

Comprueba la sintaxis de todos los scripts con Node.js:

```bash
for file in data.js app.js assets.js exports.js backup.js main.js; do
  node --check "$file" || exit 1
done
```

Después abre la aplicación y prueba al menos: crear/editar una carta, cambiar de
modo, cambiar el tamaño, recargar para comprobar que se guardó, exportar una
carta/mazo y previsualizar un PDF por ambos lados. También conviene probar
importar una copia de seguridad después de cualquier cambio al modelo de datos.

## Nota de impresión

El PDF se prepara desde el diálogo de impresión del navegador. La escala y el
alineamiento dúplex pueden variar según la impresora; selecciona escala **100 %**
o **Tamaño real** y haz una prueba antes de imprimir un mazo completo.
