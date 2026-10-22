import Post from '#models/post'

/**
 * Acceso a datos de los posts que necesitan los comentarios.
 */
export default class PostRepository {
  buscarPublicadoPorSlug(slug: string) {
    return Post.query().where('slug', slug).where('estado', 'publicado').first()
  }
}
