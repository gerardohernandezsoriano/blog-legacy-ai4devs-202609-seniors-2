/**
 * Traduce los fallos de validación de los endpoints de comentarios al contrato de
 * errores que tienen HOY: cuatro formas distintas (400 { error }, 422 { message },
 * 400 { errores } y hasta un 200 { ok: false }).
 *
 * Es un andamio temporal para que el refactor no cambie lo que ve el cliente. Cuando
 * se decida unificar los errores (H11), este archivo se borra y se usa la respuesta
 * por defecto de VineJS.
 */

type MensajeValidacion = { field: string; rule: string }

type RespuestaError = { status: number; cuerpo: unknown }

const CUERPO_CORTO = {
  status: 200,
  cuerpo: { ok: false, motivo: 'comentario demasiado corto' },
}

export function traducirValidacion(
  ruta: string | undefined,
  mensajes: MensajeValidacion[]
): RespuestaError | null {
  const primero = mensajes[0]
  if (!primero) {
    return null
  }

  if (ruta === 'comentarios.store') {
    if (primero.field === 'autor_nombre') {
      return { status: 400, cuerpo: { error: 'El nombre es obligatorio' } }
    }
    if (primero.field === 'autor_email') {
      return primero.rule === 'required'
        ? { status: 422, cuerpo: { message: 'Falta el email' } }
        : { status: 400, cuerpo: { errores: ['email no válido'] } }
    }
    if (primero.field === 'cuerpo') {
      return CUERPO_CORTO
    }
  }

  if (ruta === 'comentarios.update' && primero.field === 'cuerpo') {
    return { status: 400, cuerpo: { error: 'Falta el cuerpo' } }
  }

  return null
}
