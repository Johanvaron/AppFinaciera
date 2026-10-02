# Criterios de aceptación de un PR

Esta app maneja plata. Un PR se mezcla solo cuando un revisor lo midió contra
esta lista y lo aprobó. Si no cumple, vuelve a corrección y se revisa de
nuevo, las veces que haga falta.

## Cómo se revisa

1. El revisor lee el diff completo y los archivos cambiados enteros.
2. Evalúa **cada** criterio: `cumple`, `no cumple` o `no aplica`, con
   evidencia (archivo:línea, test o comando ejecutado). "Se ve bien" no es
   evidencia.
3. Veredicto:
   - **APROBADO**: ningún criterio bloqueante en `no cumple`.
   - **CAMBIOS REQUERIDOS**: al menos uno. La revisión lista exactamente qué
     arreglar y cómo comprobar que quedó.
4. Tras la corrección revisa un revisor nuevo, sin el contexto del anterior.

Los criterios marcados **[B]** son bloqueantes. Los demás se anotan y se
corrigen si el arreglo es pequeño; si no, quedan como pendiente explícito en
el PR.

## A. Plata exacta

- **A1 [B]** Todo monto es un entero en pesos de punta a punta (base, API,
  cliente). Ninguna suma, resta o promedio pasa por un decimal sin redondeo
  explícito y justificado.
- **A2 [B]** Los porcentajes viajan como fracción (`0.25`) y solo se
  convierten al mostrarse, con `formatPercent`. Ninguna fracción se muestra
  cruda ni se multiplica dos veces por 100.
- **A3 [B]** Todo monto visible fuera de un campo editable pasa por
  `formatMoney` / `formatMoneyCompact` (`$ 1.250.000`). Dentro de un campo
  editable (`UiMoneyInput`) el monto va con `formatNumber` (`1.250.000`, sin
  `$`). Ningún número de plata se imprime sin uno de esos formatos.
- **A4 [B]** Las transferencias no cuentan como ingreso ni como gasto en
  ningún total.
- **A5 [B]** Dos cifras que representan lo mismo cuadran entre sí dentro de
  la pantalla y contra las demás pantallas y la API. Si dos cifras parecidas
  miden cosas distintas, cada una lleva un rótulo que lo deja claro.
- **A6 [B]** El signo y el color son correctos: ingreso en verde con `+`,
  gasto en tinta normal con `-`, rojo solo para alertas (vencido, excedido,
  saldo negativo).
- **A7 [B]** Un monto mal escrito nunca se guarda como 0 ni borra un valor
  existente. Son tres casos distintos:
  - Texto que no es un número (`abc`): se rechaza con un mensaje y no se
    envía nada al servidor.
  - Campo vacío donde el contrato admite `null`: quita el valor. Son solo
    dos campos: el monto de un presupuesto (`budgetInputSchema.amount`) y el
    monto del mes de un gasto fijo
    (`fixedMonthOverrideSchema.expectedAmount`).
  - Campo vacío en cualquier otro monto: se rechaza con un mensaje.

  `parseMoney` devuelve `null` tanto para el campo vacío como para el texto
  inválido, así que la pantalla distingue los dos casos antes de enviar: un
  `null` que sale de un texto inválido nunca llega al servidor.
- **A8 [B]** Cada cálculo de plata nuevo o cambiado tiene un test que fija el
  **texto que ve el usuario** (`'$ 1.250.000'`, `'26 %'`), con valores
  distintos entre sí para que confundir dos fuentes rompa el test.

## B. Integridad de datos

- **B1 [B]** Toda operación de varios pasos (pagar un fijo, restaurar un
  respaldo, reordenar, borrar con dependencias) es atómica: o se aplica
  completa o no cambia nada.
- **B2 [B]** No se pierden datos sin confirmación explícita. Todo borrado
  pide confirmación y dice qué más se ve afectado (por ejemplo, que un gasto
  fijo vuelve a quedar pendiente).
- **B3 [B]** Las consultas de datos (`SELECT`, `INSERT`, `UPDATE`,
  `DELETE`) viven solo en `server/repositories/`. Las únicas excepciones son
  `server/db.ts` (conexión, `PRAGMA`, transacciones y aplicación de
  migraciones) y `server/migrations/`. Todo **valor** va como parámetro
  (`?`), nunca pegado al texto del SQL. Los nombres de tabla o de columna
  solo se interpolan desde constantes del código, nunca desde la entrada.
- **B4 [B]** El servidor valida toda entrada con el schema del contrato y
  comprueba que los ids referenciados existan. El cliente no es la única
  barrera.
- **B5 [B]** Respaldo y restauración son de ida y vuelta: lo que se descarga
  se puede restaurar sin pérdida, y un archivo inválido se rechaza sin tocar
  la base.
- **B6** Una acción repetida por doble clic o por Enter seguido de blur no
  se ejecuta dos veces (no hay doble pago ni doble guardado).

## C. Fechas

- **C1 [B]** "Hoy" y toda fecha de calendario (`IsoDate`, `Month`) se
  derivan en hora local (`todayIso()`), nunca con `toISOString()`. Las marcas
  de tiempo (`createdAt`, `exportedAt`, `applied_at`) sí pueden guardarse en
  UTC con `toISOString()`; si se muestran, se convierten a hora local.
- **C2 [B]** Los cálculos por mes funcionan en fin de mes, en febrero, al
  cruzar de año, con meses de distinta longitud y en un mes futuro.
- **C3 [B]** Un pago cuenta para el mes al que aplica (`fixedMonth`), aunque
  su fecha caiga en otro mes.

## D. Contrato

- **D1 [B]** Lo que el servidor acepta y devuelve coincide con
  `shared/contract.ts`: campos, tipos, `null` frente a ausente y códigos HTTP.
- **D2 [B]** El cliente no redefine tipos del contrato ni llama a `fetch`
  fuera de `src/lib/api.ts`. El estado que viene del servidor (la caché de
  consultas) vive solo en `src/lib/queries.ts`. Los stores de Pinia quedan
  para estado de interfaz (período, tema, alta rápida) y no guardan copias de
  datos del servidor.
- **D3** Un cambio de forma de datos empieza en el contrato, en el mismo PR.

## E. Errores y estados

- **E1 [B]** Ninguna operación falla en silencio: todo error del servidor
  llega al usuario como mensaje en español que dice qué pasó.
- **E2 [B]** Cada vista tiene estado de carga, vacío y error con reintento, y
  no accede a datos sin definir mientras la consulta carga.
- **E3 [B]** Una operación en lote que falla a medias informa cuántas
  funcionaron y cuántas no, y deja la pantalla con los datos reales.
- **E4** Al cambiar de mes se cierran o descartan los modales y ediciones
  abiertas del mes anterior.
- **E5** No hay `console.log` de depuración ni `except`/`catch` mudo sin un
  comentario que explique por qué se ignora.

## F. Diseño y uso

- **F1 [B]** Sin gradientes decorativos, sin bordes decorativos ni look "en
  caja", sin tarjetas anidadas.
- **F2 [B]** Página a todo el ancho (sin `max-width` de página) y sin scroll
  horizontal de la página en 360, 390, 768, 1280 y 1920 px.
- **F3 [B]** Ningún texto de menos de 13 px. Ninguna cifra de 8 o 9 dígitos
  se corta ni se desborda en esos cinco anchos.
- **F4 [B]** Claro y oscuro: los colores salen de los tokens (clases del
  tema; en gráficas, `tokenColor(...)` recalculado al cambiar de tema). La
  única excepción es el color de una categoría, con
  `categoryHex(category.color)` y solo como punto o barrita, nunca como fondo
  grande. El texto normal cumple contraste 4,5:1.
- **F5** Controles de 40 px en celular y 32 px en escritorio; a 1920 px no
  quedan huecos grandes sin usar.
- **F6** Las gráficas van dentro de `ChartBox`, con el alto atado a la
  ventana y nunca al elemento vecino.
- **F7** Todo funciona con teclado: Enter envía, Esc cierra, el foco entra al
  primer campo de un modal y vuelve al cerrar. Los botones de solo ícono
  tienen `aria-label`.
- **F8** Interfaz en español neutro, sin emojis y sin `alert()` ni
  `confirm()` nativos. Ningún control visible sin función.

## G. Deuda

- **G1 [B]** Capas estrictas en el servidor: `routes → services →
  repositories`. Ninguna ruta ejecuta SQL ni importa un repositorio.
- **G2** Ningún archivo pasa de 500 líneas ni una función de 80.
- **G3** No se duplica algo que ya existe en la base (`src/components/ui`,
  `src/lib`, `BaseRepository`). A la segunda copia se extrae a la base.
- **G4** Sin código muerto, archivos vacíos ni números mágicos sin nombre.

## H. Verificación

- **H1 [B]** `pnpm typecheck` limpio.
- **H2 [B]** `pnpm test` en verde, y los tests nuevos cubren lo que el PR
  cambia (no solo lo que ya estaba cubierto).
- **H3 [B]** `pnpm build` termina bien.
- **H4** Las pantallas se probaron contra la API real, no solo contra el
  contrato.
