import { NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // 1. Extraer los datos del FormData
    const nombre = formData.get("nombre") as string;
    const apellido = formData.get("apellido") as string;
    const email = formData.get("email") as string;
    const telefono = formData.get("telefono") as string;
    const diocesis = formData.get("diocesis") as string;
    const entidadSalud = formData.get("entidadSalud") as string;
    const segmentacion = formData.get("segmentacion") as string;
    const hospedaje = formData.get("hospedaje") as string;
    const file = formData.get("imagen") as File;

    if (!file) {
      return NextResponse.json({ error: "No se subió ninguna imagen" }, { status: 400 });
    }

    // 2. Procesar y guardar la imagen
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Nombre de archivo único para evitar sobrescritura
    const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    // 3. Guardar en el archivo JSON (Base de datos temporal)
    const jsonPath = join(process.cwd(), "data", "registros.json");
    const dataDir = join(process.cwd(), "data");

    if (!fs.existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    let registros = [];
    if (fs.existsSync(jsonPath)) {
      const fileData = await readFile(jsonPath, "utf-8");
      registros = JSON.parse(fileData);
    }

    const nuevoRegistro = {
      id: Date.now(),
      nombre,
      apellido,
      email,
      telefono,
      diocesis,
      entidadSalud,
      segmentacion,
      hospedaje,
      rutaImagen: `/uploads/${uniqueName}`, // Ruta pública para verla en el panel
      fechaRegistro: new Date().toISOString()
    };

    registros.push(nuevoRegistro);
    await writeFile(jsonPath, JSON.stringify(registros, null, 2));

    return NextResponse.json({ message: "Registro completado con éxito" }, { status: 200 });

  } catch (error) {
    console.error("Error en el servidor:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}