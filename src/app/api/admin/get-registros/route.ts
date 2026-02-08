import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import fs from "fs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "pendientes";
  const fileName = tipo === "pendientes" ? "registros.json" : tipo === "aprobados" ? "aprobados.json" : "rechazados.json";
  const jsonPath = join(process.cwd(), "data", fileName);
  if (!fs.existsSync(jsonPath)) return NextResponse.json([]);
  const data = await readFile(jsonPath, "utf-8");
  return NextResponse.json(JSON.parse(data));
}