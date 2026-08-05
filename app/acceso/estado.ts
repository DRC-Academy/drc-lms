// El resultado de pedir un enlace, tal y como lo pinta el formulario.
//
// Vive en su propio módulo porque lo comparten la Server Action y el
// componente de cliente, y un fichero con "use server" solo debería
// exportar funciones asíncronas.
export type EstadoAcceso = {
  estado: "inicial" | "enviado" | "invalido" | "error";
  mensaje: string;
};
