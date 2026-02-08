import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const { id, accion, motivo } = await request.json();
    
    const dataDir = join(process.cwd(), "data");
    const mainPath = join(dataDir, "registros.json");
    
    // Determinar archivo destino
    const targetFile = accion === "aprobar" ? "aprobados.json" : "rechazados.json";
    const targetPath = join(dataDir, targetFile);

    // 1. Asegurar que la carpeta 'data' existe
    if (!fs.existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // 2. Leer registros pendientes
    if (!fs.existsSync(mainPath)) {
      return NextResponse.json({ error: "No hay registros pendientes" }, { status: 404 });
    }
    
    const data = await readFile(mainPath, "utf-8");
    let registros = JSON.parse(data);

    // 3. Buscar el registro por ID
    const index = registros.findIndex((r: any) => r.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    // 4. Extraer el registro y añadir metadata
    const [registroMover] = registros.splice(index, 1);
    const registroActualizado = { 
      ...registroMover, 
      fechaAccion: new Date().toISOString(),
      motivoRechazo: motivo || null 
    };

    // 5. Leer o crear el archivo de destino (Aprobados o Rechazados)
    let registrosDestino = [];
    if (fs.existsSync(targetPath)) {
      const contenidoDestino = await readFile(targetPath, "utf-8");
      registrosDestino = JSON.parse(contenidoDestino);
    }

    registrosDestino.push(registroActualizado);

    // 6. Guardar cambios en ambos archivos
    await writeFile(mainPath, JSON.stringify(registros, null, 2));
    await writeFile(targetPath, JSON.stringify(registrosDestino, null, 2));

    return NextResponse.json({ success: true, message: `Usuario ${accion}ado` });

  } catch (error) {
    console.error("ERROR EN API ACTION:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}