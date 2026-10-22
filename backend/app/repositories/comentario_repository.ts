import Comentario from '#models/comentario'
import type { DateTime } from 'luxon'

export type NuevoComentario = {
  postId: number
  autorNombre: string
  autorEmail: string
  cuerpo: string
  estado: string
  creadoEn: DateTime
  padreId: number | null
}

/**
 * Acceso a datos de los comentarios. Es el único sitio donde se consulta la tabla.
 */
export default class ComentarioRepository {
  buscarPorId(id: string | number) {
    return Comentario.find(id)
  }

  crear(datos: NuevoComentario) {
    return Comentario.create(datos)
  }

  async actualizarCuerpo(comentario: Comentario, cuerpo: string) {
    comentario.cuerpo = cuerpo
    await comentario.save()
    return comentario
  }

  eliminar(comentario: Comentario) {
    return comentario.delete()
  }
}
