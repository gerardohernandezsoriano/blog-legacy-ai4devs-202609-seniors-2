import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { traducirValidacion } from '#exceptions/contrato_comentarios'
import NoEncontradoException from '#exceptions/no_encontrado_exception'
import ProhibidoException from '#exceptions/prohibido_exception'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Son respuestas esperadas, no fallos: no se registran en el log.
   */
  protected ignoreExceptions = [NoEncontradoException, ProhibidoException]

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof NoEncontradoException || error instanceof ProhibidoException) {
      return ctx.response.status(error.status).send({ error: error.message })
    }

    if (error instanceof errors.E_VALIDATION_ERROR) {
      const traducido = traducirValidacion(ctx.route?.name, error.messages)
      if (traducido) {
        return ctx.response.status(traducido.status).send(traducido.cuerpo)
      }
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
