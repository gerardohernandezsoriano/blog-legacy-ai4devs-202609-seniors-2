import vine from '@vinejs/vine'

/**
 * Entrada de POST /posts/:slug/comentarios.
 *
 * Replica las reglas de hoy, no las ideales: el correo solo necesita una «@»,
 * el cuerpo cinco caracteres, y `padre_id` pasa tal cual (no se comprueba que exista).
 */
export const crearComentarioValidator = vine.create({
  autor_nombre: vine.string(),
  autor_email: vine.string().regex(/@/),
  cuerpo: vine.string().minLength(5),
  padre_id: vine.any().optional(),
})

/**
 * Identifica a quien llama en PATCH y DELETE. El correo es opcional y de cualquier
 * tipo: hoy la regla de autorización lo compara tal cual y decide que no puede, en
 * vez de rechazar la petición por el formato.
 */
export const identificacionValidator = vine.create({
  autor_email: vine.any().optional(),
})

/**
 * Entrada de PATCH /comentarios/:id. Sin longitud mínima, a diferencia de la creación.
 */
export const editarCuerpoValidator = vine.create({
  cuerpo: vine.string(),
})
