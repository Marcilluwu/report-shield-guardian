# Respuestas a las consultas

## 7. ¿Cómo funciona el placeholder.svg?

El archivo `placeholder.svg` es un archivo SVG (Scalable Vector Graphics) que se encuentra en la carpeta `public/`. Se utiliza como imagen de referencia o marcador de posición cuando no hay una imagen real disponible.

**Características:**
- Es un archivo vectorial, por lo que se puede escalar sin perder calidad
- Se carga rápidamente al ser un formato liviano
- Se puede usar como fallback cuando una imagen no carga
- Al estar en la carpeta `public/`, es accesible directamente desde la web

**Uso típico:**
```html
<img src="/placeholder.svg" alt="Placeholder" />
```

## 8. ¿Dónde está el archivo TXT para elegir la ruta de guardado?

El archivo de configuración se crea dinámicamente cuando usas el sistema. No existe un archivo físico fijo, sino que funciona así:

1. **Archivo de ejemplo**: Se ha creado `config-ejemplo.txt` que muestra el formato:
   ```
   Ruta = "C:\Reportes"
   ```

2. **Cómo funciona**:
   - Cuando necesites configurar la ruta, el sistema te pedirá que selecciones un archivo .txt
   - Puedes usar el archivo de ejemplo o crear tu propio archivo con el mismo formato
   - El sistema lee la línea que contenga `Ruta = "tu_ruta_aquí"`
   
3. **Ubicación**: El archivo puede estar en cualquier parte de tu computadora, ya que el sistema te permite seleccionarlo manualmente

4. **Formato**: El archivo debe ser un .txt simple con la línea:
   ```
   Ruta = "C:\tu\carpeta\de\reportes"
   ```

**Nota**: Este sistema permite flexibilidad, ya que cada usuario puede tener su archivo de configuración en su ubicación preferida.