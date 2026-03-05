# 📑 Lógica de Negocio: Sistema de Inscripciones Inteligente

Este proyecto implementa un motor de cálculo de precios dinámico que permite a los administradores cambiar las reglas de cobro en tiempo real desde la base de datos sin necesidad de modificar o desplegar código nuevo.

## ⚙️ Estructura del Cálculo de Precios
El precio final de una inscripción se determina mediante una jerarquía tridimensional de datos:

1.  **Precio Base:** Definido individualmente por cada **Diócesis/Jurisdicción**.
2.  **Descuento por Rol:** Aplicado según el perfil del usuario (ej. Sacerdote, Seminarista, Laico).
3.  **Ajuste por Hospedaje:** Cargo adicional opcional calculado según la política vigente.

### 💰 La Fórmula Matemática
El sistema utiliza la siguiente operación para determinar el total a pagar:

$$Total = \max(0, (\text{Precio Base} - \text{Descuento Rol}) + \text{Costo Hospedaje})$$

---

## 🛠️ Modos de Configuración (Estrategias)
A través de la tabla `configuracion_inscripcion`, el administrador puede alternar entre las siguientes estrategias de cobro:

### 1. Estrategia de Descuento (Variable `metodo_descuento`)
* **Modo Porcentaje (`porcentaje`):** Aplica una reducción relativa basada en la columna `descuento_porcentaje` de la tabla de roles.
* **Modo Fijo (`fijo`):** Resta un monto exacto en pesos definido en la columna `descuento_fijo`.
* **Modo Ninguno (`ninguno`):** Ignora los descuentos y aplica la tarifa plena de la Diócesis.

### 2. Estrategia de Hospedaje
* **Costo General:** Si `usar_hospedaje_diocesis` es `false`, se suma el valor de `valor_hospedaje_general` a todos los que marquen "SÍ".
* **Costo por Jurisdicción:** Si `usar_hospedaje_diocesis` es `true`, el sistema busca el valor en `precio_hospedaje_especifico` dentro de la tabla de la Diócesis seleccionada (útil para sedes con diferentes costos hoteleros).

---

## 🛡️ Seguridad y Sincronización
Para garantizar que el proceso sea transparente y a prueba de manipulaciones, el sistema opera en dos capas:

* **Cálculo en Tiempo Real (Frontend):** Utiliza `useMemo` y observadores (`watch`) en React para mostrar al usuario el desglose de su tarifa (Base, Descuento y Hospedaje) instantáneamente mientras llena el formulario.
* **Blindaje en Servidor (SQL Trigger):** Un disparador en PostgreSQL (`BEFORE INSERT`) intercepta la solicitud, consulta las tablas maestras y sobrescribe el campo `precio_pactado`. Esto evita que un usuario altere el precio modificando el código del lado del cliente.



## 🚫 Protección de Saldo Negativo
El sistema cuenta con una cláusula de **"Piso Cero"**. Si los descuentos aplicados son superiores al valor de la inscripción, el sistema ajusta automáticamente el total a **$0**, permitiendo inscripciones gratuitas pero nunca saldos negativos.

---

## 📂 Estructura de Tablas Requerida
| Tabla | Columnas Clave |
| :--- | :--- |
| `diocesis` | `precio`, `precio_hospedaje_especifico` |
| `tipos_persona` | `descuento_porcentaje`, `descuento_fijo` |
| `configuracion_inscripcion` | `metodo_descuento`, `usar_hospedaje_diocesis`, `valor_hospedaje_general` |
| `inscripciones` | `precio_pactado` (Calculado por Trigger) |

# 🔐 Lógica de Autenticación y Control de Acceso

El sistema utiliza **Supabase Auth** para gestionar el acceso al panel administrativo. La seguridad se basa en tres pilares:

1. **Persistencia de Sesión:** Manejada mediante cookies seguras para permitir que el administrador permanezca conectado mientras gestiona los registros.
2. **Middleware de Protección:** Un filtro de seguridad a nivel de servidor que intercepta las rutas `/admin/*`. Si no existe una sesión activa, el usuario es redirigido automáticamente al `/login`.
3. **Seguridad a nivel de Fila (RLS):** Las tablas críticas (`configuracion_inscripcion`, `diocesis`) están protegidas en la base de datos. Solo los usuarios autenticados pueden realizar operaciones `UPDATE` o `DELETE`.

### Flujo de Acceso
* **Público:** Acceso exclusivo al formulario de inscripción.
* **Privado:** Acceso al Dashboard, lista de inscritos y configuración de precios mediante credenciales de administrador.

