/**
 * Constructores de filas para los tests. Devuelven objetos planos listos para
 * `db.table(...).insert(...)`: cada test arma solo lo que necesita y la
 * transacción global lo deshace al terminar.
 */

export const ID_POST_PUBLICADO = 9001
export const ID_POST_BORRADOR = 9002

export function unPostPublicado(extra: Record<string, unknown> = {}) {
  return {
    id: ID_POST_PUBLICADO,
    titulo: 'Post de prueba',
    slug: 'post-de-prueba',
    resumen: 'Resumen de prueba',
    cuerpo: '## Cuerpo de prueba',
    imagen_portada: null,
    estado: 'publicado',
    publicado_en: '2026-01-01 10:00:00',
    autor_id: 1,
    categoria_id: 1,
    autor_nombre: 'Marta Ruiz Calvo',
    autor_email: 'marta.ruiz@corriente.es',
    categoria_nombre: 'Noticias',
    etiquetas: 'Artículos',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-01 10:00:00',
    ...extra,
  }
}

export function unPostBorrador(extra: Record<string, unknown> = {}) {
  return unPostPublicado({
    id: ID_POST_BORRADOR,
    slug: 'post-borrador',
    estado: 'borrador',
    publicado_en: null,
    ...extra,
  })
}

export function unComentario(extra: Record<string, unknown> = {}) {
  return {
    id: 9101,
    post_id: ID_POST_PUBLICADO,
    autor_nombre: 'Lucía Ferrer',
    autor_email: 'lucia.ferrer@ejemplo.es',
    cuerpo: 'Un comentario suficientemente largo.',
    estado: 'pendiente',
    creado_en: '2026-02-02 09:30:00',
    padre_id: null,
    ...extra,
  }
}
