/**
 * AppShell — wrapper de back-compat.
 *
 * En Ola 8, el layout raíz pasó a llamarse TabShell (header horizontal con
 * tabs en lugar de bottom-nav). AppShell se mantiene como alias para no
 * romper imports en otros archivos que aún lo referencian.
 *
 * Si querés importar el shell, importá directamente de `./shell/TabShell.js`.
 */
export { TabShell as AppShell } from '../shell/TabShell.js';