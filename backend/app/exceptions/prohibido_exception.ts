import { Exception } from '@adonisjs/core/exceptions'

/**
 * Quien llama no puede hacer esto con este recurso.
 * El mensaje es el que sale al cliente; lo da forma `app/exceptions/handler.ts`.
 */
export default class ProhibidoException extends Exception {
  static status = 403
}
