# Arquitectura de la app

Basada en `docs/ESPECIFICACION.md` (secciones 2, 3, 8 y 9). Nada de esto añade tecnologías fuera de la especificación y de
`docs/DECISIONES.md`.

```text
[ Pantallas app/ ]  Expo Router: login · registro · (app)/(tabs)/{index,labores,cuenta} · (app)/lote/… · (app)/labor/… · (app)/foto/[id]
      │  usan
[ src/hooks + src/context ]   estado de UI: carga / vacío / error / reintento (hooks propios + Context)
      │  llaman
[ src/services ]   reglas de negocio: días desde siembra, próxima labor, total por lote/mes, sincronización
      │            ├── usa src/repositories → src/db (expo-sqlite, SQL parametrizado, migraciones)
      │            └── usa src/api (fetch + Bearer + refresh) → API en Vercel
[ src/sensors ]    hooks por sensor: lógica pura (testeable) separada de la lectura real
[ src/components ] UI reutilizable y accesible, estilos con NativeWind y tokens de src/theme
```

Regla de dependencias: `app → components/hooks → services → repositories → db`. Las pantallas no escriben SQL ni usan `fetch`.

## Rutas

Sin sesión solo existen `login` y `registro`; con sesión, el grupo `(app)` (D63). Las URL no incluyen el nombre del grupo.

| Ruta | Contenido | Gestos / sensores |
|---|---|---|
| `login` · `registro` | Correo y contraseña (D64); si sale bien, la sesión nueva abre `(app)` sola | — |
| `(app)/(tabs)/index` | Lotes con días desde la siembra | Deslizar horizontal entre lotes (+ botones anterior/siguiente) |
| `(app)/(tabs)/labores` | Labores recientes y próximas | Mantener presionado = duplicar con fecha de hoy (+ botón «Duplicar») |
| `(app)/(tabs)/cuenta` | Correo de la sesión y «Cerrar sesión» (D65) | — |
| `(app)/lote/nuevo` | Registrar lote con ubicación y altitud | `expo-location` (+ `Barometer` si existe); entrada manual de respaldo |
| `(app)/lote/[id]` | Bitácora, fotos, producción | Pellizco para ampliar foto (+ botón); `expo-camera` con galería de respaldo |

Gestos propuestos (mínimo 2 de los 4 del documento; **por confirmar**): deslizar entre lotes y mantener presionado.

## Capacidades del dispositivo (propuesta, por confirmar)

| Capacidad | Rol | Respaldo |
|---|---|---|
| `expo-location` (altitud GPS) | **Obligatoria 1** (Hito 1) | Entrada manual |
| `expo-camera` | **Segunda capacidad (D89)**: «Tomar foto» en el formulario de labor | Galería |
| `Barometer` | Mejora de altitud (mejor esfuerzo). **Ausente en el A35 y en el A2 (verificado por `adb`)** | Altitud GPS con aviso de menor precisión (criterio de aceptación 3): en el A35 este es el camino real |
| `LightSensor` (solo Android) | **Segunda capacidad (D88)**: «Medir la luz con el sensor» rellena soleado/nublado (≥ 10 000 lx). **Presente en el A35 (STK31610) y en el A2 (virtual, sin lecturas)** | Selector manual soleado/nublado |
| `expo-notifications` | Recordatorio de riego local | Sin recordatorio |

## Modelo de datos y sincronización (D71–D77)

Tablas `lote` y `labor` (D32) con `created_at`, `updated_at`, `deleted_at`, `pending` y `sync_error` (D73), y `sync_estado` con el
cursor `since` de cada recurso y la última sincronización. Escritura **primero en SQLite** (`pending = 1`); la sincronización la
envía y después pide lo nuevo.

```text
SincronizacionProvider (dentro de (app), junto a la base del usuario)
   disparadores: abrir · volver a la app · volver la red (expo-network) · 3 s tras un cambio del usuario · botón «Sincronizar ahora»
        │  un solo ejecutor a la vez (ejecutorUnico)
sincronizar(ctx, cliente)               src/services/sincronizacionService.ts
   1. enviar    lotes · fotos · labores · imágenes por borrar
                                        src/services/sync/enviar.ts   PUT /api/<recurso>/<id> · DELETE (404 = hecho)
                                        src/services/sync/fotos.ts    POST /api/imagenes (bytes) · DELETE /api/imagenes?url=
   2. recibir   lotes y luego labores   src/services/sync/recibir.ts  GET /api/<recurso>?since=<cursor> (páginas de 500)
```

- **Gana lo pendiente de este teléfono** al recibir. «Última escritura gana» es por orden de llegada al servidor (P16).
- Un cambio editado mientras se enviaba no se da por enviado: se compara `updated_at` (`marcarLoteSincronizado`).
- El servidor rechaza un cambio (409 de nombre, 400…): la fila queda pendiente con `sync_error`; editarla lo quita y lo reintenta.
- Lo que llega se valida con zod (`esquemasRemotos.ts`); lo inválido se descarta y se cuenta.
- Sin red, 401, 429 o 5xx cortan la vuelta; lo ya enviado queda enviado. Un fallo del programa se muestra como mensaje genérico.

## Fotos (D83–D86)

```text
elegir  useGaleria ─ launchImageLibraryAsync(calidad 1) ─ ctx.fotos.guardar(uri, id)   PuertoFotos (src/services/fotos.ts)
                                                              └ real: src/context/fotosReal.ts  manipulate → 1600 px → JPEG 70 % →
                                                                Paths.document/fotos/<id>.jpg   (pruebas: fotosEnMemoria)
labor   foto_uri = copia local · foto_url = URL del servidor (null hasta subir)
subir   sync/fotos.ts subirFotos: leer bytes → POST /api/imagenes → guardarFotoUrl (solo si la labor no cambió; si cambió, la subida
        se encola para borrar) · archivo perdido / 413 / 415 → sync_error solo en esa labor
borrar  tabla fotos_por_borrar (migración 3): reemplazar · quitar · borrar labor · borrar lote → borrarFotosPorBorrar al final del envío
ver     fotoDe(labor) = foto_uri ?? foto_url · miniatura y visor muestran un aviso si la imagen no carga
```

- La API guarda los bytes en Vercel Blob (`POST /api/imagenes`, máximo ~4 MB) y solo deja borrar las imágenes de su dueño (403).
- En desarrollo la API usa un doble de Blob (`https://blob-local.invalid/…`): sube y borra «bien», pero no guarda nada (P11).
- Una labor con foto por subir no se envía hasta que su foto suba: así `foto_url` nunca queda a medias en el servidor.

## Recordatorio de riego (D90)

```text
Cuenta ─ PanelRecordatorios ─ useRecordatorios ─ recordatoriosService (activar · desactivar · cambiarHora · reprogramar)
ReprogramadorDeRecordatorios (en (app), tras CuadernoProvider): useEffect([ctx, version]) → reprogramarRecordatorios
recordatoriosService → ajustes (SQLite, migración 4) + planificarRecordatorios (pura) + ctx.notificaciones (PuertoNotificaciones)
planificarRecordatorios: por lote vivo, toca = (último riego | siembra) + 3 días → a la hora elegida, nunca en el pasado
notificacionesReal: expo-notifications · canal «riego» · cancelAll + schedule DATE (identifier riego-<lote>)
```

- Las reprogramaciones van en fila (no se pisan) y reemplazan TODO: es idempotente. Sin permiso concedido solo cancelan; nunca lo piden.
- Sin conexión funciona igual: el plan sale de la base local. Un solo aviso por lote; si se ignora no se repite hasta la próxima reprogramación.

## Cuaderno agrícola: ciclos, carencia, costos y reportes (D95)

```text
Lote ─ CabeceraDeLote ─ «Cerrar ciclo» ─ FormularioCiclo ─ cicloService.cerrarCiclo ─ tabla ciclo (+ lote nuevo ciclo)
Labor ─ CamposLabor ─ producto · carencia_dias · costo ─ carencia.ts (función pura) ─ AvisoDeCarencia (no bloquea)
ResumenLote ─ produccionDeLote (desde la siembra vigente): kg por mes · costo total · costo por kg
«Exportar PDF/CSV» ─ useReporte ─ reporteService (HTML escapado / CSV sin fórmulas) ─ PuertoReportes ─ expo-print · expo-sharing
```

Sincronización: lotes → ciclos → fotos → labores al subir; lotes → ciclos → labores al bajar. Los campos nuevos
son opcionales (`null`) para que el APK anterior y la API sigan entendiéndose.

## Resiliencia en campo (D96–D98)

```text
sincronizar ─ enviarPendientes ─ POST /api/sync (50 por viaje; 404 ⇒ PUT/DELETE sueltos) ─ resultado por cambio
            │                    └ cada PUT lleva base_updated_at = version_servidor ─ 409 «base_updated_at» ⇒ aviso de conflicto
            ├ recibirCambios ─ withExclusiveTransactionAsync (otra conexión) ─ aplicar* ─ fila pendiente + otro cambio ⇒ columna conflicto
            └ copiarFotosRemotas ─ PuertoFotos.descargar (fuera de transacción, 20 por vuelta, solo https) ─ foto_uri
Lote / Labor ─ ElegirVersion ─ conflictoService.resolverConflicto ─ «mía» (conservarLaMia) · «del otro dispositivo» (guardar…Remoto forzado)
```

`version_servidor`: `NULL` = aún no existe en el servidor; vacío = existe pero no se conoce su versión (filas anteriores a
la migración 6: no se compara y gana la última escritura); texto = el `updated_at` que puso el servidor.

## Sesión y cuentas (D60, D63–D69)

```text
RootLayout ─ SesionProvider (restaura la sesión SIN red) ─ NavegacionRaiz (Stack.Protected)
   ├─ sin sesión: login · registro
   └─ con sesión: (app)/_layout ─ CuadernoProvider(abrirContextoReal(uid)) ─ Stack + (tabs)
```

- `src/api/cliente.ts`: único lugar con `fetch`. Bearer, renovación única ante 401, tiempo máximo 15 s, errores `ErrorApi`/`ErrorDeRed`.
- `src/api/almacenSesion.ts`: tokens y usuario en `expo-secure-store` (puerto `AlmacenClaveValor`; el real solo se prueba en el teléfono).
- `src/services/sesionService.ts`: registrar / iniciar / cerrar sesión y traducción de errores a `Resultado` (por campo o `general`).
- Una base SQLite por usuario: `cuaderno-<uid>.db`. Cerrar sesión borra los tokens, **no** los datos locales; sin conexión se abre
  con la sesión guardada. Si la API rechaza la renovación del token (sesión caducada o cuenta deshabilitada), se vuelve al login.
- La sincronización usa `cliente.pedir` (renovación única de token incluida): ver «Modelo de datos y sincronización».

## Seguridad

Sin credenciales en la app. Única variable pública: `EXPO_PUBLIC_API_URL`. Tokens en `expo-secure-store`. HTTPS siempre; sin
`localhost` en el APK. Permisos mínimos en `app.json`.
