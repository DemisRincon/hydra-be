# Hareruya Data Mapping

Este documento explica cómo se mapean los datos de Hareruya a la base de datos.

## Flujo de Mapeo

Cuando recibes un objeto de Hareruya como este:

```json
{
  "product": "91507",
  "product_name": "【Foil】(197)《ロフガフフの息子、ログラクフ/Rograkh, Son of Rohgahh》[CMR] 赤U",
  "product_name_en": "【Foil】《Rograkh, Son of Rohgahh》[CMR]",
  "card_name": "Rograkh, Son of Rohgahh",
  "language": "2",
  "price": "200",
  "image_url": "https://files.hareruyamtg.com/img/goods/L/CMR/EN/0197.jpg",
  "foil_flg": "1",
  "stock": "0",
  "weekly_sales": "0",
  "product_class": "592857",
  "card_condition": "1",
  "sale_flg": "0"
}
```

## Mapeo de Condiciones (card_condition)

El campo `card_condition` de Hareruya se mapea automáticamente:

| Hareruya Code | Código DB | Nombre Español       | Display Name         |
| ------------- | --------- | -------------------- | -------------------- |
| `"1"`         | `NM`      | Cerca de Mint        | Cerca de Mint        |
| `"2"`         | `SP`      | Ligeramente Jugada   | Ligeramente Jugada   |
| `"3"`         | `MP`      | Moderadamente Jugada | Moderadamente Jugada |
| `"4"`         | `HP`      | Muy Jugada           | Muy Jugada           |
| `"5"`         | `DM`      | Dañada               | Dañada               |

### Proceso de Mapeo

1. **Recibe `card_condition: "1"`** de Hareruya
2. **Busca en el mapa**: `conditionMap["1"]` → `{ code: 'NM', name: 'Cerca de Mint', display_name: 'Cerca de Mint' }`
3. **Busca en DB**: Busca si existe una condición con `code = 'NM'`
4. **Si existe**: Usa esa condición
5. **Si no existe**: Crea una nueva condición con esos datos
6. **Asigna**: Asigna el `condition_id` al producto

### Código de Implementación

```typescript
// En products.service.ts
const conditionMap: Record<
  string,
  { code: string; name: string; display_name: string }
> = {
  '1': { code: 'NM', name: 'Cerca de Mint', display_name: 'Cerca de Mint' },
  '2': {
    code: 'SP',
    name: 'Ligeramente Jugada',
    display_name: 'Ligeramente Jugada',
  },
  '3': {
    code: 'MP',
    name: 'Moderadamente Jugada',
    display_name: 'Moderadamente Jugada',
  },
  '4': { code: 'HP', name: 'Muy Jugada', display_name: 'Muy Jugada' },
  '5': { code: 'DM', name: 'Dañada', display_name: 'Dañada' },
};

const conditionData =
  conditionMap[hareruyaProduct.card_condition] || conditionMap['1']; // Default to Near Mint
let condition = await this.prisma.conditions.findUnique({
  where: { code: conditionData.code },
});
if (!condition) {
  condition = await this.prisma.conditions.create({
    data: {
      code: conditionData.code,
      name: conditionData.name,
      display_name: conditionData.display_name,
    },
  });
}
```

## Mapeo de Idiomas (language)

Similar proceso para idiomas:

| Hareruya Code | Código DB | Nombre Español     | Display Name       |
| ------------- | --------- | ------------------ | ------------------ |
| `"1"`         | `JP`      | Japonés            | Japonés            |
| `"2"`         | `EN`      | Inglés             | Inglés             |
| `"3"`         | `CS`      | Chino Simplificado | Chino Simplificado |
| `"4"`         | `CT`      | Chino Tradicional  | Chino Tradicional  |
| `"5"`         | `FR`      | Francés            | Francés            |
| `"6"`         | `DE`      | Alemán             | Alemán             |
| `"7"`         | `IT`      | Italiano           | Italiano           |
| `"8"`         | `KO`      | Coreano            | Coreano            |
| `"9"`         | `PT`      | Portugués          | Portugués          |
| `"10"`        | `RU`      | Ruso               | Ruso               |
| `"11"`        | `ES`      | Español            | Español            |
| `"12"`        | `AG`      | Antiguo            | Antiguo            |

### Proceso de Mapeo

1. **Recibe `language: "2"`** de Hareruya
2. **Busca en el mapa**: `languageMap["2"]` → `{ code: 'EN', name: 'Inglés', display_name: 'Inglés' }`
3. **Busca en DB**: Busca si existe un idioma con `code = 'EN'`
4. **Si existe**: Usa ese idioma
5. **Si no existe**: Crea un nuevo idioma con esos datos
6. **Asigna**: Asigna el `language_id` al producto

### Código de Implementación

```typescript
// En products.service.ts
const languageMap: Record<
  string,
  { code: string; name: string; display_name: string }
> = {
  '1': { code: 'JP', name: 'Japonés', display_name: 'Japonés' },
  '2': { code: 'EN', name: 'Inglés', display_name: 'Inglés' },
  '3': {
    code: 'CS',
    name: 'Chino Simplificado',
    display_name: 'Chino Simplificado',
  },
  '4': {
    code: 'CT',
    name: 'Chino Tradicional',
    display_name: 'Chino Tradicional',
  },
  '5': { code: 'FR', name: 'Francés', display_name: 'Francés' },
  '6': { code: 'DE', name: 'Alemán', display_name: 'Alemán' },
  '7': { code: 'IT', name: 'Italiano', display_name: 'Italiano' },
  '8': { code: 'KO', name: 'Coreano', display_name: 'Coreano' },
  '9': { code: 'PT', name: 'Portugués', display_name: 'Portugués' },
  '10': { code: 'RU', name: 'Ruso', display_name: 'Ruso' },
  '11': { code: 'ES', name: 'Español', display_name: 'Español' },
  '12': { code: 'AG', name: 'Antiguo', display_name: 'Antiguo' },
};

const languageData = languageMap[hareruyaProduct.language] || languageMap['2']; // Default to English
let language = await this.prisma.languages.findUnique({
  where: { code: languageData.code },
});
if (!language) {
  language = await this.prisma.languages.create({
    data: {
      code: languageData.code,
      name: languageData.name,
      display_name: languageData.display_name,
    },
  });
}
```

## Ejemplo Completo

### Input de Hareruya:

```json
{
  "card_condition": "1",
  "language": "2"
}
```

### Proceso Interno:

1. **Condición:**
   - `card_condition: "1"` → Busca `conditionMap["1"]`
   - Encuentra: `{ code: 'NM', name: 'Cerca de Mint', display_name: 'Cerca de Mint' }`
   - Busca en DB: `conditions.findUnique({ where: { code: 'NM' } })`
   - Si existe, usa ese ID. Si no, crea uno nuevo.

2. **Idioma:**
   - `language: "2"` → Busca `languageMap["2"]`
   - Encuentra: `{ code: 'EN', name: 'Inglés', display_name: 'Inglés' }`
   - Busca en DB: `languages.findUnique({ where: { code: 'EN' } })`
   - Si existe, usa ese ID. Si no, crea uno nuevo.

### Output en Base de Datos:

```json
{
  "id": "product-uuid",
  "condition_id": "condition-uuid", // ← Relacionado con condición NM
  "language_id": "language-uuid", // ← Relacionado con idioma EN
  "conditions": {
    "id": "condition-uuid",
    "code": "NM",
    "name": "Cerca de Mint",
    "display_name": "Cerca de Mint"
  },
  "languages": {
    "id": "language-uuid",
    "code": "EN",
    "name": "Inglés",
    "display_name": "Inglés"
  }
}
```

## Relaciones en la Base de Datos

```
products
├── condition_id → conditions.id
└── language_id → languages.id

conditions
├── id (UUID)
├── code (NM, SP, MP, HP, DM)
├── name (Cerca de Mint, etc.)
└── display_name

languages
├── id (UUID)
├── code (EN, JP, ES, etc.)
├── name (Inglés, Japonés, etc.)
└── display_name
```

## Ventajas de este Sistema

1. **Automático**: No necesitas crear condiciones/idiomas manualmente
2. **Consistente**: Siempre usa los mismos códigos y nombres
3. **Flexible**: Si falta una condición/idioma, se crea automáticamente
4. **Relacional**: Mantiene relaciones correctas en la base de datos
5. **Traducido**: Todo está en español para la UI

## Notas Importantes

- Si `card_condition` no está en el mapa (ej: "6", "7"), usa por defecto `"1"` (NM)
- Si `language` no está en el mapa, usa por defecto `"2"` (EN)
- Las condiciones e idiomas se crean automáticamente si no existen
- Una vez creados, se reutilizan para todos los productos futuros
