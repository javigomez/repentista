# infrastructure/weiwei-silabacion-adapter Specification

## Purpose
Aísla `weiwei/silabacion` detrás de un contrato propio para obtener sílabas y tonicidad sin delegarle la certificación métrica del producto.

## Requirements

### Requirement: Análisis de palabra normalizado
El adaptador SHALL devolver forma, sílabas, índice tónico y tipo aguda/llana mediante tipos propios, o un error explícito si el resultado no es confiable.

#### Scenario: Palabra soportada
- **WHEN** se analiza una palabra castellana cubierta por la política inicial
- **THEN** el resultado normalizado coincide con el fixture de oro y contiene la versión del adaptador y biblioteca

#### Scenario: Resultado no soportado
- **WHEN** la biblioteca falla, devuelve datos incoherentes o detecta una esdrújula
- **THEN** el adaptador devuelve un resultado no confiable y no inventa una segmentación

### Requirement: Contrato protegido frente a actualizaciones
El sistema MUST ejecutar una suite de contrato contra la versión fijada de la dependencia.

#### Scenario: Cambio incompatible de biblioteca
- **WHEN** una actualización cambia un resultado de oro
- **THEN** los tests fallan mostrando la palabra y ambos análisis
