# Testing y límites de arquitectura

## Propietario de las familias consonantes

El módulo `src/content/approved-consonant-rhyme-catalog/` es el propietario
único de la extracción de la cola fonética consonante, la construcción de
familias y la decisión de pertenencia. Las capas consumidoras (aplicación,
CLI, validadores y adapters) deben usar su API pública; no pueden reconstruir
claves mediante vocales, tonicidad, sílabas, sufijos o catálogos locales.

La familia de tests de arquitectura combina inspección de dependencias,
detección de implementaciones equivalentes y dobles adversariales del
catálogo. Una prueba funcional que pase con un catálogo real no demuestra por
sí sola que el consumidor respete esta frontera.

## Excepciones temporales

Las excepciones se registran de forma individual en el arnés de arquitectura.
Cada entrada debe nombrar un fichero exacto, incluir el alcance implícito en
esa ruta, un motivo y una condición de retirada. No se permiten directorios,
globos ni exclusiones amplias: ocultarían deuda nueva.

La condición de retirada debe convertirse en una tarea o cambio identificable;
cuando se cumple, se elimina la entrada y el código excepcional. La suite
debe volver a ejecutarse después de retirar cada excepción.
