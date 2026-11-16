# Plan de trabajo · 7 días (2026-11-14 → 2026-11-21)

El calendario original reparte 4 hitos en 15 semanas; aquí **todo se comprime en 7 días**. El orden es el de la especificación
(sección 15) pero con salidas verificables por día. Es una propuesta: si un día se atrasa, se recorta alcance (ver «Recorte»),
no calidad ni seguridad.

## Línea base

| Cosa | Estado |
|---|---|
| Repos `37-cuaderno-agricola-app` y `-api` con config de IA, arquitectura y docs | Hecho el 14-nov (en Windows; se mueven a WSL2) |
| Paleta validada WCAG AA | Hecho (`npm run check:contrast`) |
| Hook de seguridad | Hecho (31/31 pruebas) |
| Capa de datos y servicios (Hito 2 adelantado, D29) | Hecho el 14-nov: SQLite, repositorios, servicios, criterios 1 y 2, 100 % de cobertura |
| Hito 1 (UI) | Hecho el 14/15-nov: layout, tema claro/oscuro, componentes accesibles, 4 pantallas + formularios, ubicación/altitud y los 4 gestos con botón alterno. **Falta probarlo en el A35 y el A2** (`expo start`), TalkBack y el D1 de WSL2 |
| WSL2 | **Bloqueo parcial (14-nov)**: paquete WSL 3.0.5 instalado, pero `VirtualMachinePlatform` falló con DISM 0xc1900401 por un **reinicio pendiente** de Windows. Falta: reiniciar (opción «Reiniciar», no «Apagar») y reintentar (`docs/FASE0-WSL.md`) |
| Pruebas de contención, `npm run check` | Pendientes de WSL2 y de instalar dependencias |
| Modo de trabajo actual | **Windows sin sandbox, temporal (D13)**: excepción en `.claude/settings.local.json`; migrar a WSL2 en cuanto se pueda. El plan de días sigue igual, pero cada pieza se vuelve a verificar al migrar |

## Calendario

| Día | Fecha | Objetivo | Terminado cuando… |
|---|---|---|---|
| D0 | sáb 14 | Fase 0 y 1 (parte sin WSL2) | Repos, config de IA, paleta, plan. **Tú:** instalar WSL2 y reiniciar |
| D1 | dom 15 | WSL2 + herramientas; repos dentro de WSL2; 10 pruebas de contención; scaffold de ambos proyectos; `npm run check` verde en vacío; CI | `/sandbox` activo; evidencias en `ia/`; check verde |
| D2 | lun 16 | **Hito 1**: NativeWind + tokens, 4 rutas, formularios validados (sección 7), 2 gestos con botón alterno, ubicación + altitud con respaldo manual | Navegable en el A35; lógica pura (días desde siembra, próxima labor, altitud desde presión) con pruebas |
| D3 | mar 17 | **Hito 2**: SQLite (migraciones, repositories), CRUD, búsqueda, cosechas por lote/mes, modo sin conexión | Funciona en modo avión; criterios 1 y 2 en verde |
| D4 | mié 18 | **API**: emulador, auth (4 rutas), `lotes`/`labores`/`produccion`, Zod, errores, Vitest (401, 400, aislamiento) | Rutas probadas contra el emulador; 3+ pruebas de ruta |
| D5 | jue 19 | **Hito 3**: login + refresh en la app, sincronización, imágenes (Blob), 2.º sensor, recordatorio de riego; **despliegue en Vercel** y Firebase de producción | App del celular habla con la API desplegada (`/api/health`) |
| D6 | vie 20 | **Hito 4**: lanzar **EAS Build temprano** (la cola puede tardar), pruebas ≥80 %, accesibilidad con TalkBack, auditoría de seguridad (grep + bundle), README | APK instalado y probado en el A35 y el A2 |
| D7 | sáb 21 | Colchón: bitácora, evidencias de IA completas, ensayo de la defensa | Todo en la lista de verificación de abajo |

## Trazabilidad a la especificación

| Requisito | Día | Dónde |
|---|---|---|
| RF-01 CRUD lotes y labores | D3 | `repositories` + `services` |
| RF-02 lote «aquí» con coordenadas y altitud | D2 | `lote/nuevo`, `sensors` |
| RF-03 días desde siembra y próxima labor | D2 | función pura + prueba |
| RF-04 cosechas en kg por lote y mes | D3 / D4 | servicio local y `GET /api/lotes/:id/produccion` |
| RF-05 foto de la labor | D5 | `expo-camera`, `expo-image-manipulator`, `POST /api/imagenes` |
| RF-06 recordatorio de riego | D5 | `expo-notifications` |
| Criterios de aceptación 1–3 | D2–D3 | pruebas con mocks (sin barómetro → altitud GPS con aviso) |
| Validaciones (sección 7) | D2 / D4 | formularios y Zod |

## Recorte de alcance si falta tiempo (en este orden)

1. Reto opcional del gráfico de barras.
2. Modo oscuro en pantallas (los tokens ya existen).
3. Tercer reto de excelencia (`gitleaks`).
4. Búsqueda avanzada (queda búsqueda simple por nombre).
**No se recorta:** seguridad (secretos), pruebas mínimas, accesibilidad básica, sincronización, APK, evidencias de IA.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| WSL2 no se instala (necesita administrador, reinicio; virtualización en BIOS **sí está activa**) | Es lo primero del D1; sin él no hay sandbox ni se pueden hacer las pruebas de contención |
| 7,6 GB de RAM para WSL2 + Metro + emuladores (Java) | `.wslconfig` con `memory=4GB`; emuladores solo cuando se necesiten; EAS compila en la nube (no Gradle local) |
| Cola gratuita de EAS Build | Lanzar un build de prueba el D5, no el D7 |
| **Verificado con `adb` el 14-nov en los dos celulares:** **ninguno tiene barómetro**. El A35 (SM-A356E, Android 16, arm64, 7,6 GB) tiene luz, magnetómetro, giroscopio, GPS y pasos. El Redmi A2 (23026RN54G, Android 13 Go, **1,8 GB de RAM, CPU de 32 bits `armeabi-v7a`**) solo tiene acelerómetro, luz, pasos y GPS (sin giroscopio ni magnetómetro) | La altitud GPS con aviso (criterio 3) será el camino real en ambos; el barómetro se prueba solo con mocks. `LightSensor` sí se prueba en dispositivo (está en los dos). No depender de giroscopio/magnetómetro |
| El A2 es de 32 bits y de poca RAM: puede fallar o ir lento donde el A35 va bien (New Architecture, Reanimated 4, Hermes) | Verificar en el D1 que el APK de EAS incluye `armeabi-v7a` (es lo habitual, pero no lo he comprobado) y probar temprano en el A2; es el dispositivo de validación de rendimiento |
| Cuota de Vercel Blob (2000 subidas avanzadas/mes; excederla bloquea Blob 30 días) | Mock en pruebas, no subir en bucles, borrar imágenes de prueba |
| Compatibilidad de NativeWind con la versión de Expo | Verificar al scaffoldear (D1); si falla, preguntar alternativa |
| Plazo muy corto | Recorte de alcance definido arriba |

## Lista de verificación final (D7)

- [ ] `npm run check` verde en ambos repos y CI en verde
- [ ] 10 pruebas de contención con captura (y 2 con «sin la regla sí funcionaba») en `ia/`
- [ ] Primer commit de cada repo contiene `AGENTS.md`, config de IA, `.gitignore`, `env.example`, scripts de calidad
- [ ] Sin secretos en repos ni en el APK (`grep -r` + revisar el bundle)
- [ ] Reglas de Firestore `allow read, write: if false`; tokens en `expo-secure-store`
- [ ] APK instalado y probado; URL de la API; README con capturas; bitácora con ≥3 correcciones a la IA
- [ ] Puedo explicar cada línea y modificar algo en vivo
