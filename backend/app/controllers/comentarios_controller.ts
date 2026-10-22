import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'
import {
  crearComentarioValidator,
  editarCuerpoValidator,
  identificacionValidator,
} from '#validators/comentario'

/**
 * Los tres endpoints responden `{ comentario }` sin el envoltorio `data` del
 * serializador, porque ese es el contrato de hoy.
 *
 * El orden de cada método (recurso → autorización → validación) es el de hoy: un
 * 404 gana a un 403 y un 403 gana a un 400.
 */
export default class ComentariosController {
  @inject()
  async store(
    { params, request, response, serialize, containerResolver }: HttpContext,
    servicio: ComentarioService
  ) {
    const post = await servicio.postPublicadoOFalla(params.slug)
    const datos = await request.validateUsing(crearComentarioValidator)
    const comentario = await servicio.crear(post, datos)

    response.status(201)
    return serialize.withoutWrapping(
      { comentario: ComentarioTransformer.transform(comentario) },
      containerResolver
    )
  }

  @inject()
  async update(
    { params, request, serialize, containerResolver }: HttpContext,
    servicio: ComentarioService
  ) {
    const comentario = await servicio.obtenerOFalla(params.id)
    const { autor_email: autorEmail } = await request.validateUsing(identificacionValidator)
    servicio.exigirPuedeEditar(comentario, autorEmail ?? '')
    const { cuerpo } = await request.validateUsing(editarCuerpoValidator)
    const actualizado = await servicio.editar(comentario, cuerpo)

    return serialize.withoutWrapping(
      { comentario: ComentarioTransformer.transform(actualizado) },
      containerResolver
    )
  }

  @inject()
  async destroy({ params, request }: HttpContext, servicio: ComentarioService) {
    const comentario = await servicio.obtenerOFalla(params.id)
    const { autor_email: autorEmail } = await request.validateUsing(identificacionValidator)
    await servicio.borrar(comentario, autorEmail ?? '', request.header('x-clave-moderacion'))

    return { borrado: true }
  }
}
