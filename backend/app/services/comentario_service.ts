import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import NoEncontradoException from '#exceptions/no_encontrado_exception'
import ProhibidoException from '#exceptions/prohibido_exception'
import type Comentario from '#models/comentario'
import type Post from '#models/post'
import ComentarioRepository from '#repositories/comentario_repository'
import PostRepository from '#repositories/post_repository'

/**
 * Clave con la que se validan las acciones de moderación.
 * TODO(2024-11): sacarla a variables de entorno antes de subir a producción.
 */
const CLAVE_MODERACION = 'dev-secret-cambiar'

export type DatosNuevoComentario = {
  autor_nombre: string
  autor_email: string
  cuerpo: string
  padre_id?: any
}

/**
 * Reglas de negocio de los comentarios. Es el único sitio que muta estado.
 */
@inject()
export class ComentarioService {
  constructor(
    protected comentarios: ComentarioRepository,
    protected posts: PostRepository
  ) {}

  /**
   * Puede borrar quien lo escribió (el correo se compara sin distinguir mayúsculas
   * ni espacios) o cualquiera que traiga la clave de moderación.
   */
  static puedeBorrar(
    comentario: Pick<Comentario, 'autorEmail'>,
    email: string,
    clave: string | undefined
  ) {
    const esModerador = clave === CLAVE_MODERACION
    const esAutor =
      String(comentario.autorEmail).toLowerCase().trim() === String(email).toLowerCase().trim()
    return esModerador || esAutor
  }

  /**
   * Solo edita quien lo escribió, con el correo exacto, y mientras siga pendiente.
   * No admite la clave de moderación.
   */
  static puedeEditar(comentario: Pick<Comentario, 'autorEmail' | 'estado'>, email: string) {
    return comentario.autorEmail === email && comentario.estado === 'pendiente'
  }

  async postPublicadoOFalla(slug: string): Promise<Post> {
    const post = await this.posts.buscarPublicadoPorSlug(slug)
    if (!post) {
      throw new NoEncontradoException('Post no encontrado')
    }
    return post
  }

  async obtenerOFalla(id: string): Promise<Comentario> {
    const comentario = await this.comentarios.buscarPorId(id)
    if (!comentario) {
      throw new NoEncontradoException('Comentario no encontrado')
    }
    return comentario
  }

  crear(post: Post, datos: DatosNuevoComentario) {
    return this.comentarios.crear({
      postId: post.id,
      autorNombre: datos.autor_nombre,
      autorEmail: datos.autor_email,
      cuerpo: datos.cuerpo,
      estado: 'pendiente',
      creadoEn: DateTime.utc(),
      padreId: datos.padre_id ?? null,
    })
  }

  exigirPuedeEditar(comentario: Comentario, email: string) {
    if (!ComentarioService.puedeEditar(comentario, email)) {
      throw new ProhibidoException('No puedes editar este comentario')
    }
  }

  editar(comentario: Comentario, cuerpo: string) {
    return this.comentarios.actualizarCuerpo(comentario, cuerpo)
  }

  async borrar(comentario: Comentario, email: string, clave: string | undefined) {
    if (!ComentarioService.puedeBorrar(comentario, email, clave)) {
      throw new ProhibidoException('No puedes borrar este comentario')
    }
    await this.comentarios.eliminar(comentario)
  }
}
