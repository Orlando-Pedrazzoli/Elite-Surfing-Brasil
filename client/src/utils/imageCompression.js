// client/src/utils/imageCompression.js
// ═══════════════════════════════════════════════════════════════════════
// 🔧 Compressão de imagens no browser — sem dependências (canvas nativo)
// ═══════════════════════════════════════════════════════════════════════
// Por quê: o backend roda em serverless no Vercel, que rejeita requests
// acima de ~4.5MB ANTES do Express rodar (erro 413). Fotos de celular
// têm 3-8MB cada — 2 fotos já estouravam o limite e o cadastro falhava.
//
// O que faz: redimensiona para no máx. 1600px no maior lado e comprime
// em JPEG (qualidade 0.82). Uma foto de 6MB vira ~300-500KB. 8 imagens
// passam folgadas no limite, o upload fica mais rápido e economiza
// quota do Cloudinary.
//
// Regras de segurança:
//   - GIF passa direto (canvas mataria a animação)
//   - Arquivos já leves (≤ 400KB) passam direto
//   - Se a compressão falhar ou o resultado ficar MAIOR, envia o original
//   - PNG com transparência ganha fundo branco (padrão foto de produto)
// ═══════════════════════════════════════════════════════════════════════

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const SKIP_BELOW_BYTES = 400 * 1024; // 400KB

export const compressImage = async (file, options = {}) => {
  const maxDimension = options.maxDimension || MAX_DIMENSION;
  const quality = options.quality || JPEG_QUALITY;

  try {
    if (!file.type.startsWith('image/')) return file;
    if (file.type === 'image/gif') return file;
    if (file.size <= SKIP_BELOW_BYTES) return file;

    const bitmap = await createImageBitmap(file);

    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Fundo branco — JPEG não tem transparência; sem isso, PNGs
    // transparentes ficariam com fundo preto
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );

    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    // Fallback seguro: qualquer erro → envia o original (comportamento antigo)
    console.warn('Compressão falhou, enviando original:', error);
    return file;
  }
};

export const compressImages = (files, options) =>
  Promise.all(files.map(file => compressImage(file, options)));
