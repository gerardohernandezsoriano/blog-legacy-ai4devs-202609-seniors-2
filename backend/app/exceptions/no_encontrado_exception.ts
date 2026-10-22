import { Exception } from '@adonisjs/core/exceptions'

/**
 * Un recurso que se buscaba por slug o por id no existe (o no es visible).
 * El mensaje es el que sale al cliente; lo da forma `app/exceptions/handler.ts`.
 */
export default class NoEncontradoException extends Exception {
  static status = 404
}
