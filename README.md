# ModrinthAPI

Una librería para interactuar con la API de Modrinth, permitiendo la búsqueda, descarga y gestión de mods para Minecraft de manera sencilla.

## Instalación

Para instalar la librería, primero asegúrate de tener [Node.js](https://nodejs.org/) instalado. Luego, puedes clonar este repositorio o instalarlo a través de npm:

```bash
npm install modrinth-api-lib
```
## Uso
Primero, importa la librería en tu archivo JavaScript:

```javascript
const ModrinthAPI = require('modrinth-api');
const modrinth = new ModrinthAPI();

// Cambiar la ruta del archivo mods.json
modrinth.setModFile('./path/to/your/mods.json');

// Buscar y descargar un mod
modrinth.download('create', '1.18.2', './mods');

// Actualizar todos los mods en la carpeta
modrinth.update('./mods', '1.18.2');
```
## Mods.json
al descargar un mod la libreria hace un archivo .json la cual es un registro de cuales mods estan instalados, esto sirve para que el actualizador pueda funcionar.
