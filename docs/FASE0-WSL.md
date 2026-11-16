# Fase 0 · Instalar WSL2 y el entorno (lo haces tú; la IA no tiene permisos de administrador)

Estado detectado el 2026-11-14: Windows 11 Pro 26200 · virtualización en BIOS **activa** · WSL **no instalado** · 7,6 GB de RAM ·
Node 24.14.1 y Git en Windows · `adb` en Windows.

## 1. Instalar WSL2 (PowerShell **como administrador**)

```powershell
wsl --install -d Ubuntu
```

Reinicia el equipo cuando lo pida y crea el usuario de Linux al primer arranque. Comprueba con `wsl -l -v` (debe decir VERSION 2).

> **Incidencia del 14-nov (registrada):** la instalación elevada instaló el paquete WSL 3.0.5 pero falló al habilitar
> `VirtualMachinePlatform` con `DISM 0xc1900401` / `Wsl/WSL_E_INSTALL_COMPONENT_FAILED`.
>
> - **Hipótesis 1 (descartada):** reinicio pendiente. Se reinició Windows (18:12) y falló igual.
> - **Causa real (CBS.log):** en esta compilación (Windows 11 25H2, build 26200.8875) el componente es una *característica bajo
>   demanda* y no está en el disco; Windows debe bajarlo de Windows Update: `Failed to download FOD from WU [0xc1900401]`.
>   Esa descarga falla (`0x80240034`) y es el paquete «Windows 11, versión 25H2 (KB5132061)», la única actualización pendiente.
>   La red está bien (sin proxy, sin antivirus de terceros, servidores de Windows Update alcanzables).
> - **Intentado sin éxito:** renombrar la caché `catroot2` (queda `catroot2.bak.*`, es inofensiva); `SoftwareDistribution` no se pudo
>   renombrar (en uso); `DISM /RestoreHealth` → `0x800f0915` («el contenido de reparación no se encontró»).
> - **Corrección posterior (14-nov, 21:08):** la actualización KB5132061 **nunca estuvo descargada** (la IA leyó mal un evento: era de Defender).
>   Windows Update la marca `descargada: False`, el build no cambió tras reiniciar y en `SoftwareDistribution\Download` hay 8,9 GB de
>   archivos **del 10-nov**, probablemente corruptos o incompletos. Un reintento de habilitar la característica volvió a dar `0xc1900401`.
> - **Pendiente para destrabar WSL2 (no hecho):** detener `wuauserv`/`bits`/`DoSvc`/`UsoSvc`, vaciar `SoftwareDistribution\Download`, relanzar la
>   descarga e instalar con reinicio; alternativas: ISO de Windows 11 25H2 (actualización en el lugar) o VM Ubuntu en VirtualBox (cambia D1).
> - **Camino elegido por Brayan (D13):** avanzar ya en Windows **sin sandbox, temporal**, y migrar a WSL2 cuando se destrabe.

## 2. Limitar memoria y activar red espejo (decisión D1)

Crea `C:\Users\ASUS\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=4
networkingMode=mirrored
```

Luego `wsl --shutdown` y vuelve a abrir Ubuntu. Si el celular no llega a Metro por la red local, abre el puerto en el
firewall de Hyper-V de WSL (PowerShell administrador), según la documentación de Microsoft sobre red espejo:
`Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow`
(verifica el identificador en la documentación antes de ejecutarlo).

## 3. Paquetes del sistema (dentro de Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y bubblewrap socat git curl xz-utils openjdk-21-jre-headless
```

`bubblewrap` y `socat` son los que exige el sandbox de Claude Code; Java lo necesita el emulador de Firestore.

## 4. Node 24 en `/usr/local` (no con nvm; decisión D10)

El sandbox bloquea leer `~/`, y `nvm` vive allí. Misma versión que en Windows, con verificación de integridad:

```bash
V=v24.14.1
cd /tmp
curl -fsSLO https://nodejs.org/dist/$V/node-$V-linux-x64.tar.xz
curl -fsSLO https://nodejs.org/dist/$V/SHASUMS256.txt
grep " node-$V-linux-x64.tar.xz" SHASUMS256.txt | sha256sum -c -     # debe decir: OK
sudo tar -xJf node-$V-linux-x64.tar.xz -C /usr/local --strip-components=1
node -v && npm -v
```

## 5. CLIs de la nube (globales, solo para ti; la IA no los ejecuta sin preguntar)

```bash
npm view eas-cli version && npm view firebase-tools version && npm view vercel version   # confirman que existen
sudo npm install -g eas-cli firebase-tools vercel
git config --global user.name "Brayan Aldana"
git config --global user.email "brayanald02@gmail.com"
```

## 6. Traer los repos a Linux

```bash
mkdir -p ~/proyectos && cd ~/proyectos
git clone /mnt/c/Users/ASUS/Desktop/Code/Universidad/CuadernoAgricola_Final/37-cuaderno-agricola-app
git clone /mnt/c/Users/ASUS/Desktop/Code/Universidad/CuadernoAgricola_Final/37-cuaderno-agricola-api
```

A partir de aquí se trabaja **solo** en `~/proyectos/…`. Abre Claude Code **dentro** de cada repo (`cd ~/proyectos/37-cuaderno-agricola-app && claude`),
nunca en `~/proyectos`.

## 7. Verificar

En cada repo: abrir `claude` → `/sandbox` (activo, sin pestaña *Dependencies*) y `/status` (lista *Project settings*). Después, las 10
pruebas de `ia/PRUEBAS-CONTENCION.md`.

## 8. Sensores de tus celulares (desde Windows, con USB y depuración USB activa)

```powershell
adb devices
adb shell dumpsys sensorservice | Select-String -Pattern "pressure|barometer|light"
```

Si no aparece `pressure`/barómetro, la app usará la altitud del GPS (criterio de aceptación 3): es un caso previsto.

**Resultado del 14-nov (Samsung A35, SM-A356E, Android 16):** sin barómetro (0 coincidencias de `android.sensor.pressure` y sin la
característica `android.hardware.sensor.barometer`); con luz (STK31610), acelerómetro, magnetómetro, giroscopio, contador de pasos y GPS.

**Redmi A2 (23026RN54G, Android 13 Go, 1,8 GB de RAM, `armeabi-v7a`):** sin barómetro, sin giroscopio y sin magnetómetro; con
acelerómetro, luz, contador de pasos, GPS y cámara. Conclusión: el `LightSensor` está en ambos; la altitud será siempre por GPS.
