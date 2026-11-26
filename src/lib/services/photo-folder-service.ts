import { prisma } from '../prisma';

export interface PhotoFolderItem {
  id: string;
  clientId: string;
  title: string;
  month: number; // 1 a 12
  year: number;
  driveUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

let isPhotoFoldersTableInitialized = false;

async function ensurePhotoFoldersTable() {
  if (isPhotoFoldersTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS client_photo_folders (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        drive_url TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    isPhotoFoldersTableInitialized = true;
  } catch (err) {
    console.error('Erro ao inicializar tabela client_photo_folders:', err);
  }
}

function mapFolderRow(r: any): PhotoFolderItem {
  return {
    id: r.id,
    clientId: r.client_id,
    title: r.title,
    month: Number(r.month),
    year: Number(r.year),
    driveUrl: r.drive_url,
    notes: r.notes || '',
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}

export async function getClientPhotoFolders(clientId: string): Promise<PhotoFolderItem[]> {
  await ensurePhotoFoldersTable();
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM client_photo_folders WHERE client_id = $1 ORDER BY year DESC, month DESC, created_at DESC`,
      clientId
    );
    return rows.map(mapFolderRow);
  } catch (err) {
    console.error('Erro ao buscar pastas de fotos:', err);
    return [];
  }
}

export async function createClientPhotoFolder(data: {
  clientId: string;
  title: string;
  month: number;
  year: number;
  driveUrl: string;
  notes?: string;
}): Promise<PhotoFolderItem | null> {
  await ensurePhotoFoldersTable();
  const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      INSERT INTO client_photo_folders (
        id, client_id, title, month, year, drive_url, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      RETURNING *;
      `,
      id,
      data.clientId,
      data.title.trim(),
      Number(data.month),
      Number(data.year),
      data.driveUrl.trim(),
      data.notes?.trim() || ''
    );
    return rows[0] ? mapFolderRow(rows[0]) : null;
  } catch (err) {
    console.error('Erro ao criar pasta de fotos:', err);
    return null;
  }
}

export async function updateClientPhotoFolder(
  id: string,
  clientId: string,
  data: {
    title: string;
    month: number;
    year: number;
    driveUrl: string;
    notes?: string;
  }
): Promise<PhotoFolderItem | null> {
  await ensurePhotoFoldersTable();
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      UPDATE client_photo_folders
      SET
        title = $1,
        month = $2,
        year = $3,
        drive_url = $4,
        notes = $5,
        updated_at = NOW()
      WHERE id = $6 AND client_id = $7
      RETURNING *;
      `,
      data.title.trim(),
      Number(data.month),
      Number(data.year),
      data.driveUrl.trim(),
      data.notes?.trim() || '',
      id,
      clientId
    );
    return rows[0] ? mapFolderRow(rows[0]) : null;
  } catch (err) {
    console.error('Erro ao atualizar pasta de fotos:', err);
    return null;
  }
}

export async function deleteClientPhotoFolder(id: string, clientId: string): Promise<boolean> {
  await ensurePhotoFoldersTable();
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM client_photo_folders WHERE id = $1 AND client_id = $2`,
      id,
      clientId
    );
    return true;
  } catch (err) {
    console.error('Erro ao excluir pasta de fotos:', err);
    return false;
  }
}
