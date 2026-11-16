import { useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { useColores } from '@/theme/EsquemaProvider';
import { Icono } from './Icono';
import { MensajeError } from './MensajeError';
import { Texto } from './Texto';
import { unir } from './unir';

export interface CampoTextoProps {
  readonly etiqueta: string;
  readonly valor: string;
  readonly onChangeText: (texto: string) => void;
  readonly onBlur?: () => void;
  readonly error?: string;
  readonly ayuda?: string;
  readonly teclado?: KeyboardTypeOptions;
  readonly multilinea?: boolean;
  readonly maxLength?: number;
  /** Contraseña: los caracteres se ocultan y no se capitaliza ni se autocorrige. */
  readonly secreto?: boolean;
  /** Qué se muestra u oculta, para el lector de pantalla: «Mostrar la contraseña» (por defecto). */
  readonly secretoDe?: string;
  /** Pista para el gestor de contraseñas del teléfono (`email`, `password`, `password-new`…). */
  readonly autoCompletar?: TextInputProps['autoComplete'];
  /** Sin mayúsculas automáticas ni corrector (correos, usuarios). */
  readonly sinCorreccion?: boolean;
}

/** Contraseñas y correos se escriben tal cual: sin mayúsculas automáticas ni corrector. */
const entradaLiteral = (secreto?: boolean, sinCorreccion?: boolean) =>
  secreto || sinCorreccion ? ({ autoCapitalize: 'none', autoCorrect: false } as const) : {};

/** Clases de la entrada: alta mínima de 48 dp, más alta si es multilínea, y borde rojo si hay error. */
const clasesEntrada = (multilinea: boolean, hayError: boolean) =>
  unir(
    'min-h-[48px] flex-1 rounded-xl border-2 bg-surface px-4 py-2 text-base text-text',
    multilinea && 'min-h-[96px]',
    hayError ? 'border-danger' : 'border-border focus:border-focus',
  );

/** Botón de 48 dp para ver u ocultar lo escrito en una contraseña (P14). */
function BotonVisibilidad({
  secretoDe,
  visible,
  alAlternar,
}: {
  readonly secretoDe: string;
  readonly visible: boolean;
  readonly alAlternar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? `Ocultar ${secretoDe}` : `Mostrar ${secretoDe}`}
      onPress={alAlternar}
      className="h-12 w-12 items-center justify-center rounded-xl active:bg-surface-muted"
    >
      <Icono nombre={visible ? 'eye-off-outline' : 'eye-outline'} tono="primary" />
    </Pressable>
  );
}

/** Campo con etiqueta visible (no solo placeholder), pista de ayuda y error anunciable. */
export function CampoTexto({
  etiqueta,
  valor,
  onChangeText,
  onBlur,
  error,
  ayuda,
  teclado,
  multilinea = false,
  maxLength,
  secreto,
  secretoDe = 'la contraseña',
  autoCompletar,
  sinCorreccion,
}: CampoTextoProps) {
  const colores = useColores();
  const [visible, setVisible] = useState(false);
  return (
    <View className="gap-1">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <View className="flex-row items-center gap-2">
        <TextInput
          accessibilityLabel={etiqueta}
          accessibilityHint={ayuda}
          value={valor}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={teclado}
          multiline={multilinea}
          maxLength={maxLength}
          secureTextEntry={secreto && !visible}
          autoComplete={autoCompletar}
          {...entradaLiteral(secreto, sinCorreccion)}
          placeholderTextColor={colores.textMuted}
          textAlignVertical={multilinea ? 'top' : 'center'}
          className={clasesEntrada(multilinea, error !== undefined && error !== '')}
        />
        {secreto ? (
          <BotonVisibilidad
            secretoDe={secretoDe}
            visible={visible}
            alAlternar={() => setVisible((antes) => !antes)}
          />
        ) : null}
      </View>
      {ayuda ? <Texto variante="ayuda">{ayuda}</Texto> : null}
      <MensajeError texto={error} />
    </View>
  );
}
