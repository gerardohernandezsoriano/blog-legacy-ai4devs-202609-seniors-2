import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  ID_POST_PUBLICADO,
  unComentario,
  unPostBorrador,
  unPostPublicado,
} from '../helpers/datos.js'

/**
 * Tests de CARACTERIZACIÓN de los tres endpoints de comentarios:
 *
 *   POST   /posts/:slug/comentarios
 *   PATCH  /comentarios/:id
 *   DELETE /comentarios/:id
 *
 * Fijan lo que el sistema hace HOY, con sus bugs incluidos. Los que están marcados
 * «BUG» afirman un comportamiento que NO es el deseado: un refactor no los cambia.
 * Corregirlos es otra tarea, con su propio test que sustituirá al de aquí.
 */

// Clave de moderación tal como está hardcodeada hoy (BUG: secreto en el código).
const CLAVE_MODERACION = 'dev-secret-cambiar'

const CAMPOS_COMENTARIO = [
  'id',
  'post_id',
  'autor_nombre',
  'autor_email',
  'cuerpo',
  'estado',
  'creado_en',
  'padre_id',
]

/** Afirma la forma completa de la fila de comentario que devuelve la API. */
function afirmarContratoComentario(assert: any, comentario: any) {
  assert.sameMembers(Object.keys(comentario), CAMPOS_COMENTARIO)
  assert.isNumber(comentario.id)
  assert.isNumber(comentario.post_id)
  assert.isString(comentario.autor_nombre)
  assert.isString(comentario.autor_email)
  assert.isString(comentario.cuerpo)
  assert.isString(comentario.estado)
  assert.isString(comentario.creado_en)
  assert.match(comentario.creado_en, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  assert.isTrue(comentario.padre_id === null || typeof comentario.padre_id === 'number')
}

async function contarComentarios() {
  const filas = await db.from('comentarios').count('* as total')
  return Number(filas[0].total)
}

test.group('POST /posts/:slug/comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deja un comentario pendiente en un post publicado', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = Date.now()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(201)
    const cuerpo = respuesta.body()
    assert.sameMembers(Object.keys(cuerpo), ['comentario'])
    const comentario = cuerpo.comentario
    afirmarContratoComentario(assert, comentario)
    assert.equal(comentario.post_id, ID_POST_PUBLICADO)
    assert.equal(comentario.autor_nombre, 'Lucía Ferrer')
    assert.equal(comentario.cuerpo, 'Un comentario suficientemente largo.')
    assert.equal(comentario.estado, 'pendiente')
    assert.isNull(comentario.padre_id)
    // BUG (H3/H4): la respuesta devuelve el correo de quien comenta.
    assert.equal(comentario.autor_email, 'lucia.ferrer@ejemplo.es')

    // creado_en: hora UTC en formato SQL (no se fija el valor, es volátil).
    const creado = Date.parse(comentario.creado_en.replace(' ', 'T') + 'Z')
    assert.isAtLeast(creado, antes - 5000)
    assert.isAtMost(creado, Date.now() + 5000)

    // Queda guardado tal cual se devuelve.
    const guardada = await db.from('comentarios').where('id', comentario.id).firstOrFail()
    assert.deepEqual({ ...guardada }, comentario)
  })

  test('guarda el padre_id que se le pase', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Rubén Lima',
      autor_email: 'ruben.lima@ejemplo.es',
      cuerpo: 'Una respuesta al primer comentario.',
      padre_id: 9101,
    })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 9101)
  })

  test('BUG (H8): acepta un padre_id que no existe', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Rubén Lima',
      autor_email: 'ruben.lima@ejemplo.es',
      cuerpo: 'Una respuesta a un comentario fantasma.',
      padre_id: 424242,
    })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 424242)
  })

  test('sin nombre responde 400 { error }', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'El nombre es obligatorio' })
    assert.equal(await contarComentarios(), antes)
  })

  test('con el nombre vacío responde igual que sin nombre', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: '',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'El nombre es obligatorio' })
  })

  test('sin correo responde 422 { message }', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(422)
    respuesta.assertBody({ message: 'Falta el email' })
    assert.equal(await contarComentarios(), antes)
  })

  test('con un correo sin arroba responde 400 { errores }', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer.ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ errores: ['email no válido'] })
    assert.equal(await contarComentarios(), antes)
  })

  test('con un cuerpo corto responde 200 { ok: false } y no guarda nada', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Hola',
    })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ ok: false, motivo: 'comentario demasiado corto' })
    assert.equal(await contarComentarios(), antes)
  })

  test('sin cuerpo responde igual que con un cuerpo corto', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
    })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ ok: false, motivo: 'comentario demasiado corto' })
  })

  test('con varios campos inválidos gana el primero: nombre, correo, arroba, cuerpo', async ({
    client,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const sinNadie = await client.post('/posts/post-de-prueba/comentarios').json({})
    const sinCorreoNiCuerpo = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
    })
    const sinArrobaNiCuerpo = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'sin-arroba',
    })

    // Assert
    sinNadie.assertStatus(400)
    sinNadie.assertBody({ error: 'El nombre es obligatorio' })
    sinCorreoNiCuerpo.assertStatus(422)
    sinCorreoNiCuerpo.assertBody({ message: 'Falta el email' })
    sinArrobaNiCuerpo.assertStatus(400)
    sinArrobaNiCuerpo.assertBody({ errores: ['email no válido'] })
  })

  test('BUG (H13): acepta un correo que es solo "@"', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: '@',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.autor_email, '@')
  })

  test('un cuerpo de solo espacios llega como vacío y responde 200 { ok: false }', async ({
    client,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act: el bodyparser convierte las cadenas en blanco a null antes de la ruta.
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: '     ',
    })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ ok: false, motivo: 'comentario demasiado corto' })
  })

  test('responde 404 si el post no existe', async ({ client, assert }) => {
    // Arrange
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Post no encontrado' })
    assert.equal(await contarComentarios(), antes)
  })

  test('responde 404 si el post es un borrador', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostBorrador())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/post-borrador/comentarios').json({
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
    })

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Post no encontrado' })
    assert.equal(await contarComentarios(), antes)
  })

  test('el 404 del post gana a la validación de la entrada', async ({ client }) => {
    // Arrange: ninguna fila

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({})

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Post no encontrado' })
  })
})

test.group('DELETE /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el autor borra su comentario', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
    assert.isNull(await db.from('comentarios').where('id', 9101).first())
  })

  test('reconoce al autor sin distinguir mayúsculas ni espacios en el correo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: '  LUCIA.Ferrer@Ejemplo.ES ' })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
    assert.isNull(await db.from('comentarios').where('id', 9101).first())
  })

  test('toma el correo también de la query string', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .qs({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
  })

  test('un moderador con la clave borra sin correo', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
    assert.isNull(await db.from('comentarios').where('id', 9101).first())
  })

  test('el autor puede borrar un comentario ya aprobado', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    respuesta.assertBody({ borrado: true })
  })

  test('responde 403 si el correo es de otra persona', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes borrar este comentario' })
    assert.isNotNull(await db.from('comentarios').where('id', 9101).first())
  })

  test('un correo que no es texto no autoriza y responde 403', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete('/comentarios/9101').json({ autor_email: 12345 })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes borrar este comentario' })
    assert.isNotNull(await db.from('comentarios').where('id', 9101).first())
  })

  test('responde 403 sin correo y sin clave', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete('/comentarios/9101')

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes borrar este comentario' })
    assert.isNotNull(await db.from('comentarios').where('id', 9101).first())
  })

  test('responde 403 con una clave de moderación equivocada', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', 'clave-equivocada')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes borrar este comentario' })
    assert.isNotNull(await db.from('comentarios').where('id', 9101).first())
  })

  test('responde 404 si el comentario no existe, aunque no traiga credenciales', async ({
    client,
  }) => {
    // Arrange: ninguna fila

    // Act
    const respuesta = await client.delete('/comentarios/424242')

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Comentario no encontrado' })
  })

  test('responde 404 si el id no es numérico', async ({ client }) => {
    // Arrange: ninguna fila

    // Act
    const respuesta = await client.delete('/comentarios/abc')

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Comentario no encontrado' })
  })

  test('BUG (H10): borrar un comentario padre deja vivas a sus respuestas', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())
    await db.table('comentarios').insert(
      unComentario({
        id: 9102,
        autor_nombre: 'Rubén Lima',
        autor_email: 'ruben.lima@ejemplo.es',
        padre_id: 9101,
      })
    )

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.isNull(await db.from('comentarios').where('id', 9101).first())
    const hija = await db.from('comentarios').where('id', 9102).firstOrFail()
    assert.equal(hija.padre_id, 9101)
  })
})

test.group('PATCH /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el autor edita el cuerpo de su comentario pendiente', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(200)
    const cuerpo = respuesta.body()
    assert.sameMembers(Object.keys(cuerpo), ['comentario'])
    afirmarContratoComentario(assert, cuerpo.comentario)
    assert.deepEqual(cuerpo.comentario, {
      id: 9101,
      post_id: ID_POST_PUBLICADO,
      autor_nombre: 'Lucía Ferrer',
      // BUG (H3/H4): la respuesta devuelve el correo de quien comenta.
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un cuerpo ya corregido.',
      estado: 'pendiente',
      creado_en: '2026-02-02 09:30:00',
      padre_id: null,
    })
    const guardada = await db.from('comentarios').where('id', 9101).firstOrFail()
    assert.equal(guardada.cuerpo, 'Un cuerpo ya corregido.')
  })

  test('devuelve creado_en null si el comentario no tiene fecha', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ creado_en: null }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(200)
    assert.isNull(respuesta.body().comentario.creado_en)
  })

  test('no exige longitud mínima del cuerpo (la creación sí)', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'x' })

    // Assert
    respuesta.assertStatus(200)
    assert.equal(respuesta.body().comentario.cuerpo, 'x')
  })

  test('responde 403 si el correo es de otra persona', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es', cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
    const guardada = await db.from('comentarios').where('id', 9101).firstOrFail()
    assert.equal(guardada.cuerpo, 'Un comentario suficientemente largo.')
  })

  test('BUG (H12): compara el correo con mayúsculas, a diferencia del DELETE', async ({
    client,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'LUCIA.FERRER@EJEMPLO.ES', cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('BUG (H12): la clave de moderación no sirve para editar', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)
      .json({ cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('responde 403 si el comentario ya no está pendiente', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
    const guardada = await db.from('comentarios').where('id', 9101).firstOrFail()
    assert.equal(guardada.cuerpo, 'Un comentario suficientemente largo.')
  })

  test('BUG (H7): "Pendiente" con mayúscula cuenta como no pendiente', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario({ estado: 'Pendiente' }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('sin correo responde 403', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ cuerpo: 'Un cuerpo ya corregido.' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('sin cuerpo responde 400 { error }', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'Falta el cuerpo' })
    const guardada = await db.from('comentarios').where('id', 9101).firstOrFail()
    assert.equal(guardada.cuerpo, 'Un comentario suficientemente largo.')
  })

  test('con el cuerpo vacío responde igual que sin cuerpo', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: '' })

    // Assert
    respuesta.assertStatus(400)
    respuesta.assertBody({ error: 'Falta el cuerpo' })
  })

  test('el 403 gana al 400: correo ajeno y sin cuerpo responde 403', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    respuesta.assertBody({ error: 'No puedes editar este comentario' })
  })

  test('responde 404 si el comentario no existe, aunque no traiga entrada válida', async ({
    client,
  }) => {
    // Arrange: ninguna fila

    // Act
    const respuesta = await client.patch('/comentarios/424242').json({})

    // Assert
    respuesta.assertStatus(404)
    respuesta.assertBody({ error: 'Comentario no encontrado' })
  })
})
