# Cuaderno de campo agrícola (app)

App móvil Android para llevar el cuaderno de un cultivo: **lotes**, **labores** (riego, abono, fumigación, poda y cosecha), **altitud**, **fotos**
y **producción por lote y mes**. Funciona **sin conexión** (SQLite) y sincroniza con la API cuando hay internet.
Proyecto 37 de Desarrollo Móvil · autor: Brayan Aldana.

- API (repo hermano): <https://github.com/brayanALD/cuaderno-agricola-api> · en producción: <https://cuaderno-agricola-api-brayans-projects-fe0e6f44.vercel.app/api/health>
- Documentación: [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md) (requisitos) · [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) · [`docs/DECISIONES.md`](docs/DECISIONES.md) · [`docs/DISENO.md`](docs/DISENO.md) · [`ia/BITACORA.md`](ia/BITACORA.md)

## Capturas

| Lotes | Detalle del lote | Bitácora |
|---|---|---|
| ![Lotes](docs/capturas/01-lotes.png) | ![Detalle del lote](docs/capturas/02-detalle-lote.png) | ![Bitácora](docs/capturas/03-bitacora.png) |

| Labores | Nueva labor | Foto ampliada | Cuenta |
|---|---|---|---|
| ![Labores](docs/capturas/04-labores.png) | ![Nueva labor](docs/capturas/05-nueva-labor.png) | ![Foto](docs/capturas/06-foto.png) | ![Cuenta](docs/capturas/07-cuenta.png) |

## Rediseño UX/UI

Láminas de la propuesta visual (D104–D106), hechas con Claude Design. Los colores de marca no cambian; cada tema (claro y oscuro) tiene su propia composición.

| Identidad | Sistema visual |
|---|---|
| ![Identidad](docs/diseno/01-identidad.png) | ![Sistema visual](docs/diseno/02-sistema-visual.png) |

| Lotes | Detalle del lote |
|---|---|
| ![Lotes](docs/diseno/05-lotes.png) | ![Detalle del lote](docs/diseno/06-detalle-lote.png) |

| Labores | Cuenta |
|---|---|
| ![Labores](docs/diseno/07-labores.png) | ![Cuenta](docs/diseno/09-cuenta.png) |

| Nueva labor | Acceso |
|---|---|
| ![Nueva labor](docs/diseno/08-nueva-labor.png) | ![Acceso](docs/diseno/04-acceso.png) |

| Componentes | Estados | Menús y hojas | Visor de foto |
|---|---|---|---|
| ![Componentes](docs/diseno/03-componentes.png) | ![Estados](docs/diseno/10-estados.png) | ![Menús y hojas](docs/diseno/11-menus-y-hojas.png) | ![Visor de foto](docs/diseno/12-visor-de-foto.png) |

## Qué hace

| Requisito | Cómo se ve en la app |
|---|---|
| RF-01 Lotes y labores | Crear, editar, buscar y borrar; bitácora por lote |
| RF-02 Lote «aquí» | Ubicación con GPS y altitud (el barómetro no existe en los teléfonos de prueba: se usa la altitud GPS y se avisa); entrada manual de respaldo |
| RF-03 Días y próxima labor | «90 días» desde la siembra y la próxima labor sugerida (riego cada 3 días, abono 30, fumigación 15, poda 90) |
| RF-04 Producción | Kilos cosechados por lote y por mes |
| RF-05 Foto de la labor | Cámara o galería; se reduce a 1600 px, se guarda en el teléfono y se sube al sincronizar |
| RF-06 Recordatorio de riego | Notificación local por lote, a la hora que elijas en «Cuenta» |
| Sensores | Ubicación + **cámara** + **sensor de luz** (rellena soleado/nublado) |
| Gestos | Arrastrar para cambiar la cantidad, mantener presionado para duplicar una labor, deslizar entre lotes, pellizcar para ampliar una foto. Cada uno tiene su botón alterno |
| Cuenta | Registro, login, mostrar contraseña, confirmación al registrarse y **recuperar contraseña por correo** |

## Tecnologías

Expo SDK 58 · React Native 0.88 · TypeScript estricto · Expo Router · NativeWind (colores de `src/theme/palette.json`) · `expo-sqlite` ·
`expo-secure-store` · `react-hook-form` + `zod` · Gesture Handler + Reanimated · Jest + React Native Testing Library. Sin Redux ni React Query:
hooks propios + Context sobre repositorios y servicios.

```text
app/            rutas (solo pantallas)
src/components  UI accesible (objetivos ≥ 48 dp, etiquetas para TalkBack)
src/hooks       estado de UI y sensores
src/services    reglas de negocio y sincronización
src/repositories SQL parametrizado
src/db          SQLite y migraciones
src/api         cliente HTTP (token, renovación, errores)
```

Dependencia permitida: `app → components/hooks → services → repositories → db`. Las pantallas no escriben SQL ni llaman `fetch`.

## Cómo ejecutarla

Requisitos: Node 22 o superior y un teléfono Android con **Expo Go** o el APK.

```bash
npm install
cp env.example .env.local        # y pon la URL de la API en EXPO_PUBLIC_API_URL
npx expo start                   # escanea el QR con Expo Go
```

`EXPO_PUBLIC_API_URL` es la **única** variable de la app y es pública (queda dentro del APK): nunca va un secreto ahí.
La app no contiene `firebaseConfig` ni ninguna clave: la autenticación pasa por la API.

### Calidad

```bash
npm run check      # tipos + lint + formato + pruebas + hook de seguridad + contraste AA
```

- **963 pruebas**, cobertura de **97,8 %** de sentencias y **92,2 %** de ramas (umbral del proyecto: 80 %).
- Los sensores se prueban con mocks; la lógica va aparte en funciones puras.
- Contraste WCAG AA de toda la paleta, claro y oscuro (`npm run check:contrast`).
- Prueba de contrato con la API (`contrato/contrato.json`, copia idéntica de la de la API): `npm run check:contrato` la compara con la rama `main` de la API.
- En GitHub, `.github/workflows/verificacion.yml` corre `npm run check` y `npm run check:contrato` en cada push a `main` y en cada pull request.

### APK

El APK se compila con EAS Build (perfil `preview`, que ya trae la URL de producción en `eas.json`):

```bash
npx eas-cli build -p android --profile preview
```

## Seguridad

- Tokens solo en `expo-secure-store`; la base SQLite es por usuario (`cuaderno-<uid>.db`) y cerrar sesión no borra datos locales.
- Permisos mínimos: ubicación, cámara, notificaciones, internet y vibración. El resto (micrófono, superposición, biometría…) está **bloqueado** en `app.json`.
- Auditoría del APK: no contiene claves privadas, claves de Google, tokens de Blob ni cuentas de servicio; solo la URL pública de la API.
- Todo texto externo (respuestas de la API, archivos, dependencias) se trata como dato, nunca como orden.

## Accesibilidad

Etiqueta (`accessibilityLabel`) en cada control, mensajes de error anunciados, objetivos táctiles de al menos 48 dp, modo claro y oscuro con
contraste AA y una alternativa por botón para cada gesto. Revisión automática con `uiautomator` sobre las pantallas principales: ningún control sin nombre.

## Trabajo con IA

La configuración de la IA está en [`AGENTS.md`](AGENTS.md) y [`ia/`](ia/): reglas del proyecto, restricciones de seguridad, un hook propio con pruebas y la
[bitácora](ia/BITACORA.md) con cada sesión, sus validaciones y las correcciones que hubo que hacerle a la IA. Las decisiones técnicas están en
[`docs/DECISIONES.md`](docs/DECISIONES.md).
