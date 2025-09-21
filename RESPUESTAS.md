# Respuestas a las consultas - ACTUALIZADO

## 7. ✅ ¿Cómo funciona el placeholder.svg?

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

## 8. ✅ ¿Dónde está el archivo TXT para elegir la ruta de guardado?

El archivo de configuración se encuentra en la raíz del proyecto como `config-ejemplo.txt`. 

**Para usarlo:**
1. Renómbralo a `config.txt` (opcional)
2. Edita la línea `Ruta = "tu/ruta/aquí"` con la ruta deseada
3. La aplicación cargará automáticamente esta configuración

**Formato esperado:**
```
Ruta = "C:\Users\TuUsuario\Documentos\Reportes"
```

## ✅ PROBLEMAS SOLUCIONADOS:

### 1. Firma digital alineada correctamente
- **Problema**: El panel de firma estaba desfasado varios pixeles
- **Solución**: Corregido el CSS del canvas de firma

### 2. Logo visible en el PDF
- **Problema**: El logo seleccionado no aparecía en el documento
- **Solución**: Agregado el logo en el header del PDF con visualización correcta

### 3. Sistema de logos funcional
- **Problema**: Los logos no se guardaban o mostraban correctamente
- **Solución**: Mejorada la carga, guardado y selección automática de logos PNG

### 4. Comentarios de imágenes sin deselección
- **Problema**: La caja de texto se deseleccionaba al escribir cada carácter
- **Solución**: Removido el `onFocus` problemático y mejorada la gestión del estado

### 5. Gestión de carpetas y nombre de archivo
- **Problema**: Faltaba un sistema para elegir carpetas de destino
- **Solución**: Sistema completo de FolderManager con formato `Inspección_[Carpeta]_[Fecha].pdf`

## CARACTERÍSTICAS ACTUALES:

### Sistema de Logos:
- ✅ Sube archivos PNG sin límite de cantidad
- ✅ Almacenamiento local en el navegador
- ✅ Selección automática del logo recién subido
- ✅ Vista previa mejorada del logo seleccionado
- ✅ Aparición correcta en el header del PDF

### Gestión de Reportes:
- ✅ Selector de carpetas existentes
- ✅ Creación de nuevas carpetas
- ✅ Formato automático del nombre: `Inspección_[Carpeta]_[Fecha].pdf`
- ✅ Firma digital funcional y alineada