/**
 * Tests del router de crónicas (Ola 10) + las funciones puras de uploads.
 *
 * Smoke sobre createApp() sin DB ni sesión: todas las rutas exigen auth, así
 * que lo que se fija acá es que ninguna sea accesible sin login — incluido el
 * upload, donde el orden de la cadena importa de verdad (requireAuth tiene que
 * correr antes que multer, o un anónimo nos hace parsear 8 MB en memoria).
 *
 * Lo que NO cubre (necesita sesión real + DB poblada, Fase 2 del proyecto): el
 * happy path del CRUD, el tope de fotos, y que una crónica privada ajena
 * devuelva 404.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { sniffImageMime, safeUploadPath, extensionDe } from '../lib/uploads.js';

describe('Cronicas router — auth (sin sesión)', () => {
  const app = createApp();

  it('GET /api/cronicas sin auth devuelve 401', async () => {
    const res = await request(app).get('/api/cronicas');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('GET /api/cronicas/:id sin auth devuelve 401', async () => {
    const res = await request(app).get('/api/cronicas/some-uuid');
    expect(res.status).toBe(401);
  });

  it('GET /api/cronicas/batalla/:battleId sin auth devuelve 401', async () => {
    const res = await request(app).get('/api/cronicas/batalla/some-uuid');
    expect(res.status).toBe(401);
  });

  it('POST /api/cronicas sin auth devuelve 401', async () => {
    const res = await request(app).post('/api/cronicas').send({ battleId: 'x' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/cronicas/:id sin auth devuelve 401', async () => {
    const res = await request(app).patch('/api/cronicas/some-uuid').send({ titulo: 'x' });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/cronicas/:id sin auth devuelve 401', async () => {
    const res = await request(app).delete('/api/cronicas/some-uuid');
    expect(res.status).toBe(401);
  });

  it('DELETE de una foto sin auth devuelve 401', async () => {
    const res = await request(app).delete('/api/cronicas/some-uuid/fotos/foto-1');
    expect(res.status).toBe(401);
  });

  it('el upload rechaza con 401 antes de parsear el archivo', async () => {
    // Si esto devolviera 400 ("Missing file") querría decir que multer corrió
    // antes que requireAuth: un anónimo podría hacernos consumir memoria.
    const res = await request(app)
      .post('/api/cronicas/some-uuid/fotos')
      .attach('foto', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'test.jpg');
    expect(res.status).toBe(401);
  });

  it('el 401 llega antes que la validación de Zod', async () => {
    const res = await request(app).post('/api/cronicas').send({});
    expect(res.status).toBe(401);
  });
});

describe('uploads — sniff de tipo por magic bytes', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(12)]);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(8),
  ]);
  const webp = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.alloc(4),
    Buffer.from('WEBP', 'ascii'),
    Buffer.alloc(4),
  ]);

  it('reconoce JPEG, PNG y WebP', () => {
    expect(sniffImageMime(jpeg)).toBe('image/jpeg');
    expect(sniffImageMime(png)).toBe('image/png');
    expect(sniffImageMime(webp)).toBe('image/webp');
  });

  it('rechaza SVG, PDF y GIF', () => {
    expect(sniffImageMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffImageMime(Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3'))).toBeNull();
    expect(sniffImageMime(Buffer.from('GIF89a' + '\x00'.repeat(10)))).toBeNull();
  });

  it('rechaza un buffer demasiado corto', () => {
    expect(sniffImageMime(Buffer.from([0xff, 0xd8]))).toBeNull();
  });

  it('gana el contenido, no la extensión: un JPEG llamado .png se guarda como jpg', () => {
    const mime = sniffImageMime(jpeg);
    expect(mime).toBe('image/jpeg');
    expect(extensionDe(mime!)).toBe('jpg');
  });
});

describe('uploads — safeUploadPath', () => {
  const uuid = '3f1c0f8a-5b2e-4a7d-9c11-2b8e6d4f0a91';

  it('acepta <uuid>.<ext> de los tipos permitidos', () => {
    for (const ext of ['jpg', 'png', 'webp']) {
      expect(safeUploadPath(`${uuid}.${ext}`)).toContain(`${uuid}.${ext}`);
    }
  });

  it('rechaza path traversal y separadores', () => {
    expect(safeUploadPath('../../etc/passwd')).toBeNull();
    expect(safeUploadPath(`../${uuid}.jpg`)).toBeNull();
    expect(safeUploadPath(`sub/${uuid}.jpg`)).toBeNull();
    expect(safeUploadPath(`sub\\${uuid}.jpg`)).toBeNull();
  });

  it('rechaza nombres que no son UUID o extensión no permitida', () => {
    expect(safeUploadPath('foto.jpg')).toBeNull();
    expect(safeUploadPath(`${uuid}.svg`)).toBeNull();
    expect(safeUploadPath(`${uuid}`)).toBeNull();
    expect(safeUploadPath('')).toBeNull();
  });
});
