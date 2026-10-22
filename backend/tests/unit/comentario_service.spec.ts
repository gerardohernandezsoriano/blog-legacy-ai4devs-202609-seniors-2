import { test } from '@japa/runner'
import { ComentarioService } from '#services/comentario_service'

/**
 * Reglas puras de autorización sobre un comentario. Fijan las reglas de HOY
 * (incluida la diferencia entre borrar y editar, que es el bug H12).
 */

// Clave de moderación tal como está hardcodeada hoy (BUG: secreto en el código).
const CLAVE_MODERACION = 'dev-secret-cambiar'

const pendiente = { autorEmail: 'lucia.ferrer@ejemplo.es', estado: 'pendiente' }
const aprobado = { autorEmail: 'lucia.ferrer@ejemplo.es', estado: 'aprobado' }

test.group('ComentarioService.puedeBorrar', () => {
  test('permite al autor, sin distinguir mayúsculas ni espacios', ({ assert }) => {
    // Arrange / Act / Assert
    assert.isTrue(ComentarioService.puedeBorrar(pendiente, 'lucia.ferrer@ejemplo.es', undefined))
    assert.isTrue(ComentarioService.puedeBorrar(pendiente, '  LUCIA.Ferrer@Ejemplo.ES ', undefined))
  })

  test('permite al autor aunque el comentario esté aprobado', ({ assert }) => {
    assert.isTrue(ComentarioService.puedeBorrar(aprobado, 'lucia.ferrer@ejemplo.es', undefined))
  })

  test('permite a quien trae la clave de moderación, sin correo', ({ assert }) => {
    assert.isTrue(ComentarioService.puedeBorrar(pendiente, '', CLAVE_MODERACION))
  })

  test('rechaza el correo de otra persona', ({ assert }) => {
    assert.isFalse(ComentarioService.puedeBorrar(pendiente, 'otra.persona@ejemplo.es', undefined))
  })

  test('rechaza sin correo y sin clave', ({ assert }) => {
    assert.isFalse(ComentarioService.puedeBorrar(pendiente, '', undefined))
  })

  test('rechaza una clave de moderación equivocada', ({ assert }) => {
    assert.isFalse(
      ComentarioService.puedeBorrar(pendiente, 'otra.persona@ejemplo.es', 'otra-clave')
    )
  })
})

test.group('ComentarioService.puedeEditar', () => {
  test('permite al autor con el correo exacto sobre un comentario pendiente', ({ assert }) => {
    assert.isTrue(ComentarioService.puedeEditar(pendiente, 'lucia.ferrer@ejemplo.es'))
  })

  test('rechaza el mismo correo con otras mayúsculas (BUG H12)', ({ assert }) => {
    assert.isFalse(ComentarioService.puedeEditar(pendiente, 'LUCIA.FERRER@EJEMPLO.ES'))
  })

  test('rechaza el correo con espacios alrededor', ({ assert }) => {
    assert.isFalse(ComentarioService.puedeEditar(pendiente, ' lucia.ferrer@ejemplo.es '))
  })

  test('rechaza si el comentario ya no está pendiente', ({ assert }) => {
    assert.isFalse(ComentarioService.puedeEditar(aprobado, 'lucia.ferrer@ejemplo.es'))
  })

  test('rechaza el correo de otra persona', ({ assert }) => {
    assert.isFalse(ComentarioService.puedeEditar(pendiente, 'otra.persona@ejemplo.es'))
  })

  test('rechaza sin correo', ({ assert }) => {
    assert.isFalse(ComentarioService.puedeEditar(pendiente, ''))
  })
})
