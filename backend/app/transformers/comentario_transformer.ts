import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

export default class ComentarioTransformer extends BaseTransformer<Comentario> {
  /**
   * Mantiene el contrato de hoy: claves en snake_case y `creado_en` como texto
   * `YYYY-MM-DD HH:mm:ss`.
   *
   * BUG (H3/H4): `autor_email` sale en la respuesta. Se deja igual hasta que se
   * decida como tarea aparte; este refactor no cambia el comportamiento.
   */
  toObject() {
    return {
      id: this.resource.id,
      post_id: this.resource.postId,
      autor_nombre: this.resource.autorNombre,
      autor_email: this.resource.autorEmail,
      cuerpo: this.resource.cuerpo,
      estado: this.resource.estado,
      creado_en: this.resource.creadoEn?.toFormat('yyyy-MM-dd HH:mm:ss') ?? null,
      padre_id: this.resource.padreId,
    }
  }
}
